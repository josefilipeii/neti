import { db, storage } from "../firebase";
import { Bucket, File } from "@google-cloud/storage";
import { logger } from "firebase-functions";
import csv from "csv-parser";
import {Timestamp} from "firebase-admin/firestore";

// 🔹 Constants
const CHUNK_SIZE = 150; // Max items per chunk

/**
 * 🔥 Step 1: Cloud Function to Process CSV → Convert to JSON Chunks → Store in Firestore
 */
export const processAddonsCsv = async (object: { data: { bucket: string; name: string } }): Promise<void> => {
  const bucketName: string = object.data.bucket;
  const filePath: string = object.data.name;

  if (!filePath || !filePath.startsWith("addons/") || !filePath.endsWith(".csv")) {
    logger.log(`❌ Skipping file: ${filePath}`);
    return;
  }

  const bucket: Bucket = storage.bucket(bucketName);
  const file: File = bucket.file(filePath);
  const pathParts: string[] = filePath.split("/");
  const eventId: string = pathParts[1];
  const type: string = pathParts[2];

  if (!eventId || !type) {
    logger.error("❌ Missing eventId or type in file path");
    return;
  }

  if (type !== "tshirts") {
    logger.error(`❌ Invalid type: ${type}`);
    return;
  }

  try {
    const rows: Record<string, string>[] = [];

    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .pipe(csv())
        .on("data", (row: Record<string, string>) => {
          try {
            const {
              provider,
              internalId,
              externalId,
              name,
              email,
              sizeS, sizeM, sizeL, sizeXL, sizeXXL
            } = row;

            if (!(sizeS || sizeM || sizeL || sizeXL || sizeXXL)) {
              logger.warn("⚠️ Skipping row due to missing size information:", row);
              return;
            }

            if (!internalId && !externalId) {
              logger.warn("⚠️ Skipping row due to missing ID:", row);
              return;
            }

            if (!name || !email) {
              logger.warn("⚠️ Skipping row due to missing name or email:", row);
              return;
            }

            if (externalId && !provider) {
              logger.warn("⚠️ Registrations with external_id must define a provider");
              return;
            }

            rows.push(row);
          } catch (error) {
            logger.error("❌ Error processing row:", error);
          }
        })
        .on("end", async () => {
          await chunkAddonsData(rows, eventId);
          logger.log("🚀 CSV processing complete.");
          resolve();
        })
        .on("error", (error) => {
          logger.error("❌ Error processing file:", error);
          reject(error);
        });
    });
  } catch (error) {
    logger.error("❌ Error processing file:", error);
  }
};

/**
 * 🔥 Step 2: Store JSON Chunks in Firestore
 */
async function chunkAddonsData(rows: Record<string, string>[], eventId: string) {
  let chunkIndex = 0;
  let currentChunk: Record<string, string>[] = [];


  for (const row of rows) {
    currentChunk.push(row);

    if (currentChunk.length === CHUNK_SIZE) {
      await saveChunk(currentChunk, eventId, chunkIndex);
      currentChunk = [];
      chunkIndex++;
    }
  }

  if (currentChunk.length > 0) {
    await saveChunk(currentChunk, eventId, chunkIndex);
  }

  logger.log(`✅ Stored ${rows.length} addon registrations in ${chunkIndex + 1} chunks.`);
}

async function saveChunk(rows: Record<string, string>[], eventId: string, index: number) {
  const chunkId = `${eventId}-chunk-${index}-${Timestamp.now().toMillis()}`;
  await db.collection("addon_import_tasks").doc(chunkId).set({
    chunkIndex: index,
    eventId,
    totalRecords: rows.length,
    processed: false,
    retryCount: 0,
    status: "pending",
    data: rows,
  });
}



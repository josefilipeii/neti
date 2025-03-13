import {db, storage} from "../firebase";
import {logger} from "firebase-functions";
import csv from "csv-parser";
import {Bucket, File} from "@google-cloud/storage";
import {Timestamp} from "firebase-admin/firestore";
import {generateQrId} from "../lib/qr";
import {Row} from "../domain";

interface HeatData {
    eventId: string;
    heatId: string;
    heatName: string;
    heatDay: string;
    heatTime: string;
}

const CHUNK_SIZE = 100; // Max 150 registrations per chunk

/**
 * Extracts unique heats and writes them in batches.
 */
async function processHeats(rows: HeatData[]) {
  const uniqueHeats = new Map();

  for (const row of rows) {
    const {eventId, heatId, heatName, heatDay, heatTime} = row;
    const key = `${eventId}_${heatId}`;
    if (!uniqueHeats.has(key)) {
      uniqueHeats.set(key, {eventId, heatId, heatName, heatDay, heatTime});
    }
  }

  const heatEntries = Array.from(uniqueHeats.values());
  const batchSize = 100;

  for (let i = 0; i < heatEntries.length; i += batchSize) {
    const batch = db.batch();
    const chunk = heatEntries.slice(i, i + batchSize);

    for (const heat of chunk) {
      const heatRef = db.collection(`competitions/${heat.eventId}/heats`).doc(heat.heatId);
      batch.set(heatRef, {
        name: heat.heatName,
        day: heat.heatDay,
        time: heat.heatTime,
      }, {merge: true});
    }

    await batch.commit();
    logger.log(`✅ Committed ${chunk.length} heats.`);
  }

  logger.log("🔥 Heats written to Firestore.");
}

/**
 * Handles CSV upload, splits into chunks, and stores in Firestore for processing.
 */
export const processParticipants = async (object: { data: { bucket: string; name: string } }) => {
  const {bucket: bucketName, name: filePath} = object.data;

  if (!filePath || !filePath.startsWith("participants/") || !filePath.endsWith(".csv")) {
    logger.log(`❌ Skipping file: ${filePath}`);
    return;
  }

  const bucket: Bucket = storage.bucket(bucketName);
  const file: File = bucket.file(filePath);
  const eventId = filePath.split("/")[1];

  try {
    const rows: Row[] = [];

    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .pipe(csv())
        .on("data", (row) => {
          try {
            const {
              externalId,
              provider,
              internalId,
              heatName,
              heatDay,
              heatTime,
              dorsal,
              category
            } = row;
            const idProvided = internalId || externalId;
            if (!idProvided || !heatName || !heatDay || !heatTime || !dorsal || !category) {
              logger.warn("⚠️ Skipping invalid row:", JSON.stringify(row));
              return;
            }

            const registrationProvider = provider || "GF";
            const providerId = externalId || internalId;
            const registrationId = externalId ? `${provider}-${externalId}` : generateQrId("GF-RG", internalId);
            const heatId = `${heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;

            const participants = [];
            for (let i = 1; i <= 4; i++) {
              const name = row[`name${i}`] || row["name"];
              const email = row[`email${i}`] || row["email"];
              const contact = row[`contact${i}`] || row["contact"];
              if (name && email && contact) {
                participants.push({name, email, contact});
              }
            }

            if (participants.length === 0) {
              logger.warn("⚠️ Skipping row due to missing participant data:", row);
              return;
            }

            rows.push({
              provider: registrationProvider,
              eventId,
              heatId,
              heatName,
              heatDay,
              heatTime,
              dorsal,
              registrationId,
              category,
              participants,
              providerId,
              createdAt: Timestamp.now(),
            });

          } catch (error) {
            logger.error("❌ Error processing row:", error);
          }
        })
        .on("end", async () => {
          if (rows.length > 0) {
            await processHeats(rows);
            await chunkRegistrations(rows, eventId);
          }
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

async function chunkRegistrations(rows: Row[], eventId: string) {
  const heatGroups = new Map<string, Row[]>();

  // Group registrations by heatId
  for (const row of rows) {
    if (!heatGroups.has(row.heatId)) {
      heatGroups.set(row.heatId, []);
    }
    heatGroups.get(row.heatId)!.push(row);
  }

  let chunkIndex = 0;
  let currentChunk: Row[] = [];

  let chunkHeats: string[] = [];
  for (const [heatId, registrations] of heatGroups.entries()) {
    // If adding the entire heat would exceed CHUNK_SIZE, save current chunk first
    if (currentChunk.length + registrations.length > CHUNK_SIZE) {
      await saveChunk(currentChunk, eventId, chunkIndex, chunkHeats);
      logger.log(`📦 Stored chunk ${chunkIndex} with ${currentChunk.length} registrations.`);
      currentChunk = [];
      chunkHeats = [];
      chunkIndex++;
    }
    chunkHeats.push(heatId);
    // Add the full heat to the current chunk
    currentChunk.push(...registrations);
  }

  // Store any remaining registrations in the last chunk
  if (currentChunk.length > 0) {
    await saveChunk(currentChunk, eventId, chunkIndex, chunkHeats);
    logger.log(`📦 Stored final chunk ${chunkIndex} with ${currentChunk.length} registrations.`);
  }

  logger.log(`✅ Stored ${rows.length} registrations in ${chunkIndex + 1} chunks.`);
}




async function saveChunk(rows: Row[], eventId: string, index: number, chunkHeats: string[]) {
  await db.collection("import_tasks").doc(`${eventId}-chunk-${index}-${Timestamp.now().toMillis()}`).set({
    chunkIndex: index,
    eventId,
    totalRecords: rows.length,
    processed: false,
    retryCount: 0,
    status: "pending",
    data: rows,
    chunkHeats
  });
}

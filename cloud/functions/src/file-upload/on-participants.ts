import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import csv from "csv-parser";
import { Bucket, File } from "@google-cloud/storage";
import { logger } from "firebase-functions";
import { tempCollectionPath } from "../domain/collections";
import { Timestamp } from "firebase-admin/firestore";
import { generateQrId } from "../lib/qr";

const csvParser: NodeJS.ReadWriteStream = csv();

/** Uploads raw participant data to a temporary Firestore collection */
export const processParticipants: StorageHandler = async (object: { data: { bucket: string; name: string } }): Promise<void> => {
  const { bucket: bucketName, name: filePath } = object.data;

  if (!filePath || !filePath.startsWith("participants/") || !filePath.endsWith(".csv")) {
    logger.log(`❌ Skipping file: ${filePath}`);
    return;
  }

  const bucket: Bucket = storage.bucket(bucketName);
  const file: File = bucket.file(filePath);
  const eventId: string = filePath.split("/")[1];

  try {
    let batch = db.batch();
    let batchCounter = 0;

    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .pipe(csvParser)
        .on("data", async (row: Record<string, string>) => {
          try {
            const { external_id, provider, internal_id, heatName, heatDay, heatTime, dorsal, category } = row;
            const idProvided = internal_id || external_id;
            if (!idProvided || !heatName || !heatDay || !heatTime || !dorsal || !category) {
              logger.warn("⚠️ Skipping invalid row:", row);
              return;
            }

            if (external_id && !provider) {
              logger.warn("⚠️ Registrations with external_id must define a provider");
              return;
            }

            const registrationProvider = provider || "GF";
            const registrationId = external_id ? `${provider}-${external_id}` : generateQrId("GF-RG", internal_id);
            const heatId = `${heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;

            const participants = [];
            for (let i = 1; i <= 4; i++) {
              const name = row[`name${i}`] || row["name"];
              const email = row[`email${i}`] || row["email"];
              const contact = row[`contact${i}`] || row["contact"];
              if (name && email && contact) {
                participants.push({ name, email, contact });
              }
            }

            if (participants.length === 0) {
              logger.warn("⚠️ Skipping row due to missing participant data:", row);
              return;
            }

            const registrationRef = db.collection(tempCollectionPath).doc(registrationId);
            batch.set(registrationRef, {
              provider: registrationProvider,
              eventId,
              heatId,
              heatName,
              heatDay,
              heatTime,
              dorsal,
              category,
              participants,
              status: "pending",
              createdAt: Timestamp.now(),
            });

            batchCounter++;

            // Commit batch every 500 writes to avoid memory overflow
            if (batchCounter >= 500) {
              await batch.commit();
              batch = db.batch(); // Start a new batch
              batchCounter = 0;
            }
          } catch (error) {
            logger.error("❌ Error processing row:", error);
          }
        })
        .on("end", async () => {
          try {
            // Commit remaining writes
            if (batchCounter > 0) {
              await batch.commit();
            }
            logger.log("🚀 CSV processing complete.");
            resolve();
          } catch (error) {
            logger.error("❌ Error committing Firestore writes:", error);
            reject(error);
          }
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

import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import csv from "csv-parser";
import { Bucket, File } from "@google-cloud/storage";
import { logger } from "firebase-functions";
import { tempCollectionPath } from "../domain/collections";
import { Timestamp } from "firebase-admin/firestore";
import { generateQrId } from "../lib/qr";

const csvParser: NodeJS.ReadWriteStream = csv();

interface Registration {
  id: string;
  provider: string;
  eventId: string;
  heatId: string;
  heatName: string;
  heatDay: string;
  heatTime: string;
  dorsal: string;
  category: string;
  participants: Array<{ name: string; email: string; contact: string }>;
  status: string;
  createdAt: FirebaseFirestore.Timestamp;
}


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
    const rows: Registration[] = [];

    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .pipe(csvParser)
        .on("data", (row: Record<string, string>) => {
          try {
            const { external_id, provider, internalId, heatName, heatDay, heatTime, dorsal, category } = row;
            const idProvided = internalId || external_id;
            if (!idProvided || !heatName || !heatDay || !heatTime || !dorsal || !category) {
              logger.warn("⚠️ Skipping invalid row:", row);
              return;
            }

            if (external_id && !provider) {
              logger.warn("⚠️ Registrations with external_id must define a provider");
              return;
            }

            const registrationProvider = provider || "GF";
            const registrationId = external_id ? `${provider}-${external_id}` : generateQrId("GF-RG", internalId);
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

            rows.push({
              id: registrationId,
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

          } catch (error) {
            logger.error("❌ Error processing row:", error);
          }
        })
        .on("end", async () => {
          try {
            if (rows.length > 0) {
              await processInBatches(rows);
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

/**
 * Writes data to Firestore in batches of 150.
 * @param {Array} rows - Array of registration objects.
 */
async function processInBatches(rows: Registration[]) {
  const batchSize = 150;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = db.batch();
    const chunk = rows.slice(i, i + batchSize);

    chunk.forEach((data) => {
      const registrationRef = db.collection(tempCollectionPath).doc(data.id);
      batch.set(registrationRef, data);
    });

    await batch.commit();
    logger.log(`✅ Committed ${chunk.length} records`);
  }
}

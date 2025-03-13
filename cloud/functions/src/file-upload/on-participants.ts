import {db, PUBSUB_QR_FILES_TOPIC, storage} from "../firebase";
import {logger} from "firebase-functions";
import {PubSub} from "@google-cloud/pubsub";
import csv from "csv-parser";
import {Bucket, File} from "@google-cloud/storage";
import {Timestamp} from "firebase-admin/firestore";
import {qrCollectionPath, registrationCollectionPath} from "../domain/collections";
import {generateQrId} from "../lib/qr";
import {firestore} from "firebase-admin";
import WriteResult = firestore.WriteResult;

interface Row {
  id: string;
  eventId: string;
  heatId: string;
  heatName: string;
  heatDay: string;
  heatTime: string;
  externalId?: string;
  provider: string;
  internalId?: string;
  dorsal: string;
  category: string;
  participants: {name: string; email: string; contact: string}[];
  createdAt: Timestamp;
}

interface HeatData{
  eventId: string;
  heatId: string;
  heatName: string;
  heatDay: string;
  heatTime: string;
}

const pubsub = new PubSub();

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
  const batchSize = 150;

  for (let i = 0; i < heatEntries.length; i += batchSize) {
    const batch = db.batch();
    const chunk = heatEntries.slice(i, i + batchSize);

    for (const heat of chunk) {
      const heatRef = db.collection(`competitions/${heat.eventId}/heats`).doc(heat.heatId);
      batch.set(heatRef, {
        name: heat.heatName,
        day: heat.heatDay,
        time: heat.heatTime,
      });
    }

    await batch.commit();
    logger.log(`✅ Committed ${chunk.length} heats.`);
  }

  logger.log("🔥 Heats written to Firestore.");
}

/**
 * Handles CSV upload, Firestore registration processing, and QR code generation in batches.
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
            const {external_id: externalId, provider, internalId, heatName, heatDay, heatTime, dorsal, category} = row;
            const idProvided = internalId || externalId;
            if (!idProvided || !heatName || !heatDay || !heatTime || !dorsal || !category) {
              logger.warn("⚠️ Skipping invalid row:", row);
              return;
            }

            const registrationProvider = provider || "GF";
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
              createdAt: Timestamp.now(),
            });

          } catch (error) {
            logger.error("❌ Error processing row:", error);
          }
        })
        .on("end", async () => {
          if (rows.length > 0) {
            await processHeats(rows); // ✅ Step 1: Write heats in batches
            await processRegistrations(rows); // ✅ Step 2 & 3: Write registrations & QR codes
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

/**
 * Processes registrations in Firestore batch writes.
 */
async function processRegistrations(rows: Row[]) {
  const batchSize = 150;
  const batchPromises = [];
  const pubsubMessages = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = db.batch();
    const chunk = rows.slice(i, i + batchSize);

    for (const data of chunk) {
      const { eventId, heatId, heatName, heatDay, heatTime, dorsal, category, participants } = data;
      const indexedCode = `${eventId}:${heatId}:${dorsal}`.replace(/[_-]/g, "").toUpperCase();

      const registrationRef = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
      const qrRef = db.collection(qrCollectionPath).doc(data.id);

      batch.set(registrationRef, {
        qrId: data.id,
        category: { name: category },
        processedAt: new Date(),
        participants,
      });

      batch.set(qrRef, {
        code: indexedCode,
        createdAt: new Date(),
        type: "registration",
        competition: { id: eventId },
        redeemableBy: participants.map((p) => p.email),
        status: "init",
        sent: false,
        registration: {
          heat: { id: heatId, name: heatName },
          time: heatTime,
          day: heatDay,
          dorsal,
          category: { name: category },
          participants,
        },
        provider: data.provider,
        self: data.id,
      });

      pubsubMessages.push({ docId: data.id });
    }

    batchPromises.push(retryWithBackoff(() => batch.commit())); // ✅ Run all batch commits in parallel
  }

  try {
    await Promise.all(batchPromises); // ✅ Wait for all batches to complete
    logger.log(`✅ Committed ${rows.length} registrations.`);
  } catch (error) {
    logger.error("❌ Firestore batch commit failed:", error);
  }

  // ✅ Publish all QR codes to Pub/Sub in parallel
  const pubsubPromises = pubsubMessages.map((message) => {
    const messageBuffer = Buffer.from(JSON.stringify(message));
    return pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({ data: messageBuffer });
  });

  await Promise.all(pubsubPromises);
  logger.log(`✅ Published ${pubsubMessages.length} QR messages to Pub/Sub.`);
}


async function retryWithBackoff(func: () => Promise<WriteResult[]>, retries = 5, delay = 100) {
  try {
    return await func();
  } catch (error) {
    if (retries === 0) throw error;
    logger.warn(`⏳ Retrying after ${delay}ms due to Firestore error...`);
    await new Promise(res => setTimeout(res, delay));
    return retryWithBackoff(func, retries - 1, delay * 2);
  }
}

import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import csv from "csv-parser";
import { Bucket, File } from "@google-cloud/storage";
import { DocumentReference } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import {tempCollectionPath} from "../domain/collections";

const csvParser: NodeJS.ReadWriteStream = csv();

/** Uploads raw participant data to a temporary Firestore collection */
export const processParticipants: StorageHandler = async (object) => {
  const bucketName: string = object.data.bucket;
  const filePath: string = object.data.name;

  if (!filePath || !filePath.startsWith("participants/") || !filePath.endsWith(".csv")) {
    logger.log(`❌ Skipping file: ${filePath}`);
    return;
  }

  const bucket: Bucket = storage.bucket(bucketName);
  const file: File = bucket.file(filePath);
  const pathParts: string[] = filePath.split("/");
  const eventId: string = pathParts[1];

  try {
    file.createReadStream()
      .pipe(csvParser)
      .on("data", async (row: Record<string, string>) => {
        try {
          const { heatName, heatDay, heatTime, dorsal, category, name, email, contact } = row;
          if (!heatName || !heatDay || !heatTime || !dorsal || !category || !email || !name || !contact) {
            logger.warn("⚠️ Skipping invalid row:", row);
            return;
          }

          const heatId: string = `${heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const tempRef: DocumentReference = db.collection(tempCollectionPath).doc();

          await tempRef.set({
            eventId,
            heatId,
            heatName,
            heatDay,
            heatTime,
            dorsal,
            category,
            participants: [{ name, email, contact }],
            status: "pending",
            createdAt: new Date(),
          });

          logger.log(`✅ Participant ${dorsal} added to temporary Firestore collection.`);
        } catch (error) {
          logger.error("❌ Error processing row:", error);
        }
      })
      .on("end", () => {
        logger.log("🚀 CSV processed. Firestore trigger will handle registration and QR generation.");
      });
  } catch (error) {
    logger.error("❌ Error processing file:", error);
  }
};


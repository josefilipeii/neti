import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import csv from "csv-parser";
import { Bucket, File } from "@google-cloud/storage";
import { DocumentReference } from "firebase-admin/firestore";
import {logger} from "firebase-functions";

const csvParser: NodeJS.ReadWriteStream = csv();


function heatCollectionPath(eventId: string): string {
  return `competitions/${eventId}/heats`;
}

function registrationCollectionPath(eventId: string, heatId: string): string {
  return `${heatCollectionPath(eventId)}/${heatId}/registrations`;
}


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
    const competitionRef: DocumentReference = db.collection("competitions").doc(eventId);
    const competitionSnap = await competitionRef.get();
    if (!competitionSnap.exists) {
      logger.error(`❌ Competition with ID ${eventId} does not exist.`);
      return;
    }
    const competitionData = competitionSnap.data();

    file.createReadStream()
      .pipe(csvParser)
      .on("data", async (row: Record<string, string>) => {
        try {
          const { heatName, heatDay, heatTime, dorsal, category, name, email, contact } = row;
          if (!heatName || !heatDay || !heatTime || !dorsal || !category || !email || !name || !contact) {
            logger.warn("⚠️ Skipping invalid row:", row);
            return;
          }
          logger.info(`📝 Processing row: ${JSON.stringify(row)}`);

          const heatId: string = `${heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const registrationRef: DocumentReference = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);

          await registrationRef.set({
            eventId,
            heatId,
            heatName,
            heatDay,
            heatTime,
            dorsal,
            category,
            categoryName: category,
            competitionName: competitionData?.name,
            participants: [{ name, email, contact }],
            status: "pending", // Mark as pending for the second trigger
            createdAt: new Date(),
          });

          logger.log(`✅ Participant ${dorsal} added to Firestore.`);
        } catch (error) {
          logger.error("❌ Error processing row:", error);
        }
      })
      .on("end", () => {
        logger.log("🚀 CSV processed. Firestore trigger will handle QR code generation.");
      });
  } catch (error) {
    logger.error("❌ Error processing file:", error);
  }
};


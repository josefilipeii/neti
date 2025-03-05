import { Category } from "../../../../packages/shared";
import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import QRCode from "qrcode";
import crypto from "crypto";
import bs58 from "bs58";
import csv from "csv-parser";
import { QR_BUCKET_NAME } from "./../constants";
import { Bucket, File } from "@google-cloud/storage";
import { DocumentReference, Transaction } from "firebase-admin/firestore";

const csvParser: NodeJS.ReadWriteStream = csv();

/** Generates a secure QR ID */
function generateQrId(competitionId: string, heatId: string, dorsal: string, secretKey?: string): string {
  if (!secretKey) {
    throw new Error("Secret key not set in Firebase Functions Config.");
  }
  const rawString = `${competitionId}-${heatId}-${dorsal}`;
  const hash = crypto.createHmac("sha256", secretKey).update(rawString).digest();
  return bs58.encode(hash.subarray(0, 20));
}

function heatCollectionPath(eventId: string): string {
  return `competitions/${eventId}/heats`;
}

function registrationCollectionPath(eventId: string, heatId: string): string {
  return `${heatCollectionPath(eventId)}/${heatId}/registrations`;
}

function qrCollectionPath(): string {
  return "qrCodes";
}

async function ensureCategory(eventId: string, categoryName: string, transaction: Transaction): Promise<Category | null> {
  const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
  const categoryQuery = await transaction.get(categoriesCollection.where("name", "==", categoryName));
  if (categoryQuery.empty) return null;
  return categoryQuery.docs[0].data() as Category;
}

export const processParticipants: StorageHandler = async (object) => {
  const bucketName: string = object.data.bucket;
  const filePath: string = object.data.name;

  if (!filePath || !filePath.startsWith("participants/")) {
    console.log(`❌ Skipping file: ${filePath}`);
    return;
  }

  const bucket: Bucket = storage.bucket(bucketName);
  const file: File = bucket.file(filePath);
  const pathParts: string[] = filePath.split("/");
  const eventId: string = pathParts[1];
  const selfCheckinSecret: string | undefined = process.env.QR_CODE_SECRET_KEY;

  try {
    const competitionRef: DocumentReference = db.collection("competitions").doc(eventId);
    const competitionSnap = await competitionRef.get();
    if (!competitionSnap.exists) {
      console.error(`❌ Competition with ID ${eventId} does not exist.`);
      return;
    }
    const competitionData = competitionSnap.data();

    const qrBucket: Bucket = storage.bucket(QR_BUCKET_NAME);

    file.createReadStream()
      .pipe(csvParser)
      .on("data", async (row: Record<string, string>) => {
        try {
          const { heatName, heatDay, heatTime, dorsal, category, name, email, contact } = row;
          if (!heatName || !heatDay || !heatTime || !dorsal || !category || !email || !name || !contact) {
            console.warn("⚠️ Skipping invalid row:", row);
            return;
          }

          const heatId: string = `${heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const qrId: string = generateQrId(eventId, heatId, dorsal, selfCheckinSecret);
          const registrationRef: DocumentReference = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
          const qrRef: DocumentReference = db.collection(qrCollectionPath()).doc(qrId);
          const heatRef: DocumentReference = db.collection(heatCollectionPath(eventId)).doc(heatId);

          await db.runTransaction(async (transaction: Transaction) => {
            const existingRegistration = await transaction.get(registrationRef);

            if (existingRegistration.exists && existingRegistration.data()?.processedAt) {
              console.log(`⚠️ Registration for dorsal ${dorsal} already processed, skipping.`);
              return;
            }

            const categoryDoc = await ensureCategory(eventId, category, transaction);
            if (!categoryDoc) return;

            // Read heat first, then write if it does not exist
            const heatSnapshot = await transaction.get(heatRef);
            if (!heatSnapshot.exists) {
              transaction.set(heatRef, { name: heatName, day: heatDay, time: heatTime });
            }

            const qrCodeBuffer: Buffer = await QRCode.toBuffer(qrId);
            const qrFilePath: string = `qr_codes/${eventId}/registrations/${heatId}/${dorsal}.png`;
            const qrFile: File = qrBucket.file(qrFilePath);
            await qrFile.save(qrCodeBuffer, { contentType: "image/png" });

            transaction.set(registrationRef, {
              category: categoryDoc.id,
              categoryName: category,
              competitionName: competitionData?.name,
              day: heatDay,
              time: heatTime,
              participants: [{ name, email, contact }],
              qrId,
              processedAt: new Date(),
            }, { merge: true });

            transaction.set(qrRef, {
              createdAt: new Date(),
              type: "registration",
              competition: {
                id: eventId,
                name: competitionData?.name,
              },
              redeemableBy: [email],
              registration: {
                heat: {
                  id: heatId,
                  name: heatName,
                  day: heatDay,
                  time: heatTime,
                },
                dorsal,
                category: {
                  id: categoryDoc.id,
                  name: category,
                },
                participants: [{ name, email }],
              },
              self: qrId,
            });
          });
        } catch (error) {
          console.error("❌ Error processing row:", error);
        }
      })
      .on("end", () => {
        console.log("🚀 All registrations processed with QR codes!");
      });
  } catch (error) {
    console.error("❌ Error processing file:", error);
  }
};

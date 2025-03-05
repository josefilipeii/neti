import {Category, Heat} from "../../../../packages/shared";
import {StorageHandler} from "../domain";
import {db, storage} from "../firebase";
import QRCode from "qrcode";
import crypto from "crypto";
import bs58 from "bs58";
import csv from "csv-parser";
import {QR_BUCKET_NAME} from "./../constants";
import {firestore} from "firebase-admin";
import WriteBatch = firestore.WriteBatch;
import {Bucket, File} from "@google-cloud/storage";
import WriteResult = firestore.WriteResult;

const csvParser: NodeJS.ReadWriteStream = csv();
const FIRESTORE_BATCH_LIMIT = 500; // Firestore allows max 500 operations per batch

/** Generates a secure QR ID */
function generateQrId(competitionId: string, heatId: string, dorsal: string, secretKey?: string): string {
  if (!secretKey) {
    throw new Error("Secret key not set in Firebase Functions Config.");
  }
  const rawString = `${competitionId}-${heatId}-${dorsal}`;
  const hash = crypto.createHmac("sha256", secretKey).update(rawString).digest();
  return bs58.encode(hash.subarray(0, 20));
}

function heatCollectionPath(eventId: string) {
  return `competitions/${eventId}/heats`;
}

function registrationCollectionPath(eventId: string, heatId: string) {
  return `${heatCollectionPath(eventId)}/${heatId}/registrations`;
}

function qrCollectionPath() {
  return "qrCodes";
}

export const processParticipants: StorageHandler = async (object) => {
  const bucketName = object.data.bucket;
  const filePath = object.data.name;

  const selfCheckinSecret = process.env.QR_CODE_SECRET_KEY;
  if (!selfCheckinSecret) {
    console.error("❌ Missing secret key in environment variables.");
    return;
  }

  if (!filePath || !filePath.startsWith("participants/")) {
    console.log(`❌ Skipping file: ${filePath}`);
    return;
  }


  const bucket: Bucket = storage.bucket(bucketName);
  const file: File = bucket.file(filePath);
  const pathParts: string[] = filePath.split("/");
  const eventId: string = pathParts[1];

  try {
    const competitionRef = db.collection("competitions").doc(eventId);
    const competitionSnap = await competitionRef.get();
    if (!competitionSnap.exists) {
      console.error(`❌ Competition with ID ${eventId} does not exist.`);
      return;
    }
    const competitionData = competitionSnap.data();

    const qrBucket: Bucket = storage.bucket(QR_BUCKET_NAME);
    const batchQueue: Promise<WriteResult[]>[] = [];
    let batch: WriteBatch = db.batch();
    let batchCount = 0;

    const categoryCache = new Map<string, string>();
    const heatCache = new Set<string>();

    file.createReadStream()
      .pipe(csvParser)
      .on("data", async (row) => {
        const {heatName, heatDay, heatTime, dorsal, category, name, email, contact} = row;
        if (!heatName || !heatDay || !heatTime || !dorsal || !category || !email || !name || !contact) {
          console.log("⚠️ Skipping invalid row:", row);
          return;
        }

        const heatId = `${heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const registrationRef = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
        const qrRef = db.collection(qrCollectionPath()).doc(dorsal);
        const existingRegistration = await registrationRef.get();

        // Check if registration is already processed
        if (existingRegistration.exists && existingRegistration.data()?.processedAt) {
          console.log(`⚠️ Registration for dorsal ${dorsal} already processed, skipping.`);
          return;
        }

        let categoryId = categoryCache.get(category);
        if (!categoryId) {
          const categoryDoc = await ensureCategory(eventId, category);
          if (!categoryDoc) return;
          categoryId = categoryDoc.id;
          categoryCache.set(category, categoryId);
        }

        if (!heatCache.has(heatId)) {
          await ensureHeat(eventId, heatId, {name: heatName, day: heatDay, time: heatTime});
          heatCache.add(heatId);
        }

        const qrId = generateQrId(eventId, heatId, dorsal, selfCheckinSecret);
        const qrCodeBuffer: Buffer = await QRCode.toBuffer(qrId);
        const qrFilePath = `qr_codes/${eventId}/registrations/${heatId}/${dorsal}.png`;
        const qrFile: File = qrBucket.file(qrFilePath);
        await qrFile.save(qrCodeBuffer, {contentType: "image/png"});

        const qrData = {
          id: qrId,
          createdAt: new Date().toISOString(),
          type: "registration",
          competition: {
            id: eventId,
            name: competitionData?.name,
          },
          registration: {
            heat: {
              id: heatId,
              name: heatName,
              day: heatDay,
              time: heatTime,
            },
            dorsal,
            category: {
              id: categoryId,
              name: category,
            },
            redeemableBy: [email],
            participants: [{name, email}],
          },
          self: qrId,
        };

        batch.set(registrationRef, {
          category: categoryId,
          categoryName: category,
          competitionName: competitionData?.name,
          day: heatDay,
          time: heatTime,
          participants: [{name, email}],
          qrId,
          processedAt: new Date(), // ✅ Marks row as processed
        }, {merge: true});

        batch.set(qrRef, qrData);

        batchCount++;
        if (batchCount >= FIRESTORE_BATCH_LIMIT) {
          console.log(`🚀 Processing batch with ${batchCount} registrations...`);
          batchQueue.push(batch.commit());
          batch = db.batch();
          batchCount = 0;
        }

      })
      .on("end", async () => {
        if (batchCount > 0) {
          console.log(`🚀 Processing batch with ${batchCount} registrations...`);
          batchQueue.push(batch.commit());
        }
        await Promise.all(batchQueue);
        console.log(`🚀 All registrations processed with QR codes ${batchCount}!`);
      });
  } catch (error) {
    console.error("❌ Error processing file:", error);
  }
};

async function ensureHeat(eventId: string, heatId: string, heatData: Heat) {
  const heatRef = db.collection(heatCollectionPath(eventId)).doc(heatId);
  if (!(await heatRef.get()).exists) await heatRef.set(heatData);
}

async function ensureCategory(eventId: string, categoryName: string): Promise<Category | null> {
  const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
  const categoryQuery = await categoriesCollection.where("name", "==", categoryName).get();
  if (categoryQuery.empty) return null;
  return categoryQuery.docs[0].data() as Category;
}
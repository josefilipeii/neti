import { StorageHandler } from "../domain";
import {db, storage} from "../firebase";
import {Bucket, File} from "@google-cloud/storage";
import {logger} from "firebase-functions";
import csv from "csv-parser";
import {firestore} from "firebase-admin";
import {generateQrId} from "../lib/qr";
import  {Timestamp} from "firebase-admin/firestore";


const csvParser: NodeJS.ReadWriteStream = csv();

export const processAddons: StorageHandler = async (object: { data: { bucket: string; name: string } }): Promise<void> => {
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

  if(!type && !eventId){
    console.log("❌ Missing type or eventId in file path");
    return;
  }

  if(type !== "tshirts"){
    console.log(`❌ Invalid type ${type}`);
    return;
  }

  const firestoreWrites: Promise<firestore.WriteResult[]>[] = []; // Collect Firestore writes

  try {
    let batch = db.batch();
    let batchCount = 0;

    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .pipe(csvParser)
        .on("data",
          (row: Record<string, string>) => {
            try {
              const {
                provider,
                internalId,
                externalId,
                name,
                email,
                sizeS
                , sizeM,
                sizeL,
                sizeXL,
                sizeXXL
              } = row;

              if(!(sizeS || sizeM || sizeL || sizeXL || sizeXXL)){
                logger.warn("⚠️ Skipping invalid row:", row);
                return;
              }

              const idProvided = internalId || externalId;
              if (!idProvided || !name || !email) {
                logger.warn("⚠️ Skipping invalid row:", row);
                return;
              }

              if(externalId && !provider){
                logger.warn("⚠️ Registrations with external_id must define a provider");
                return;
              }

              const tshirtProvider = provider ? provider : "GF";
              const tshirtId = generateQrId("GF-AT", internalId);


              const tshirtRef = db.collection(`/competitions/${eventId}/addons/types/tshirts`).doc(tshirtId);

              const sizes =
                  {
                    s: sizeS || "",
                    m: sizeM || "",
                    l: sizeL || "",
                    xl: sizeXL || "",
                    xxl: sizeXXL || ""
                  }

              batch.set(tshirtRef, {
                competition: eventId,
                provider: tshirtProvider,
                referenceId: internalId,
                name,
                email,
                sizes,
                status: "pending",
                createdAt: Timestamp.now(),
              });

              batchCount++;

              // Commit batch every 500 writes
              if (batchCount >= 100) {
                firestoreWrites.push(batch.commit());
                batch = db.batch(); // Start a new batch
                batchCount = 0;
              }
            } catch (error) {
              logger.error("❌ Error processing row:", error);
            }
          })
        .on("end", async () => {
          try {
            if (batchCount > 0) {
              firestoreWrites.push(batch.commit());
            }

            await Promise.all(firestoreWrites);
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
    })
  } catch (error) {
    logger.error("❌ Error processing file:", error);
  }
};

import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import { StorageEvent } from "firebase-functions/lib/v2/providers/storage";
import { logger } from "firebase-functions";
import { Bucket } from "@google-cloud/storage";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export const userImportHandler: StorageHandler = async (object: StorageEvent) => {
  const bucketName = object.data.bucket;
  const filePath = object.data.name;

  if (!filePath) {
    logger.error("❌ Missing file path in storage event.");
    return;
  }

  // ✅ Ensure the file is in "users/" and is a JSON file
  if (!filePath.startsWith("users/") || !filePath.endsWith(".json")) {
    logger.log(`❌ Skipping file: ${filePath} (not in users/ or not a JSON)`);
    return;
  }

  try {
    const bucket: Bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [fileContents] = await file.download();
    const users = JSON.parse(fileContents.toString());

    if (!Array.isArray(users)) {
      logger.error("❌ Invalid JSON format. Expected an array.");
      return;
    }

    const userPromises = users.map(async (user) => {
      const { email, roles } = user;

      if (!email || !roles) {
        logger.warn("⚠️ Skipping user without email/roles:", user);
        return null;
      }

      let userRecord;
      let userId;
      let isNewUser = false;

      try {
        // 1️⃣ Check if user exists in Firebase Auth
        userRecord = await admin.auth().getUserByEmail(email);
        userId = userRecord.uid;
      } catch (error) {
        try {
          logger.log(`👤 User not found in Auth: ${email}, creating a new one.`, error);
          userRecord = await admin.auth().createUser({ email });
          userId = userRecord.uid;
          isNewUser = true;
        } catch(anotherError) {
          logger.error(`❌ Error fetching user ${email} from Auth:`, anotherError);
          return null;
        }
      }

      // 2️⃣ Check if the user exists in Firestore by email
      let userRef;
      const existingUserSnapshot = await db.collection("users").where("email", "==", email).get();

      if (!existingUserSnapshot.empty) {
        // If user exists in Firestore, use existing document reference
        userRef = existingUserSnapshot.docs[0].ref;
      } else if (isNewUser) {
        // If the user is new, create a new Firestore document with userId
        userRef = db.collection("users").doc(userId);
        await userRef.set({ email, roles });
      }

      // 3️⃣ Override roles in Firebase Auth Custom Claims
      await admin.auth().setCustomUserClaims(userId, { roles });

      return { email, uid: userId, roles };
    });

    const results = await Promise.all(userPromises);
    logger.log("✅ User import complete:", results);
    return results;
  } catch (error) {
    logger.error("❌ Error processing user import:", error);
    throw new HttpsError("internal", "Failed to import users.");
  }
};

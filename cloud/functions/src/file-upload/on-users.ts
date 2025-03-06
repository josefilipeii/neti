import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import {StorageEvent} from "firebase-functions/lib/v2/providers/storage";
import {logger} from "firebase-functions";
import {Bucket} from "@google-cloud/storage";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";

export const userImportHandler: StorageHandler = async (object: StorageEvent) => {
  const bucketName = object.data.bucket;
  const filePath = object.data.name;

  if (!filePath) {
    logger.error("❌ Missing file path in storage event.");
    return;
  }

  // ✅ Ensure the file is in "competitions/" and is a JSON file
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
      console.error("Invalid JSON format. Expected an array.");
      return null;
    }

    const userPromises = users.map(async (user) => {
      const { email, roles } = user;

      if (!email || !roles) {
        console.warn("Skipping user without email/role:", user);
        return null;
      }

      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (error) {
        console.log("User not found, creating a new one", error);
        // 3️⃣ If the user doesn't exist, create a new one
        userRecord = await admin.auth().createUser({ email });
      }

      const userId = userRecord.uid;

      // 4️⃣ Fetch existing role from Firestore
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      let existingRoles = [];

      if (userDoc.exists && userDoc.data()?.roles) {
        existingRoles = userDoc.data()?.roles;
      }

      // 5️⃣ Merge existing roles with new role (avoiding duplicates)
      const updatedRoles = Array.from(new Set([...existingRoles, ...roles]));

      // 6️⃣ Update Firestore with merged roles
      await userRef.set({ email, roles });

      // 7️⃣ Update Firebase Auth custom claims with new roles
      await admin.auth().setCustomUserClaims(userId, { roles: updatedRoles });

      return { email, uid: userId, roles: updatedRoles };
    });

    const results = await Promise.all(userPromises);
    console.log("✅ Users imported successfully:", results);
    return results;
  } catch (error) {
    console.error("❌ Error processing user import:", error);
    throw new HttpsError("internal", "Failed to import users.");
  }
};

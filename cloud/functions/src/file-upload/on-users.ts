import {Agent, StorageHandler, User} from "../domain";
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

  // ✅ Ensure the file is either in "users/" or "agents/" and is a JSON file
  const isUserFile = filePath.startsWith("users/");
  const isAgentFile = filePath.startsWith("agents/");

  if ((!isUserFile && !isAgentFile) || !filePath.endsWith(".json")) {
    logger.log(`❌ Skipping file: ${filePath} (not in users/ or agents/ or not a JSON)`);
    return;
  }

  try {
    const bucket: Bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [fileContents] = await file.download();
    const records = JSON.parse(fileContents.toString());

    if (!Array.isArray(records)) {
      logger.error("❌ Invalid JSON format. Expected an array.");
      return;
    }

    if (isUserFile) {
      await processUsers(records);
    } else if (isAgentFile) {
      await processAgents(records);
    }

    logger.log(`✅ Import complete for ${filePath}`);
  } catch (error) {
    logger.error("❌ Error processing import:", error);
    throw new HttpsError("internal", "Failed to process import.");
  }
};

const processUsers = async (users: User[]) => {
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
      userRecord = await admin.auth().getUserByEmail(email);
      userId = userRecord.uid;
    } catch (error) {
      try {
        logger.log(`👤 User not found in Auth: ${email}, creating a new one.`, error);
        userRecord = await admin.auth().createUser({ email });
        userId = userRecord.uid;
        isNewUser = true;
      } catch (anotherError) {
        logger.error(`❌ Error creating user ${email}:`, anotherError);
        return null;
      }
    }

    let userRef;
    const existingUserSnapshot = await db.collection("users").where("email", "==", email).get();

    if (!existingUserSnapshot.empty) {
      userRef = existingUserSnapshot.docs[0].ref;
    } else if (isNewUser) {
      userRef = db.collection("users").doc(userId);
      await userRef.set({ email, roles });
    }

    await admin.auth().setCustomUserClaims(userId, { roles });

    return { email, uid: userId, roles };
  });

  return Promise.all(userPromises);
};

const processAgents = async (agents: Agent[]) => {
  const agentPromises = agents.map(async (agent) => {
    const { user, pin, roles, enabled } = agent;

    if (!user || !pin || !roles || !enabled) {
      logger.warn("⚠️ Skipping invalid agent entry:", agent);
      return null;
    }
    const agentRef = db.collection("agents").doc(user);

    await agentRef.set({ user, pin, roles, enabled });

    return { user, pin, roles, enabled };
  });

  return Promise.all(agentPromises);
};

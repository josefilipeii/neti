import { Category, Competition } from "../../../../packages/shared";
import { StorageHandler } from "../domain";
import { addonsDirectory, participantsDirectory } from "../constants";
import { db, storage } from "../firebase";
import {Bucket} from "@google-cloud/storage";
import {logger} from "firebase-functions";

export const useCompetitionsHandler: StorageHandler = async (object) => {
  const bucketName = object.data.bucket;
  const filePath = object.data.name;

  if (!filePath) {
    logger.error("❌ Missing file path in storage event.");
    return;
  }

  // ✅ Ensure the file is in "competitions/" and is a JSON file
  if (!filePath.startsWith("competitions/") || !filePath.endsWith(".json")) {
    logger.log(`❌ Skipping file: ${filePath} (not in competitions/ or not a JSON)`);
    return;
  }

  const bucket: Bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  try {
    // ✅ Read file content
    const [fileContents] = await file.download();
    const jsonData = JSON.parse(fileContents.toString());

    if (!jsonData.competitions || !Array.isArray(jsonData.competitions)) {
      throw new Error("❌ Invalid JSON format: Missing competitions array.");
    }

    // ✅ Process competitions with Firestore transactions
    await Promise.all(
      jsonData.competitions.map(async (competition: Competition) => {
        if (!competition.shortId || !competition.id || !competition.name || !competition.days) {
          logger.warn("⚠️ Skipping invalid competition:", competition);
          return;
        }

        const competitionId = competition.shortId;
        const competitionRef = db.collection("competitions").doc(competitionId);

        await db.runTransaction(async (transaction) => {
          const competitionSnap = await transaction.get(competitionRef);

          if (!competitionSnap.exists) {
            transaction.set(competitionRef, {
              code: competition.id,
              name: competition.name,
              location: competition.location,
              days: competition.days,
              address: competition.address,
              checkinMinutesBefore: competition.checkinMinutesBefore
            });
            logger.log(`✅ Competition '${competition.name}' added.`);
          } else {
            transaction.update(competitionRef, {
              days: competition.days,
              address: competition.address,
              location: competition.location,
              checkinMinutesBefore: competition.checkinMinutesBefore
            });
            logger.log(`⚠️ Competition '${competition.name}' exists. Updated days.`);
          }
        });

        await initEventFolders(competitionId, bucket);

        // ✅ Process Categories using batched writes
        await processCategories(competitionId, competition.categories || []);
      })
    );

    logger.log("🚀 Firestore data successfully updated!");
  } catch (error) {
    logger.error("❌ Error processing file:", error);
  }
};

/**
 * Initializes event folders in Cloud Storage.
 */
async function initEventFolders(competitionId: string, bucket: Bucket) {
  const participantsFile = bucket.file(`${participantsDirectory(competitionId)}/.init`);
  const tshirtsFile = bucket.file(`${addonsDirectory(competitionId)}/tshirts/.init`);

  // Ensure folders exist by creating empty marker files
  await Promise.all([
    participantsFile.save(""),
    tshirtsFile.save("")
  ]);
}

/**
 * Processes categories in a Firestore batch operation.
 */
async function processCategories(competitionId: string, categories: Category[]) {
  if (!categories.length) return;

  const competitionRef = db.collection("competitions").doc(competitionId);
  const categoriesRef = competitionRef.collection("categories");

  // Fetch existing category IDs in a single query
  const existingCategoriesSnap = await categoriesRef.get();
  const existingCategories = new Set(existingCategoriesSnap.docs.map((doc) => doc.id));

  const batch = db.batch();

  categories.forEach((category) => {
    if (!category.id || !category.name || !category.type) {
      logger.warn(`⚠️ Skipping invalid category in '${competitionId}':`, category);
      return;
    }

    const categoryRef = categoriesRef.doc(category.id);
    if (!existingCategories.has(category.id)) {
      batch.set(categoryRef, category);
      logger.log(`✅ Added category '${category.name}'`);
    } else {
      batch.set(categoryRef, category, { merge: true });
      logger.log(`⚠️ Category '${category.name}' already exists. Updated.`);
    }
  });

  await batch.commit();
}

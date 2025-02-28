import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";
import {Category, Competition} from "../domain/domain";

admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();


export const processCompetitionFile = functions.storage
  .onObjectFinalized(async (object) => {
    const bucketName = object.data.bucket;
    const filePath = object.data.name;
    console.log(JSON.stringify(object));

    if (!filePath) {
      console.error("❌ Missing file path in storage event.");
      return;
    }

    // ✅ Ensure file is inside the "competitions/" folder and is a JSON file
    if (!filePath.startsWith("competitions/") || !filePath.endsWith(".json")) {
      console.log(`❌ Skipping file: ${filePath} (not in competitions/ or not a JSON)`);
      return;
    }

    const fileName = filePath.split("/").pop();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    try {
      // ✅ Read file content
      const [fileContents] = await file.download();
      const jsonData = JSON.parse(fileContents.toString());

      if (!jsonData.competitions || !Array.isArray(jsonData.competitions)) {
        throw new Error("❌ Invalid JSON format: Missing competitions array.");
      }

      // ✅ Process Each Competition
      for (const competition of jsonData.competitions as Competition[]) {
        if (!competition.id || !competition.name || !competition.days) {
          console.warn("⚠️ Skipping invalid competition:", competition);
          continue;
        }

        const competitionId = competition.id;
        const competitionRef = db.collection("competitions").doc(competitionId);
        const competitionSnapshot = await competitionRef.get();

        if (!competitionSnapshot.exists) {
          await competitionRef.set({
            name: competition.name,
            location: competition.location,
            days: competition.days,
          });
          console.log(`✅ Competition '${competition.name}' added.`);
        } else {
          console.log(`⚠️ Competition '${competition.name}' exists. Updating days...`);
          await competitionRef.update({days: competition.days});
        }

        // ✅ Process Categories (Avoid Duplicates)
        const categoriesRef = competitionRef.collection("categories");
        const existingCategoriesSnapshot = await categoriesRef.get();
        const existingCategories = existingCategoriesSnapshot.docs.map((doc) => doc.id);

        for (const category of competition.categories as Category[]) {
          if (!category.id || !category.name || !category.type) {
            console.warn(`⚠️ Skipping invalid category in '${competition.name}':`, category);
            continue;
          }

          if (!existingCategories.includes(category.id)) {
            await categoriesRef.doc(category.id).set(category);
            console.log(`✅ Added category '${category.name}'`);
          } else {
            console.log(`⚠️ Category '${category.name}' already exists. Skipping.`);
          }
        }
      }

      console.log("🚀 Firestore data successfully updated!");

      // ✅ Optionally delete the file after processing
      await file.delete();
      console.log(`🗑️ File '${fileName}' deleted after processing.`);
    } catch (error) {
      console.error("❌ Error processing file:", error);
    }
  });

import { Category, Heat } from "../../../../packages/shared";
import { StorageHandler } from "../domain";
import { db, storage } from "../firebase";
import csv from "csv-parser";

const csvParser: NodeJS.ReadWriteStream = csv();


type Row = {
  heatName: string;
  heatDay: string;
  heatTime: string;
  dorsal: string;
  category: string;
  name: string;
  email: string;
  contact: string;
};

function heatCollectionPath(eventId: string) {
  return `competitions/${eventId}/heats`;
}

function registrationCollectionPath(eventId: string, heatId: string) {
  return `${heatCollectionPath(eventId)}/${heatId}/registrations`;
}

export const useParticipantsHandler: StorageHandler = async (object) => {
  const bucketName = object.data.bucket;
  const filePath = object.data.name;

  if (!filePath) {
    console.error("❌ Missing file path in storage event.");
    return;
  }

  // ✅ Ensure file is a CSV inside "participants/{event_id}/"
  if (!filePath.startsWith("participants/") || !filePath.match(/^participants\/[a-z0-9_]+\/.*\.csv$/)) {
    console.log(`❌ Skipping file: ${filePath} (not in correct folder or not a CSV)`);
    return;
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  const pathParts = filePath.split("/");
  const eventId = pathParts[1];

  try {
    const results: Row[] = [];
    file.createReadStream()
      .pipe(csvParser)
      .on("data", (data: Row) => results.push(data))
      .on("end", async () => {
        try {
          console.log(`📂 Processing ${results.length} rows from CSV: ${filePath}`);

          const batch = db.batch();
          const categoryCache = new Map<string, string>(); // categoryName -> categoryId
          const heatCache = new Set<string>(); // Set of processed heatIds

          for (const row of results) {
            const { heatName, heatDay, heatTime, dorsal, category, name, email, contact } = row;
            if (!heatName || !heatDay || !heatTime || !dorsal || !category || !email || !name || !contact) {
              console.warn(`⚠️ Skipping invalid row in '${filePath}':`, row);
              continue;
            }

            // ✅ Ensure category exists (cache first)
            let categoryId = categoryCache.get(category);
            if (!categoryId) {
              const categoryDoc = await ensureCategory(eventId, category);
              if (!categoryDoc) {
                console.warn(`⚠️ Skipping row with unknown category '${category}' in '${filePath}':`, row);
                continue;
              }
              categoryId = categoryDoc.id;
              categoryCache.set(category, categoryId);
            }

            // ✅ Generate heat ID
            const sanitizedHeatDate = heatDay.replace(/[^a-zA-Z0-9]/g, "_");
            const sanitizedHeatTime = heatTime.replace(/[^a-zA-Z0-9]/g, "_");
            const heatId = `${sanitizedHeatDate}-${sanitizedHeatTime}`;

            // ✅ Ensure heat exists (cache first)
            if (!heatCache.has(heatId)) {
              await ensureHeat(eventId, heatId, { name: heatName, day: heatDay, time: heatTime });
              heatCache.add(heatId);
            }

            // ✅ Prepare registration data
            const registrationPath = registrationCollectionPath(eventId, heatId);
            const registrationRef = db.collection(registrationPath).doc(dorsal);

            batch.set(registrationRef, {
              category: categoryId,
              day: heatDay,
              time: heatTime,
              participants: [{ name, email, contact }],
            }, { merge: true });


            console.log(`✅ Queued registration for dorsal: ${dorsal}`);
          }

          // ✅ Commit batch operation to Firestore
          await batch.commit();
          console.log("🚀 CSV data successfully processed and saved to Firestore!");

        } catch (error) {
          console.error("❌ Error processing CSV data:", error);
        }
      });
  } catch (error) {
    console.error("❌ Error processing file:", error);
  }
};

/**
 * Ensures the category exists and returns it.
 */
async function ensureCategory(eventId: string, categoryName: string): Promise<Category | null> {
  const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
  const categoryQuery = await categoriesCollection.where("name", "==", categoryName).get();

  if (categoryQuery.empty) {
    console.warn(`⚠️ Category '${categoryName}' not found for competition '${eventId}'.`);
    return null;
  }

  return categoryQuery.docs[0].data() as Category;
}

/**
 * Ensures the heat exists in Firestore.
 */
async function ensureHeat(eventId: string, heatId: string, heatData: Heat) {
  const heatRef = db.collection(heatCollectionPath(eventId)).doc(heatId);
  const heatSnapshot = await heatRef.get();

  if (!heatSnapshot.exists) {
    await heatRef.set(heatData);
    console.log(`✅ Added new heat: ${heatData.name}`);
  }
}

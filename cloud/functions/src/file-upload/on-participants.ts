import {Category, Heat, Registration} from "../../../../packages/shared";
import {StorageHandler} from "../domain";
import {db, storage} from "../firebase";
import csv from "csv-parser";

const csvParser: NodeJS.ReadWriteStream = csv();

type RowHeat = { heatDay: string; heatName: string; heatTime: string }

type Row = {
    heatName: string,
    heatDay: string,
    heatTime: string,
    dorsal: string,
    category: string,
    name: string,
    email: string,
    contact: string
}


function heatCollectionPath(eventId: string) {
    return `competitions/${eventId}/heats`;
}

function registrationCollectionPath(eventId: string, heatId: string) {
    return `${heatCollectionPath(eventId)}/${heatId}/registrations`;
}


async function ensureHeat(eventId: string, heatId: string, heatData: Heat) {
    const collectionName = heatCollectionPath(eventId);
    const heatsCollection = db.collection(collectionName);
    const heatRef = heatsCollection.doc(heatId);
    const heatSnapshot = await heatRef.get();

    if (!heatSnapshot.exists) {
        await heatRef.set(heatData);
        console.log(`✅ Added new heat: ${heatData.name}`);
    }
}

export const useParticipantsHandler: StorageHandler = async (object) => {
    const bucketName = object.data.bucket;
    const filePath = object.data.name;

    if (!filePath) {
        console.error("❌ Missing file path in storage event.");
        return;
    }

    // ✅ Ensure file is inside the "participants/{event_id}/" folder and is a JSON file
    if (!filePath.startsWith("participants/") || !filePath.match(/^participants\/[a-z0-9_]+\/.*\.csv$/)) {
        console.log(`❌ Skipping file: ${filePath} (not in competitions/ or not a JSON)`);
        return;
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    try {
        const pathParts = filePath.split("/");
        const eventId = pathParts[1];

        const results: Row[] = [];
        file.createReadStream()
            .pipe(csvParser)
            .on("data", (data: Row) => results.push(data))
            .on("end", async () => {
                try {
                    for (const row of results) {

                        // Assuming the CSV has columns
                        const {heatName, heatDay, heatTime, dorsal, category, name, email, contact} = row;
                        if (!heatName || !heatDay || !heatTime || !dorsal || !category || !email || !name || !contact) {
                            console.warn(`⚠️ Skipping invalid row in file '${filePath}':`, row);
                            continue;
                        }

                        const competitionCategory = await ensureCategory(eventId, category);
                        if (!competitionCategory) {
                            console.warn(`⚠️ Skipping row with unknown category '${category}' in file '${filePath}':`, row);
                            continue;
                        }

                        const categoryId = competitionCategory.id;
                        const rowHeat: RowHeat = {heatName, heatDay, heatTime};

                        const sanitizedHeatDate = rowHeat.heatDay.replace(/[^a-zA-Z0-9]/g, "_");
                        const sanizizeHeatTime = rowHeat.heatTime.replace(/[^a-zA-Z0-9]/g, "_")
                        const heatId = `${sanitizedHeatDate}-${sanizizeHeatTime}`;

                        const heat: Heat = {
                            name: rowHeat.heatName,
                            day: rowHeat.heatDay,
                            time: rowHeat.heatTime
                        }
                        await ensureHeat(eventId, heatId, heat);

                        // Insert into registrations subcollection of the heat
                        const registrationPath = registrationCollectionPath(eventId, heatId);
                        const registrationsCollection = db.collection(registrationPath);

                        // Check if registrationData already exists
                        const registrationRef = await registrationsCollection.doc(dorsal)
                        const registrationSnapshot = await registrationRef.get();

                        if (registrationSnapshot.exists) {
                            console.log(`⚠️ Registration with dorsal ${dorsal} and category ${categoryId} already exists.`);
                            return Promise.resolve(registrationSnapshot.data() as Registration);
                        }


                        const registrationData: Registration = {
                            category: categoryId,
                            participants: [
                                {
                                    name: name,
                                    email: email,
                                    contact: contact
                                }
                            ]
                        };
                        await registrationRef.set(registrationData);
                        console.log(`✅ Added registration with dorsal: ${dorsal}`);
                    }
                    console.log("🚀 CSV data successfully processed!");
                } catch (error) {
                    console.error("❌ Error processing CSV data:", error);
                }
            });
        await file.download();


    } catch (error) {
        console.error("❌ Error processing file:", error);
    }
}


async function ensureCategory(eventId: string, categoryName: string): Promise<Category | null> {
    const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
    const categoryQuery = await categoriesCollection.where("name", "==", categoryName).get();

    if (categoryQuery.empty) {
        console.warn(`⚠️ Category with name '${categoryName}' not found for competition with eventId '${eventId}'.`);
        return null;
    }

    return categoryQuery.docs[0].data() as Category;
}

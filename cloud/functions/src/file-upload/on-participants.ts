import {Category, Heat, Participant, Registration} from "../../../../packages/shared";
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

            const competitionCategory = await getCategoryByName(eventId, category);
            if (!competitionCategory) {
              console.warn(`⚠️ Skipping row with unknown category '${category}' in file '${filePath}':`, row);
              continue;
            }

            const rowHeat: RowHeat = {heatName, heatDay, heatTime};
            const heat: Heat = await handleHeatCollection(eventId, rowHeat);

            const participantRef = await handleParticipant(eventId, email, name, contact);
            const registration = await handleRegistration(eventId, heat.id, heat.day, dorsal, competitionCategory?.id, [participantRef]);
            console.log(`✅ Registration Done: ${registration.id}`);
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

async function handleHeatCollection(eventId: string, heat: RowHeat): Promise<Heat> {
  // Insert into heats collection
  const heatId = `${heat.heatDay.replace(/[^a-zA-Z0-9]/g, "_")}-${heat.heatTime.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const collectionName = `competitions/${eventId}/heats`;
  const heatsCollection = db.collection(collectionName);
  const heatRef = heatsCollection.doc(heatId);
  const heatSnapshot = await heatRef.get();

  if (!heatSnapshot.exists) {
    const data = {
      name: heat.heatName,
      day: heat.heatDay,
      time: heat.heatTime
    };
    await heatRef.set(data);
    console.log(`✅ Added new heat: ${heat.heatName}`);
    return Promise.resolve({id: heatId, ...data});
  } else {
    console.log(`⚠️ Heat '${heat.heatName}' already exists.`);
    return Promise.resolve(heatSnapshot.data() as Heat);
  }
}

async function handleRegistration(eventId: string, heat: string, date: string, dorsal: string, categoryId: string, participants: Participant[]) {
  const sanitizedDate = new Date(date).toISOString().slice(0, 10).replace(/[^a-zA-Z0-9]/g, "_");
  const registrationId = `${sanitizedDate}_${dorsal}`;
  // Insert into registrations subcollection of the heat
  const registrationsCollection = db.collection(`competitions/${eventId}/registrations`);

  // Check if registration already exists
  const registrationRef = await registrationsCollection.doc(registrationId)
  const registrationSnapshot = await registrationRef.get();

  if (registrationSnapshot.exists) {
    console.log(`⚠️ Registration with dorsal ${dorsal} and category ${categoryId} already exists.`);
    return Promise.resolve(registrationSnapshot.data() as Registration);
  }


  const registration: Registration = {
    dorsal: dorsal,
    category: categoryId,
    participants: participants.map(it => it.id)
  };
  await registrationRef.set(registration);
  console.log(`✅ Added registration with dorsal: ${dorsal}`);
  return registration;
}

async function handleParticipant(eventId: string, email: string, name: string, contact: string): Promise<Participant> {
  // Insert into participants collection
  const collection = db.collection(`competitions/${eventId}/participants`);
  const participantQuery = await collection.where("email", "==", email).get();
  let participantRef;
  if (participantQuery.empty) {
    participantRef = collection.doc();
    await participantRef.set({
      name,
      email,
      phone: contact
    });
    return participantRef.get().then(doc => ({id: doc.id, ...doc.data()}) as Participant);
  } else {
    console.log(`⚠️ Participant with email ${email} already exists.`);
    return participantQuery.docs[0].ref.get().then(doc => ({id: doc.id, ...doc.data()}) as Participant);
  }
}

async function getCategoryByName(eventId: string, categoryName: string): Promise<Category | null> {
  const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
  const categoryQuery = await categoriesCollection.where("name", "==", categoryName).get();

  if (categoryQuery.empty) {
    console.warn(`⚠️ Category with name '${categoryName}' not found for competition with eventId '${eventId}'.`);
    return null;
  }

  return categoryQuery.docs[0].data() as Category;
}

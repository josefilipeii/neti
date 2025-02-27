const admin = require("firebase-admin");
const fs = require("fs");
async function initializeFirestore(filename) {
    try {


        const serviceAccountJson = fs.readFileSync('../serviceAccountKey.json', 'utf8');

        // ✅ Step 1: Decode and Load Service Account JSON Securely
        if (!serviceAccountJson) {
            throw new Error("❌ Missing serviceAccountKey.json file");
        }

        // ✅ Step 2: Initialize Firebase Admin SDK
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(serviceAccountJson))
        });

        const db = admin.firestore();
        console.log("✅ Firestore initialized.");

        // ✅ Step 3: Load & Validate `data.json`
        const data = JSON.parse(fs.readFileSync(filename, "utf8"));
        if (!data.competitions || !Array.isArray(data.competitions) || data.competitions.length === 0) {
            throw new Error("❌ Invalid data.json: Missing or empty competitions array.");
        }

        // ✅ Step 4: Process Each Competition
        for (const competition of data.competitions) {
            if (!competition.id || !competition.name || !competition.days) {
                console.warn(`⚠️ Skipping invalid competition:`, competition);
                continue;
            }

            const competitionId = competition.id;
            const competitionRef = db.collection("competitions").doc(competitionId);
            const competitionSnapshot = await competitionRef.get();

            if (!competitionSnapshot.exists) {
                await competitionRef.set({
                    name: competition.name,
                    location: competition.location,
                    start_date: competition.start_date,
                    end_date: competition.end_date,
                    days: competition.days  // ✅ Days are now part of the main document
                });
                console.log(`✅ Competition '${competition.name}' added.`);
            } else {
                console.log(`⚠️ Competition '${competition.name}' already exists. Updating days...`);
                await competitionRef.update({ days: competition.days });
            }

            // ✅ Step 5: Add Categories (Avoid Duplicates)
            const categoriesRef = competitionRef.collection("categories");
            const existingCategoriesSnapshot = await categoriesRef.get();
            const existingCategories = existingCategoriesSnapshot.docs.map(doc => doc.id);

            for (const category of competition.categories) {
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

        console.log("🚀 All competitions have been processed!");

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

// ✅ Read File from CLI Argument
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("❌ Please provide a JSON file.");
    process.exit(1);
}

initializeFirestore(args[0]).catch(console.error);

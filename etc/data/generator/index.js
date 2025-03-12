const faker = require('@faker-js/faker').faker;
const fs = require('fs');
const path = require('path');
const csvWriter = require('fast-csv');


const categoryList = [
    {id: "hybrid_men", name: "Hybrid Men", type: "individual"},
    {id: "hybrid_women", name: "Hybrid Women", type: "individual"},
    {id: "hybrid_pro_men", name: "Hybrid Pro Men", type: "individual"},
    {id: "hybrid_pro_women", name: "Hybrid Pro Women", type: "individual"},
    {id: "hybrid_doubles_men", name: "Hybrid Doubles Men", type: "pair"},
    {id: "hybrid_doubles_women", name: "Hybrid Doubles Women", type: "pair"},
    {id: "hybrid_doubles_mixed", name: "Hybrid Doubles Mixed", type: "pair"},
    {id: "hybrid_pro_doubles_men", name: "Hybrid Pro Doubles Men", type: "pair"},
    {id: "hybrid_pro_doubles_women", name: "Hybrid Pro Doubles Women", type: "pair"},
    {id: "hybrid_pro_doubles_mixed", name: "Hybrid Pro Doubles Mixed", type: "pair"},
    {id: "hybrid_team_relay", name: "Hybrid Team Relay", type: "team_4"},
    {id: "hybrid_pro_team_relay", name: "Hybrid Pro Team Relay", type: "team_4"}
];

/**
 * Generate a list of registrations with participants and assigned heats and schedules.
 * @param {number} numParticipants - The total number of participants.
 * @param {number} numDays - The total number of days for scheduling heats.
 * @param {string} emailPrefix - The prefix for generated emails.
 * @param {string} emailSuffix - The suffix (domain) for generated emails.
 * @param {string} startTime - The start time for the first heat of each day (Format: "HH:mm").
 * @returns {Object} - An object containing the registrations and heats.
 */
function generateRegistrations(numParticipants, numDays, emailPrefix = '', emailSuffix = '@event.com', startTime = '08:00') {
    if (numParticipants <= 0 || numDays <= 0) {
        throw new Error("Number of participants and days must be greater than zero.");
    }

    const registrations = [];
    const heats = [];
    let participantIndex = 0;
    let currentDate = new Date();

    for (let day = 0; day < numDays; day++) {
        let [startHour, startMinute] = startTime.split(':').map(Number);
        let heatStartTime = new Date(currentDate);
        heatStartTime.setHours(startHour, startMinute, 0, 0);

        while (participantIndex < numParticipants) {
            // Generate a random group size between 6 and 8
            const groupSize = faker.number.int({min: 6, max: 8});
            if (participantIndex + groupSize > numParticipants) break;

            // Generate a random heat name
            const heatName = `${faker.word.adjective()} ${faker.word.noun()}`;
            const heatTime = heatStartTime.toTimeString().split(':').slice(0, 2).join(':');
            const heatDay = heatStartTime.toISOString().split('T')[0];
            const categoryType = groupSize === 1 ? 'individual' : groupSize === 2 ? 'pair' : 'team_4';
            const category = faker.helpers.arrayElement(categoryList.filter(category => category.type === categoryType)).name;
            const internalId = `S1${String(participantIndex).padStart(4, '0')}`;
            const heatParticipants = [];
            for (let i = 0; i < groupSize; i++) {
                // Randomize the number of participants per registration (1, 2, or 4)
                const numPerRegistration = faker.helpers.arrayElement([1, 2, 4]);
                const dorsal = `${heatTime.replaceAll(':', '')}-${i}`;


                const registrationParticipants = [];
                for (let j = 0; j < numPerRegistration; j++) {
                    if (participantIndex >= numParticipants) break;

                    const firstName = faker.person.firstName();
                    const lastName = faker.person.lastName();
                    const email = `${emailPrefix}${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}`;

                    const participant = {
                        name: `${firstName} ${lastName}`,
                        email: email,
                        contact: faker.phone.number(),
                    };

                    registrationParticipants.push(participant);
                    participantIndex++;
                }

                let participants = registrationParticipants.map((participant, index) => ({
                    [`name${index + 1}`]: participant.name,
                    [`email${index + 1}`]: participant.email,
                    [`contact${index + 1}`]: participant.contact,
                }));
                const registration = {
                    internalId,
                    dorsal,
                    category,
                    heatName: heatName,
                    heatTime: heatTime, // Store only the time part
                    heatDay: heatDay,
                };

                if (registrationParticipants.length === 1) {
                    registration[`name`] = registrationParticipants[0].name;
                    registration[`email`] = registrationParticipants[0].email;
                    registration[`contact`] = registrationParticipants[0].contact;
                }

                registrationParticipants.forEach((participant, index) => {
                    registration[`name${index + 1}`] = participant.name;
                    registration[`email${index + 1}`] = participant.email;
                    registration[`contact${index + 1}`] = participant.contact;
                });

                registrations.push(registration);
                heatParticipants.push(...registrationParticipants);
            }

            // Store heat details
            heats.push({
                heatName,
                participants: heatParticipants,
            });


            // Schedule next heat with a 20-minute delay
            heatStartTime = new Date(heatStartTime.getTime() + 20 * 60000);
        }

        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {registrations, heats};
}


function writeCSV(fileName, data) {
    const filePath = path.join(__dirname, fileName);
    const ws = fs.createWriteStream(filePath);

    csvWriter.writeToStream(ws, data, {headers: true})
        .on('finish', () => console.log(`✅ CSV file saved: ${filePath}`));
}

// Example usage
const numParticipants = 5000;
const numDays = 3;
const emailPrefix = 'jose.filipe.chavarria+';
const emailSuffix = '@gmail.com.com';
const startTime = '09:00'; // First heat starts at 9 AM

const {registrations, heats} = generateRegistrations(numParticipants, numDays, emailPrefix, emailSuffix, startTime);

console.log(heats);
console.log(registrations);

writeCSV('registrations.csv', registrations);
writeCSV('heats.csv', heats);
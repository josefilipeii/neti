export const tempCollectionPath="tempRegistrations";

export const eventDocument = (eventId: string) => `competitions/${eventId}`;



export const qrCollectionPath =  "qrCodes";
export const registrationCollectionPath = (eventId: string, heatId: string) => (`${eventDocument(eventId)}/heats/${heatId}/registrations`);


export const heatCollectionPath = (eventId: string) =>  `competitions/${eventId}/heats`;

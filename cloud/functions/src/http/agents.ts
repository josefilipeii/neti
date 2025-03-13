import * as admin from "firebase-admin";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {CallableRequest} from "firebase-functions/lib/v2/providers/https";
import {FIRESTORE_REGION} from "../constants";
import {Agent} from "../domain";


function enforceAllowedOrigin(request: CallableRequest, allowedOrigins: string[]) {
  const origin = request.rawRequest.headers.origin;

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    logger.error(`Blocked request from origin: ${origin} : Expected ${allowedOrigins}`);
    throw new HttpsError("permission-denied", "Unauthorized origin");
  }
}


export const authenticateAgent = onCall({region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request) => {

    const ALLOWED_ORIGINS_CHECKIN = process.env.ALLOWED_ORIGINS_CHECKIN?.split(",") || [
      "https://heimdall-hybrid-day-checkin.web.app",
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173"
    ];
    enforceAllowedOrigin(request, ALLOWED_ORIGINS_CHECKIN); // ✅ Allow only Heimdall domains


    try {
      const { user, pin } = request.data;

      if (!user || !pin) {
        throw new HttpsError("invalid-argument", "Missing email or pin.");
      }

      // 1️⃣ Fetch the agent document directly by email
      const agentRef = admin.firestore().collection("agents").doc(user);
      const agentDoc = await agentRef.get();

      if (!agentDoc.exists) {
        logger.warn(`❌ Agent not found: ${user}`);
        throw new HttpsError("unauthenticated", "Invalid credentials.");
      }

      const agentData = agentDoc.data() as Agent;

      // 2️⃣ Validate PIN and check if the agent is enabled
      if (agentData.pin !== pin) {
        logger.warn(`❌ Incorrect PIN for agent: ${user}`);
        throw new HttpsError("unauthenticated", "Invalid credentials.");
      }

      if (!agentData.enabled) {
        logger.warn(`❌ Agent ${user} is disabled.`);
        throw new HttpsError("permission-denied", "Agent is disabled.");
      }

      // 3️⃣ Generate a Firebase custom token
      const customToken = await admin.auth().createCustomToken(user, { roles: agentData.roles });

      logger.log(`✅ Custom token generated for agent: ${user}`);

      return { token: customToken };
    } catch (error) {
      logger.error("❌ Error in authenticateAgent function:", error);
      throw new HttpsError("internal", "Authentication failed.");
    }
  });

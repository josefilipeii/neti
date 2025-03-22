import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";

export function enforceAllowedOrigin(request: CallableRequest, allowedOrigins: string[]) {
  const origin = request.rawRequest.headers.origin;

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    logger.error(`Blocked request from origin: ${origin} : Expected ${allowedOrigins}`);
    throw new HttpsError("permission-denied", "Unauthorized origin");
  }
}

export const adminActionsValidation = (request: CallableRequest) => {
  const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS_ADMIN?.split(",") || [
    "https://odin-hybrid-day-checkin.web.app",
    "http://localhost:5173",
  ];
  enforceAllowedOrigin(request, ALLOWED_ORIGINS); // ✅ Allow only Heimdall domains

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to check in.");
  }

  const roles = request.auth.token.roles || [];
  if (!roles?.includes("lobby") && !roles?.includes("admin") && !roles?.includes("dashboard")) {
    throw new HttpsError("permission-denied", `You dont have permissions to do it. ${roles}`);
  }
}
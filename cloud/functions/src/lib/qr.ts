import {createHash} from "crypto";

/** Generates a secure QR ID */
export const generateQrId = (prefix: string, eventId: string, code:string):string =>  {
  if (!code || !eventId) {
    throw new Error("Missing QR Data");
  }
  const hash = createHash("md5").update(`${eventId}:${code}`).digest("hex").substring(0, 12);
  const shortId = BigInt("0x" + hash).toString(36).toUpperCase();
  const controlDigit = (BigInt("0x" + hash) % BigInt(36)).toString(36).toUpperCase();
  return `${prefix}${shortId}${controlDigit}`;

}
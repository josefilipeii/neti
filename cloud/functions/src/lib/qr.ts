import {createHash} from "crypto";

/** Generates a secure QR ID */
export const generateQrId = (prefix: string, code:string):string =>  {
  if (!code) {
    throw new Error("Secret key not set in Firebase Functions Config.");
  }
  const hash = createHash("md5").update(code).digest("hex").substring(0, 12);
  const shortId = BigInt("0x" + hash).toString(36).toUpperCase();
  const controlDigit = (BigInt("0x" + hash) % BigInt(36)).toString(36).toUpperCase();
  return `${prefix}${shortId}${controlDigit}`;

}
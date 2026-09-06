import crypto from "node:crypto";
import { config } from "../config/config.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const key = Buffer.from(config.encryptionKey, "hex");
if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
}
export const generateApikey = () =>{
    const apiKey = crypto.randomBytes(32).toString('hex');
    const hashedKey = generateHash(apiKey);
    return {apiKey,hashedKey}
}

export const generateHash = (apiKey:string) =>{
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export const encryptSecret = (secret: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
  
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
  
    const authTag = cipher.getAuthTag();
  
    return [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
};
  
export const decryptSecret = (encryptedSecret: string): string => {
    const [ivHex, authTagHex, encryptedHex] = encryptedSecret.split(":");
  
    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error("Invalid encrypted secret");
    }
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
  
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    if (!decipher) {
        throw new Error("Failed to create decipher");
    }
    decipher.setAuthTag(authTag);
  
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  
    return decrypted.toString("utf8");
  };
  export const generateWebhookSignature = (
    secret: string,
    timestamp: string,
    body: string
  ) => {
    const signedPayload = `${timestamp}.${body}`;
  
    const signature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");
  
    return `sha256=${signature}`;
  };

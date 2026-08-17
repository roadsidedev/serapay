import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const encryptionVersion = "v1";
const initializationVectorBytes = 12;
const authenticationTagBytes = 16;

function getEncryptionKey() {
  const configuredKey = ENV.seraCredentialEncryptionKey.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(configuredKey)) {
    throw new Error("SERA_CREDENTIAL_ENCRYPTION_KEY must be a 32-byte hexadecimal key.");
  }
  return Buffer.from(configuredKey, "hex");
}

export function assertSeraCredentialEncryptionConfigured() {
  getEncryptionKey();
}

export function encryptSeraApiSecret(secret: string) {
  const iv = randomBytes(initializationVectorBytes);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [encryptionVersion, iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(".");
}

export function decryptSeraApiSecret(payload: string) {
  const [version, ivHex, tagHex, encryptedHex] = payload.split(".");
  if (version !== encryptionVersion || !ivHex || !tagHex || !encryptedHex) throw new Error("Stored Sera API secret has an invalid encryption envelope.");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  if (iv.length !== initializationVectorBytes || tag.length !== authenticationTagBytes) throw new Error("Stored Sera API secret has invalid encryption metadata.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

export function getSeraApiKeyFingerprint(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
}

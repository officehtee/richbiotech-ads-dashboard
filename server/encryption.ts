/**
 * AES-256-GCM Encryption Helper
 *
 * Used for: BM Access Token (Round 7.23)
 * Key: derived from JWT_SECRET (already in env)
 * Format: base64(iv | authTag | ciphertext)
 *
 * Why GCM: authenticated encryption — ป้องกัน tampering + ไม่ต้อง pad
 * Why JWT_SECRET: ใช้ secret ที่มีอยู่แล้ว ไม่เพิ่ม env ใหม่
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM standard
const TAG_LEN = 16;

/**
 * Derive 32-byte key from JWT_SECRET via SHA-256
 * Stable across process restarts as long as JWT_SECRET unchanged
 */
function getKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for encryption helper");
  }
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypt plaintext → base64 string
 * Format: base64(iv[12] | tag[16] | ciphertext[N])
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("encrypt: plaintext cannot be empty");
  }
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Decrypt base64 string → plaintext
 * Throws if tampered or wrong key
 */
export function decrypt(encoded: string): string {
  if (!encoded) {
    throw new Error("decrypt: encoded cannot be empty");
  }
  const buf = Buffer.from(encoded, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("decrypt: invalid ciphertext (too short)");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * Mask token for display (only show last 4 chars)
 */
export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "****";
  return `****${token.slice(-4)}`;
}

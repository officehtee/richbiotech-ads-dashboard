/**
 * Vitest — encryption helper (Round 7.23 Phase 1)
 */
import { beforeAll, describe, expect, it } from "vitest";
import { encrypt, decrypt, maskToken } from "./encryption";

beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret-for-encryption-spec-only";
  }
});

describe("encryption helper", () => {
  it("round-trips a typical Meta token", () => {
    const plain = "EAABwzLixnjYBO1234567890abcdefghijk";
    const cipher = encrypt(plain);
    expect(cipher).not.toEqual(plain);
    expect(cipher.length).toBeGreaterThan(plain.length);
    expect(decrypt(cipher)).toEqual(plain);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plain = "same-token-value";
    const c1 = encrypt(plain);
    const c2 = encrypt(plain);
    expect(c1).not.toEqual(c2);
    expect(decrypt(c1)).toEqual(plain);
    expect(decrypt(c2)).toEqual(plain);
  });

  it("round-trips Thai + emoji content", () => {
    const plain = "บัญชีโฆษณา 🎯 token-😀-2026";
    expect(decrypt(encrypt(plain))).toEqual(plain);
  });

  it("throws on tampered ciphertext (auth tag check)", () => {
    const cipher = encrypt("sensitive");
    // flip a byte near end (ciphertext part)
    const buf = Buffer.from(cipher, "base64");
    buf[buf.length - 1] = buf[buf.length - 1] ^ 0xff;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects empty input", () => {
    expect(() => encrypt("")).toThrow();
    expect(() => decrypt("")).toThrow();
  });

  it("rejects too-short ciphertext", () => {
    expect(() => decrypt(Buffer.from("short").toString("base64"))).toThrow();
  });
});

describe("maskToken", () => {
  it("masks long tokens to last 8 chars (4 stars + last 8)", () => {
    expect(maskToken("EAABwzLixnjYBO1234567890abcd")).toBe("****7890abcd");
  });

  it("returns **** for short tokens (<= 8 chars)", () => {
    expect(maskToken("abc")).toBe("****");
    expect(maskToken("12345678")).toBe("****");
  });

  it("returns empty string for empty input", () => {
    expect(maskToken("")).toBe("");
  });
});

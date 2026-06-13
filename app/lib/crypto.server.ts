import crypto from "node:crypto";

// AES-256-GCM encryption for Shopify access tokens at rest.
// Key is supplied via TOKEN_ENCRYPTION_KEY as 32 raw bytes, base64- or hex-encoded.
// Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard nonce length
const PREFIX = "enc:v1:"; // marks an encrypted value so we can detect plaintext legacy rows

function loadKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  // Accept base64 or hex; both must decode to exactly 32 bytes.
  let key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    key = Buffer.from(raw, "hex");
  }
  if (key.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        "Provide 32 random bytes, base64- or hex-encoded.",
    );
  }
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

// Returns `enc:v1:<iv>:<authTag>:<ciphertext>`, all base64.
export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return (
    PREFIX +
    [
      iv.toString("base64"),
      authTag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(":")
  );
}

// Decrypts a value produced by encrypt(). Plaintext (legacy, un-prefixed) is
// returned unchanged so the adapter survives a key being added after install.
export function decrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value;
  }
  const key = loadKey();
  const [, , ivB64, tagB64, dataB64] = value.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

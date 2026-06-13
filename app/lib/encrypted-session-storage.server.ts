import type { PrismaClient } from "@prisma/client";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { encrypt, decrypt } from "./crypto.server";

// Derive the Session type straight from the base class. Importing Session from
// "@shopify/shopify-api" picks the wrong nominal copy (the package is installed
// twice in the tree) and fails the override type-check. Parameters<> binds us to
// exactly the type PrismaSessionStorage uses.
type BaseStorage = PrismaSessionStorage<PrismaClient>;
type StoredSession = Parameters<BaseStorage["storeSession"]>[0];

// Wraps the stock PrismaSessionStorage so the Shopify access token is never
// written to the DB in plaintext. We encrypt accessToken (and any OAuth
// refreshToken) on the way in and decrypt on the way out; everything else
// delegates to the base storage.
export class EncryptedSessionStorage extends PrismaSessionStorage<PrismaClient> {
  async storeSession(session: StoredSession): Promise<boolean> {
    return super.storeSession(this.encryptSession(session));
  }

  async loadSession(id: string): Promise<StoredSession | undefined> {
    const session = await super.loadSession(id);
    return session ? this.decryptSession(session) : undefined;
  }

  async findSessionsByShop(shop: string): Promise<StoredSession[]> {
    const sessions = await super.findSessionsByShop(shop);
    return sessions.map((s) => this.decryptSession(s));
  }

  // Mutate a clone so the caller's in-memory session is never double-encrypted
  // if the SDK reuses it after storeSession.
  private encryptSession(session: StoredSession): StoredSession {
    const clone = this.cloneSession(session);
    if (clone.accessToken) clone.accessToken = encrypt(clone.accessToken);
    if (clone.refreshToken) clone.refreshToken = encrypt(clone.refreshToken);
    return clone;
  }

  private decryptSession(session: StoredSession): StoredSession {
    if (session.accessToken) session.accessToken = decrypt(session.accessToken);
    if (session.refreshToken)
      session.refreshToken = decrypt(session.refreshToken);
    return session;
  }

  private cloneSession(session: StoredSession): StoredSession {
    // Session carries methods, so preserve the prototype while copying props.
    return Object.assign(
      Object.create(Object.getPrototypeOf(session)),
      session,
    );
  }
}

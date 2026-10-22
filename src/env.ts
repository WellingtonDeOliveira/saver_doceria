export interface Env {
  DB: D1Database;
  PHOTOS: KVNamespace;
  ASSETS: Fetcher;
  ACCESS_ISSUER: string;
  ACCESS_AUD: string;
  ADMIN_EMAIL: string;
  ADMIN_EMAILS?: string;
  ADMIN_ORIGIN: string;
  PUBLIC_ORIGIN: string;
}

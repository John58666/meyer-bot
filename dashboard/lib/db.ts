import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

// Reutilizar pool en dev para evitar conexiones múltiples con hot-reload
export const pool =
  global.pgPool ||
  new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "meyer_db",
    user: process.env.POSTGRES_USER || "meyer_user",
    password: process.env.POSTGRES_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

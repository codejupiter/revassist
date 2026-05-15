import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

let sql: SqlClient | null = null;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the Postgres deal repository.");
  }

  if (!sql) {
    sql = neon(databaseUrl);
  }

  return sql;
}

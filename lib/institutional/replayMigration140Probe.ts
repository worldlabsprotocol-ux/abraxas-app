// Optional Postgres privilege probe — not bundled for browser; used in readiness + integration tests.

export async function probeMigration140InsertRevoked(): Promise<boolean | null> {
  const url = process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  const pg = await import("pg");
  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query(`DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    const { rows } = await pool.query(
      "SELECT has_table_privilege('service_role', 'public.institutional_eligibility_consume_nonces', 'INSERT') AS allowed",
    );
    return rows[0]?.allowed === false;
  } catch {
    return null;
  } finally {
    await pool.end();
  }
}

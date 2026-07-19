-- Runtime services must never connect as the PostgreSQL bootstrap owner/superuser because
-- superusers bypass row-level security, including FORCE ROW LEVEL SECURITY policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'healthgov_app') THEN
    CREATE ROLE healthgov_app LOGIN PASSWORD 'local-app-only'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

GRANT CONNECT ON DATABASE healthgov TO healthgov_app;
GRANT USAGE ON SCHEMA public TO healthgov_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO healthgov_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO healthgov_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO healthgov_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO healthgov_app;

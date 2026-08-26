-- Provisions a read-only role for the MCP diagnostic server (REQ-047).
-- Idempotent: safe to re-run against a database that already has data,
-- not only against a fresh volume.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mcp_readonly') THEN
    CREATE ROLE mcp_readonly LOGIN PASSWORD 'alta3';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE realworld TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
ALTER ROLE mcp_readonly SET default_transaction_read_only = on;

// Migration runner + v001 initial schema for PostgreSQL storage
import type { Sql } from 'postgres';

export async function runMigrations(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const migrated = await sql<Array<{ version: number }>>`
    SELECT version FROM _migrations ORDER BY version
  `;
  const appliedVersions = new Set(migrated.map((r) => r.version));

  const migrations = [v001InitialSchema, v002Indexes];

  for (const [i, migration] of migrations.entries()) {
    if (!appliedVersions.has(i + 1)) {
      await migration(sql);
      await sql`
        INSERT INTO _migrations (version) VALUES (${i + 1})
      `;
    }
  }
}

async function v001InitialSchema(sql: Sql): Promise<void> {
  // Chats
  await sql`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_shared BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;

  // Messages
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      agents_used JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB
    )
  `;

  // MCP tokens
  await sql`
    CREATE TABLE IF NOT EXISTS mcp_tokens (
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      server_name TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at BIGINT NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (tenant_id, user_id, server_name)
    )
  `;

  // MCP client registrations
  await sql`
    CREATE TABLE IF NOT EXISTS mcp_client_registrations (
      server_name TEXT PRIMARY KEY,
      authorization_endpoint TEXT NOT NULL,
      token_endpoint TEXT NOT NULL,
      client_id TEXT NOT NULL,
      client_secret TEXT,
      created_at BIGINT NOT NULL
    )
  `;

  // Gateway state
  await sql`
    CREATE TABLE IF NOT EXISTS gateway_clients (
      client_id TEXT PRIMARY KEY,
      client_secret TEXT,
      redirect_uris JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS gateway_auth_codes (
      code TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS gateway_tokens (
      access_token TEXT PRIMARY KEY,
      refresh_token TEXT,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Signals
  await sql`
    CREATE TABLE IF NOT EXISTS signals (
      signal_id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Job runs
  await sql`
    CREATE TABLE IF NOT EXISTS job_runs (
      run_id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      trigger_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      run_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Schedules
  await sql`
    CREATE TABLE IF NOT EXISTS schedules (
      schedule_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Agent configs
  await sql`
    CREATE TABLE IF NOT EXISTS agent_configs (
      tenant_id TEXT NOT NULL,
      config_key TEXT NOT NULL,
      config_data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (tenant_id, config_key)
    )
  `;
}

async function v002Indexes(sql: Sql): Promise<void> {
  await sql`CREATE INDEX IF NOT EXISTS idx_chats_tenant_user ON chats(tenant_id, user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(chat_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signals_tenant ON signals(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_job_runs_trigger ON job_runs(trigger_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gateway_tokens_access ON gateway_tokens(access_token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gateway_tokens_refresh ON gateway_tokens(refresh_token)`;
}

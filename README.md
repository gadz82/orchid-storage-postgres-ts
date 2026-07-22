# @orchid-ai/orchid-storage-postgres

PostgreSQL storage backend plugin for the [Orchid AI](https://github.com/gadz82/orchid) framework — TypeScript port of `orchid-storage-postgres`.

## What it provides

PostgreSQL implementations of every framework persistence ABC:

- `OrchidPostgresChatStorage` — chat sessions + messages + conversation summaries
- `OrchidPostgresConfigStorage` — agent configuration CRUD
- `OrchidPostgresMCPTokenStore` — per-server OAuth tokens
- `OrchidPostgresMCPClientRegistrationStore` — RFC 7591 dynamic-client registrations
- `OrchidPostgresMCPGatewayStateStore` — gateway clients / auth codes / tokens
- `PostgresEventStorage` — signal / job / schedule / trigger persistence (events block)
- `PostgresSignalQueue` — durable lease-based queue with `FOR UPDATE SKIP LOCKED` + `pg_notify`
- PostgreSQL LangGraph checkpointer (registered as `postgres` type)
- A unified v001 migration that provisions every framework-owned table in one pass

## Installation

```bash
npm install @orchid-ai/orchid-storage-postgres
```

## Usage

Reference the classes in your `orchid.yml`:

```yaml
storage:
  class: "@orchid-ai/orchid-storage-postgres/chatStorage"
  dsn: postgresql://user:pass@localhost:5432/orchid

config_storage:
  enabled: true
  class: "@orchid-ai/orchid-storage-postgres/configStorage"
  dsn: postgresql://user:pass@localhost:5432/orchid

checkpointer:
  type: postgres
  dsn: postgresql://user:pass@localhost:5432/orchid
```

For MCP gateway / OAuth deployments, add:

```yaml
mcp_token_store:
  class: "@orchid-ai/orchid-storage-postgres/mcpTokenStore"
  dsn: postgresql://user:pass@localhost:5432/orchid

mcp_client_registration_store:
  class: "@orchid-ai/orchid-storage-postgres/mcpClientRegistrationStore"
  dsn: postgresql://user:pass@localhost:5432/orchid

mcp_gateway_state_store:
  class: "@orchid-ai/orchid-storage-postgres/mcpGatewayStateStore"
  dsn: postgresql://user:pass@localhost:5432/orchid
```

Or programmatically:

```ts
import { OrchidPostgresChatStorage } from "@orchid-ai/orchid-storage-postgres";

const storage = new OrchidPostgresChatStorage({
  dsn: "postgresql://user:pass@localhost:5432/orchid",
});
await storage.initDb();
```

## Auto-registration

The package registers itself via the `orchid` key in `package.json`:

```json
{
  "orchid": {
    "storageBackends": "./dist/index.js"
  }
}
```

No manual `registerChatStorage()` calls are needed by integrators.

## Schema ownership

The single `v001InitialSchema` migration creates **all** framework tables (chat, MCP, events, agent_configs, conversation_summaries) in one pass. All store classes share the same migration runner, so it does not matter which class triggers `initDb()` first; subsequent calls become no-ops thanks to `CREATE TABLE IF NOT EXISTS`.

## Development

```bash
cd orchid-storage-postgres-ts
npm install
npm test
npm run lint
npm run typecheck
```

Tests mock `postgres` (porsager) — no live PostgreSQL required.

## License

MIT

# orchid-storage-postgres-ts — AI Context

## What This Package Is

**`@orchid-ai/orchid-storage-postgres`** is the PostgreSQL storage plugin for the Orchid multi-agent AI framework — the
TypeScript port of the Python `orchid-storage-postgres` package. It provides PostgreSQL implementations of ALL framework
persistence ABCs. It imports `@orchid-ai/orchid` as a workspace dependency.

## Package Structure

```
orchid-storage-postgres-ts/
  src/
    index.ts
    chatStorage.ts
    configStorage.ts
    mcpTokenStore.ts
    mcpClientRegistrationStore.ts
    mcpGatewayStateStore.ts
    eventStorage.ts
    eventQueue.ts
    visibility.ts
    migrations/
      runner.ts
      v001InitialSchema.ts
  tests/
  package.json
```

## Architecture Rules

1. **This is a plugin package.** It implements ABCs defined in `@orchid-ai/orchid/core`. It must NOT contain agent
   logic, graph building, or API endpoints.
2. **Auto-registration via package.json `orchid` key.** The package declares its registration functions under the
   `"orchid"` field.
3. **No vendor-specific code in comments.** Use domain-neutral placeholders.
4. **Dependencies:** Only `@orchid-ai/orchid` (workspace) and `postgres` (porsager driver).
5. **Tests mock external services.** No live database dependencies in unit tests. PostgreSQL service container available
   for optional integration tests in CI.

## Python Reference

This is a 1:1 port of `orchid-storage-postgres/`. The authoritative reference is:

- `orchid-workspace/orchid-storage-postgres/` — read source files there

## Key Patterns

### Registration

```ts
// src/index.ts
import { registerChatStorage } from '@orchid-ai/orchid/persistence';
import { OrchidPostgresChatStorage } from './chatStorage.js';

export { OrchidPostgresChatStorage };

export function register() {
  registerChatStorage('postgres', (settings) => new OrchidPostgresChatStorage(settings));
}
```

```json
// package.json
{
  "orchid": {
    "storageBackends": "./dist/index.js"
  }
}
```

## Persistence ABCs Implemented

| ABC                                            | Implementation                             | Purpose                                      |
|------------------------------------------------|--------------------------------------------|----------------------------------------------|
| `OrchidChatStorage`                            | `OrchidPostgresChatStorage`                | Chat session + message persistence           |
| `OrchidConfigStorage`                          | `OrchidPostgresConfigStorage`              | DB-backed agent config                       |
| `OrchidMCPTokenStore`                          | `OrchidPostgresMCPTokenStore`              | Per-user OAuth tokens                        |
| `OrchidMCPClientRegistrationStore`             | `OrchidPostgresMCPClientRegistrationStore` | Per-server DCR creds                         |
| `OrchidMCPGateway{Client,AuthCode,Token}Store` | Single store implementing all three        | Inbound gateway state                        |
| `PostgresEventStorage`                         | EventStorage                               | Pollen+Bloom signals/jobs/schedules/triggers |
| `PostgresSignalQueue`                          | EventQueue                                 | Durable lease-based queue                    |

## Testing

```bash
cd orchid-storage-postgres-ts
npm install
npm test
npm run lint
npm run typecheck
```

## Common Pitfalls

- Uses `$1..$N` positional params (same as Python's `asyncpg`).
- Migration DDL should be shared with the Python version for schema parity.
- Visibility filter builds per-tenant WHERE clauses — never hardcode tenant scope.

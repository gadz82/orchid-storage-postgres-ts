// PostgreSQL MCP gateway state store — 3-in-1
import type { Sql } from 'postgres';
import { randomUUID } from 'node:crypto';

export class OrchidPostgresMCPGatewayStateStore {
  constructor(private sql: Sql) {}

  async initDb(): Promise<void> {}
  async close(): Promise<void> {}

  async registerClient(client: {
    clientId: string;
    clientSecret?: string;
    redirectUris: string[];
  }): Promise<{ clientId: string }> {
    const id = client.clientId || randomUUID();
    await this.sql`
      INSERT INTO gateway_clients (client_id, client_secret, redirect_uris)
      VALUES (${id}, ${client.clientSecret ?? null}, ${client.redirectUris as unknown as never})
      ON CONFLICT (client_id) DO UPDATE SET redirect_uris = EXCLUDED.redirect_uris
    `;
    return { clientId: id };
  }

  async getClient(clientId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql<Record<string, unknown>[]>`SELECT * FROM gateway_clients WHERE client_id = ${clientId}`;
    return rows.length > 0 ? rows[0]! : null;
  }

  async insertAuthCode(code: string, data: Record<string, unknown>): Promise<void> {
    await this.sql`
      INSERT INTO gateway_auth_codes (code, data, created_at)
      VALUES (${code}, ${data as unknown as never}, NOW())
    `;
  }

  async getAuthCode(code: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql<
      Array<{ data: Record<string, unknown> }>
    >`SELECT data FROM gateway_auth_codes WHERE code = ${code}`;
    return rows.length > 0 ? rows[0]!.data : null;
  }

  async consumeAuthCode(code: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql<
      Array<{ data: Record<string, unknown> }>
    >`DELETE FROM gateway_auth_codes WHERE code = ${code} RETURNING data`;
    return rows.length > 0 ? rows[0]!.data : null;
  }

  async insertToken(
    accessToken: string,
    refreshToken: string | undefined,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.sql`
      INSERT INTO gateway_tokens (access_token, refresh_token, data, created_at)
      VALUES (${accessToken}, ${refreshToken ?? null}, ${data as unknown as never}, NOW())
    `;
  }

  async introspectToken(token: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql<Array<{ data: Record<string, unknown> }>>`
      SELECT data FROM gateway_tokens WHERE access_token = ${token} OR refresh_token = ${token}
    `;
    return rows.length > 0 ? rows[0]!.data : null;
  }

  async revokeToken(accessToken: string): Promise<boolean> {
    const result = await this.sql`DELETE FROM gateway_tokens WHERE access_token = ${accessToken}`;
    return (result as { count: number }).count > 0;
  }
}

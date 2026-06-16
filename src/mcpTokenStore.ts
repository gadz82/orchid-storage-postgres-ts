// PostgreSQL MCP token store
import type { Sql } from 'postgres';

import { OrchidMCPTokenRecord } from '@orchid-ai/orchid/core';

export class OrchidPostgresMCPTokenStore {
  constructor(private sql: Sql) {}

  async initDb(): Promise<void> {}
  async close(): Promise<void> {}

  async getToken(tenantId: string, userId: string, serverName: string): Promise<OrchidMCPTokenRecord | null> {
    const rows = await this.sql<
      Array<{
        server_name: string;
        tenant_id: string;
        user_id: string;
        access_token: string;
        refresh_token: string | null;
        expires_at: number;
        scopes: string;
        created_at: number;
        updated_at: number;
      }>
    >`
      SELECT * FROM mcp_tokens WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND server_name = ${serverName}
    `;
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return new OrchidMCPTokenRecord({
      serverName: r.server_name,
      tenantId: r.tenant_id,
      userId: r.user_id,
      accessToken: r.access_token,
      refreshToken: r.refresh_token || '',
      expiresAt: r.expires_at,
      scopes: r.scopes || '',
    });
  }

  async saveToken(record: OrchidMCPTokenRecord): Promise<void> {
    await this.sql`
      INSERT INTO mcp_tokens (tenant_id, user_id, server_name, access_token, refresh_token, expires_at, scopes, created_at, updated_at)
      VALUES (${record.tenantId}, ${record.userId}, ${record.serverName}, ${record.accessToken}, ${record.refreshToken || ''}, ${record.expiresAt}, ${record.scopes || ''}, ${record.createdAt || Math.floor(Date.now() / 1000)}, ${record.updatedAt || Math.floor(Date.now() / 1000)})
      ON CONFLICT (tenant_id, user_id, server_name)
      DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token, expires_at = EXCLUDED.expires_at, scopes = EXCLUDED.scopes, updated_at = EXCLUDED.updated_at
    `;
  }

  async deleteToken(tenantId: string, userId: string, serverName: string): Promise<boolean> {
    const result = await this
      .sql`DELETE FROM mcp_tokens WHERE tenant_id = ${tenantId} AND user_id = ${userId} AND server_name = ${serverName}`;
    return (result as { count: number }).count > 0;
  }

  async listTokens(tenantId: string, userId: string): Promise<OrchidMCPTokenRecord[]> {
    const rows = await this.sql<
      Array<{
        server_name: string;
        tenant_id: string;
        user_id: string;
        access_token: string;
        refresh_token: string | null;
        expires_at: number;
        scopes: string;
        created_at: number;
        updated_at: number;
      }>
    >`
      SELECT * FROM mcp_tokens WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    `;
    return rows.map(
      (r) =>
        new OrchidMCPTokenRecord({
          serverName: r.server_name,
          tenantId: r.tenant_id,
          userId: r.user_id,
          accessToken: r.access_token,
          refreshToken: r.refresh_token || '',
          expiresAt: r.expires_at,
          scopes: r.scopes || '',
        }),
    );
  }

  async cleanupExpired(before?: number): Promise<number> {
    const cutoff = before ?? Math.floor(Date.now() / 1000);
    const result = await this.sql`DELETE FROM mcp_tokens WHERE expires_at < ${cutoff} AND expires_at > 0`;
    return (result as { count: number }).count;
  }
}

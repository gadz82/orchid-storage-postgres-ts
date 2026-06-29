// PostgreSQL MCP client registration store
import postgres from 'postgres';
import type { Sql } from 'postgres';

import { OrchidMCPClientRegistration } from '@orchid-ai/orchid/core';

import { runMigrations } from './migrations/v001InitialSchema.js';

export class OrchidPostgresMCPClientRegistrationStore {
  private sql: Sql;

  constructor(sql: Sql);
  constructor(opts: { dsn: string });
  constructor(opts: Sql | { dsn: string }) {
    if (opts && typeof opts === 'object' && 'dsn' in opts && typeof opts.dsn === 'string') {
      this.sql = postgres(opts.dsn);
    } else {
      this.sql = opts as Sql;
    }
  }

  async initDb(): Promise<void> {
    await runMigrations(this.sql);
  }

  async close(): Promise<void> {
    await this.sql.end();
  }

  async get(serverName: string): Promise<OrchidMCPClientRegistration | null> {
    const rows = await this.sql<
      Array<{
        server_name: string;
        authorization_endpoint: string;
        token_endpoint: string;
        registration_endpoint: string;
        issuer: string;
        scopes_supported: string;
        token_endpoint_auth_methods_supported: string;
        client_id: string;
        client_secret: string;
        client_id_issued_at: number;
        client_secret_expires_at: number;
        created_at: number;
        updated_at: number;
      }>
    >`
      SELECT * FROM mcp_client_registrations WHERE server_name = ${serverName}
    `;
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return new OrchidMCPClientRegistration({
      serverName: r.server_name,
      authorizationEndpoint: r.authorization_endpoint,
      tokenEndpoint: r.token_endpoint,
      registrationEndpoint: r.registration_endpoint,
      issuer: r.issuer,
      scopesSupported: r.scopes_supported,
      tokenEndpointAuthMethodsSupported: r.token_endpoint_auth_methods_supported,
      clientId: r.client_id,
      clientSecret: r.client_secret,
      clientIdIssuedAt: r.client_id_issued_at,
      clientSecretExpiresAt: r.client_secret_expires_at,
    });
  }

  async save(record: OrchidMCPClientRegistration): Promise<void> {
    await this.sql`
      INSERT INTO mcp_client_registrations (server_name, authorization_endpoint, token_endpoint, registration_endpoint, issuer, scopes_supported, token_endpoint_auth_methods_supported, client_id, client_secret, client_id_issued_at, client_secret_expires_at, created_at, updated_at)
      VALUES (${record.serverName}, ${record.authorizationEndpoint}, ${record.tokenEndpoint}, ${record.registrationEndpoint}, ${record.issuer}, ${record.scopesSupported}, ${record.tokenEndpointAuthMethodsSupported}, ${record.clientId}, ${record.clientSecret}, ${record.clientIdIssuedAt}, ${record.clientSecretExpiresAt}, ${record.createdAt || Math.floor(Date.now() / 1000)}, ${record.updatedAt || Math.floor(Date.now() / 1000)})
      ON CONFLICT (server_name) DO UPDATE SET
        authorization_endpoint = EXCLUDED.authorization_endpoint,
        token_endpoint = EXCLUDED.token_endpoint,
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async delete(serverName: string): Promise<boolean> {
    const result = await this.sql`DELETE FROM mcp_client_registrations WHERE server_name = ${serverName}`;
    return (result as { count: number }).count > 0;
  }
}

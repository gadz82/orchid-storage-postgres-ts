// PostgreSQL config storage
import type { Sql } from 'postgres';

export class OrchidPostgresConfigStorage {
  constructor(private sql: Sql) {}

  async initDb(): Promise<void> {}
  async close(): Promise<void> {}

  async saveConfig(tenantId: string, configKey: string, configData: Record<string, unknown>): Promise<void> {
    await this.sql`
      INSERT INTO agent_configs (tenant_id, config_key, config_data, updated_at)
      VALUES (${tenantId}, ${configKey}, ${configData as unknown as never}, NOW())
      ON CONFLICT (tenant_id, config_key)
      DO UPDATE SET config_data = EXCLUDED.config_data, updated_at = NOW()
    `;
  }

  async loadConfig(tenantId: string, configKey: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql<Array<{ config_data: Record<string, unknown> }>>`
      SELECT config_data FROM agent_configs WHERE tenant_id = ${tenantId} AND config_key = ${configKey}
    `;
    return rows.length > 0 ? rows[0]!.config_data : null;
  }

  async deleteConfig(tenantId: string, configKey: string): Promise<void> {
    await this.sql`DELETE FROM agent_configs WHERE tenant_id = ${tenantId} AND config_key = ${configKey}`;
  }
}

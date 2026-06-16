// PostgreSQL event storage
import type { Sql } from 'postgres';

export class PostgresEventStorage {
  constructor(private sql: Sql) {}

  async initDb(): Promise<void> {}
  async close(): Promise<void> {}

  async saveSignal(signal: Record<string, unknown>): Promise<string> {
    const rows = await this.sql<Array<{ signal_id: string }>>`
      INSERT INTO signals (tenant_id, topic, payload, created_at)
      VALUES (${signal['tenant_id'] as string}, ${signal['topic'] as string}, ${signal['payload'] as unknown as never}, NOW())
      RETURNING signal_id
    `;
    return rows[0]!.signal_id;
  }

  async listSignals(tenantId: string, limit = 50): Promise<Record<string, unknown>[]> {
    return this.sql`SELECT * FROM signals WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit}`;
  }

  async getSignal(signalId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql<Record<string, unknown>[]>`SELECT * FROM signals WHERE signal_id = ${signalId}`;
    return rows.length > 0 ? rows[0]! : null;
  }

  async saveJobRun(run: Record<string, unknown>): Promise<string> {
    const rows = await this.sql<Array<{ run_id: string }>>`
      INSERT INTO job_runs (trigger_id, status, run_data, created_at)
      VALUES (${run['trigger_id'] as string}, ${(run['status'] as string) || 'pending'}, ${run as unknown as never}, NOW())
      RETURNING run_id
    `;
    return rows[0]!.run_id;
  }

  async listJobRuns(triggerId: string, limit = 50): Promise<Record<string, unknown>[]> {
    return this.sql`SELECT * FROM job_runs WHERE trigger_id = ${triggerId} ORDER BY created_at DESC LIMIT ${limit}`;
  }

  async updateJobRun(runId: string, updates: Record<string, unknown>): Promise<void> {
    await this.sql`
      UPDATE job_runs SET status = ${(updates['status'] as string) || 'running'}, run_data = ${updates as unknown as never}, updated_at = NOW()
      WHERE run_id = ${runId}
    `;
  }

  async listSchedules(tenantId: string): Promise<Record<string, unknown>[]> {
    return this.sql`SELECT * FROM schedules WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
  }

  async saveSchedule(schedule: Record<string, unknown>): Promise<void> {
    await this.sql`
      INSERT INTO schedules (tenant_id, schedule_id, cron_expression, enabled, config, created_at)
      VALUES (${schedule['tenant_id'] as string}, ${schedule['schedule_id'] as string}, ${schedule['cron_expression'] as string}, ${schedule['enabled'] as boolean}, ${schedule as unknown as never}, NOW())
    `;
  }

  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<void> {
    await this.sql`UPDATE schedules SET enabled = ${enabled}, updated_at = NOW() WHERE schedule_id = ${scheduleId}`;
  }
}

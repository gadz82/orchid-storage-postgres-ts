// PostgreSQL chat storage — extends OrchidChatStorage ABC
import postgres from 'postgres';
import type { Sql } from 'postgres';
import { randomUUID } from 'node:crypto';

import { OrchidChatStorage, type ChatSession, type Message } from '@orchid-ai/orchid/persistence';

import { runMigrations } from './migrations/v001InitialSchema.js';

export class OrchidPostgresChatStorage extends OrchidChatStorage {
  private sql: Sql;

  constructor(sql: Sql);
  constructor(opts: { dsn: string });
  constructor(opts: Sql | { dsn: string }) {
    super();
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

  async createChat(tenantId: string, userId: string, title = 'New chat'): Promise<ChatSession> {
    const id = randomUUID();
    const now = new Date();
    await this.sql`
      INSERT INTO chats (id, tenant_id, user_id, title, created_at, updated_at)
      VALUES (${id}, ${tenantId}, ${userId}, ${title}, ${now}, ${now})
    `;
    return { id, title, tenantId, userId, createdAt: now, updatedAt: now, isShared: false };
  }

  async listChats(tenantId: string, userId: string): Promise<ChatSession[]> {
    const rows = await this.sql<
      Array<{
        id: string;
        title: string;
        tenant_id: string;
        user_id: string;
        created_at: Date;
        updated_at: Date;
        is_shared: boolean;
      }>
    >`
      SELECT id, title, tenant_id, user_id, created_at, updated_at, is_shared
      FROM chats WHERE tenant_id = ${tenantId} AND user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      tenantId: r.tenant_id,
      userId: r.user_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isShared: r.is_shared,
    }));
  }

  async getChat(chatId: string): Promise<ChatSession | null> {
    const rows = await this.sql<
      Array<{
        id: string;
        title: string;
        tenant_id: string;
        user_id: string;
        created_at: Date;
        updated_at: Date;
        is_shared: boolean;
      }>
    >`
      SELECT id, title, tenant_id, user_id, created_at, updated_at, is_shared FROM chats WHERE id = ${chatId}
    `;
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      id: r.id,
      title: r.title,
      tenantId: r.tenant_id,
      userId: r.user_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isShared: r.is_shared,
    };
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.sql`DELETE FROM messages WHERE chat_id = ${chatId}`;
    await this.sql`DELETE FROM chats WHERE id = ${chatId}`;
  }

  async updateTitle(chatId: string, title: string): Promise<void> {
    await this.sql`UPDATE chats SET title = ${title}, updated_at = NOW() WHERE id = ${chatId}`;
  }

  async markShared(chatId: string): Promise<void> {
    await this.sql`UPDATE chats SET is_shared = TRUE WHERE id = ${chatId}`;
  }

  async addMessage(
    chatId: string,
    role: string,
    content: string,
    agentsUsed?: string[],
    metadata?: Record<string, unknown>,
  ): Promise<Message> {
    const id = randomUUID();
    const now = new Date();
    const meta = metadata || {};
    await this.sql`
      INSERT INTO messages (id, chat_id, role, content, agents_used, created_at, metadata)
      VALUES (${id}, ${chatId}, ${role}, ${content}, ${(agentsUsed || []) as unknown as never}, ${now}, ${meta as unknown as never})
    `;
    return { id, chatId, role, content, agentsUsed: agentsUsed || [], createdAt: now, metadata: meta };
  }

  async getMessages(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
    const rows = await this.sql<
      Array<{
        id: string;
        role: string;
        content: string;
        agents_used: string[];
        created_at: Date;
        metadata: Record<string, unknown> | null;
      }>
    >`
      SELECT id, role, content, agents_used, created_at, metadata
      FROM messages WHERE chat_id = ${chatId} ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}
    `;
    return rows.map((r) => ({
      id: r.id,
      chatId,
      role: r.role,
      content: r.content,
      agentsUsed: r.agents_used,
      createdAt: r.created_at,
      metadata: r.metadata || {},
    }));
  }
}

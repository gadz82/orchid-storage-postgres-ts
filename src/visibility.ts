// Visibility filter builder — per-tenant WHERE clause generation

export function buildVisibilityClause(
  _sql: unknown,
  tenantId: string,
  userId?: string,
  roles?: string[],
): { clause: string; params: unknown[] } {
  if (roles?.includes('admin')) {
    return { clause: 'tenant_id = ?', params: [tenantId] };
  }
  if (userId) {
    return { clause: 'tenant_id = ? AND user_id = ?', params: [tenantId, userId] };
  }
  return { clause: 'tenant_id = ?', params: [tenantId] };
}

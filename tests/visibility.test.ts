import { describe, it, expect } from 'vitest';
import { buildVisibilityClause } from '../src/visibility.js';

describe('buildVisibilityClause', () => {
  it('generates clause for admin role', () => {
    const result = buildVisibilityClause(null, 't1', 'u1', ['admin']);
    expect(result.clause).toBe('tenant_id = ?');
    expect(result.params).toEqual(['t1']);
  });

  it('generates clause for regular user', () => {
    const result = buildVisibilityClause(null, 't1', 'u1', []);
    expect(result.clause).toBe('tenant_id = ? AND user_id = ?');
    expect(result.params).toEqual(['t1', 'u1']);
  });

  it('generates tenant-only clause with no userId', () => {
    const result = buildVisibilityClause(null, 't1');
    expect(result.clause).toBe('tenant_id = ?');
    expect(result.params).toEqual(['t1']);
  });
});

import { generateId } from '../generateId';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique values across multiple calls', () => {
    const ids = new Set(Array.from({ length: 50 }, generateId));
    expect(ids.size).toBe(50);
  });

  it('contains a hyphen separator', () => {
    const id = generateId();
    expect(id).toContain('-');
  });
});

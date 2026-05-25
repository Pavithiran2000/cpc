import { toSnake, transform } from '../src/common/interceptors/snake-case.interceptor';

describe('toSnake', () => {
  it('converts simple camelCase', () => {
    expect(toSnake('tenantId')).toBe('tenant_id');
    expect(toSnake('shiftSessionId')).toBe('shift_session_id');
    expect(toSnake('createdAt')).toBe('created_at');
  });

  it('handles acronyms correctly', () => {
    expect(toSnake('URLValue')).toBe('url_value');
    expect(toSnake('ID')).toBe('id');
    expect(toSnake('userID')).toBe('user_id');
    expect(toSnake('parseURLParam')).toBe('parse_url_param');
  });

  it('leaves already snake_case strings unchanged', () => {
    expect(toSnake('already_snake')).toBe('already_snake');
    expect(toSnake('simple')).toBe('simple');
  });
});

describe('transform', () => {
  it('converts object keys to snake_case recursively', () => {
    const result = transform({ tenantId: '1', shiftSessionId: '2' });
    expect(result).toEqual(expect.objectContaining({ tenant_id: '1', shift_session_id: '2' }));
  });

  it('converts nested objects', () => {
    const result = transform({ outerKey: { innerKey: 42 } }) as Record<string, unknown>;
    expect((result['outer_key'] as Record<string, unknown>)['inner_key']).toBe(42);
  });

  it('converts arrays of objects', () => {
    const result = transform([{ myValue: 1 }, { myValue: 2 }]) as unknown[];
    expect(result).toEqual([{ my_value: 1 }, { my_value: 2 }]);
  });

  it('preserves Date instances', () => {
    const date = new Date('2026-01-01');
    expect(transform({ createdAt: date })).toEqual(expect.objectContaining({ created_at: date }));
  });

  it('passes through null and undefined', () => {
    expect(transform(null)).toBeNull();
    expect(transform(undefined)).toBeUndefined();
  });

  it('skips __proto__ key to prevent prototype pollution', () => {
    const result = transform({ __proto__: { evil: true }, safe: 1 }) as Record<string, unknown>;
    expect(result['__proto__']).toBeUndefined();
    expect(result['safe']).toBe(1);
  });

  it('skips constructor key to prevent prototype pollution', () => {
    const result = transform({ constructor: 'bad', safe: 1 }) as Record<string, unknown>;
    expect(result['constructor']).toBeUndefined();
    expect(result['safe']).toBe(1);
  });

  it('skips prototype key to prevent prototype pollution', () => {
    const result = transform({ prototype: 'bad', safe: 1 }) as Record<string, unknown>;
    expect(result['prototype']).toBeUndefined();
    expect(result['safe']).toBe(1);
  });

  it('uses null-prototype output object', () => {
    const result = transform({ a: 1 });
    expect(Object.getPrototypeOf(result)).toBeNull();
  });
});

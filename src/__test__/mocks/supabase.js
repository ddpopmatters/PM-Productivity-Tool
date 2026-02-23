import { vi } from 'vitest';

/**
 * Chainable mock Supabase client factory.
 * Mimics the PostgREST query builder pattern:
 *   supabase.from('table').select('*').eq('id', 1)
 */
export function createMockSupabase(overrides = {}) {
  const defaultResult = { data: [], error: null };

  function createChain(terminalResult = defaultResult) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(terminalResult),
      maybeSingle: vi.fn().mockResolvedValue(terminalResult),
      then: vi.fn((resolve) => resolve(terminalResult)),
    };

    // Make the chain itself thenable (for await support)
    chain[Symbol.for('nodejs.util.promisify.custom')] = () =>
      Promise.resolve(terminalResult);

    // Allow `await supabase.from(...).select(...)` etc.
    Object.defineProperty(chain, 'then', {
      value: (resolve, reject) => Promise.resolve(terminalResult).then(resolve, reject),
      writable: true,
    });

    return chain;
  }

  const fromMap = new Map();

  const client = {
    from: vi.fn((table) => {
      if (fromMap.has(table)) return fromMap.get(table);
      return createChain();
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      ...overrides.auth,
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      ...overrides.storage,
    },

    // Helpers for test setup
    _mockTable(table, result) {
      fromMap.set(table, createChain(result));
      return client;
    },
    _createChain: createChain,
  };

  return client;
}

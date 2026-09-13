// Vitest stub for Wix Velo wix-data module (not available in Node test runtime).

export default {
  insert: async (_collection, record) => ({ ...record, _id: "wix_mock_id" }),
  get: async () => null,
  update: async () => null,
  remove: async () => null,
  query: () => ({
    eq: () => ({
      limit: () => ({
        find: async () => ({ items: [] }),
      }),
    }),
    le: () => ({
      find: async () => ({ items: [] }),
    }),
  }),
};

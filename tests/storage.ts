export const storageControls = { failWrites: false };
const data = new Map<string, string>();
export default {
  getItem: async (key: string) => data.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    if (storageControls.failWrites) throw new Error("Disk unavailable");
    data.set(key, value);
  },
  removeItem: async (key: string) => {
    data.delete(key);
  },
};

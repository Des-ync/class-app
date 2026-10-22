import { StateStorage } from "zustand/middleware";

// Coalesce snapshots while serializing writes. Failed writes stay in memory for
// explicit/background retry; a late disk write can never overwrite newer state.
export function createResilientStorage(
  base: StateStorage,
  report: (message: string | null) => void,
) {
  const pending = new Map<string, string>();
  let running: Promise<boolean> | null = null;
  let readBlocked = false;
  const warning =
    "Recent changes are saved in memory only. Local storage is unavailable; retrying automatically.";
  async function drain(): Promise<boolean> {
    if (readBlocked) return false;
    while (pending.size) {
      const [key, value] = pending.entries().next().value!;
      try {
        await base.setItem(key, value);
      } catch {
        report(warning);
        return false;
      }
      if (pending.get(key) === value) pending.delete(key);
    }
    report(null);
    return true;
  }
  function flush(): Promise<boolean> {
    if (running) return running;
    running = drain().finally(() => {
      running = null;
    });
    return running;
  }
  const storage: StateStorage = {
    async getItem(key) {
      if (!readBlocked && pending.has(key)) return pending.get(key)!;
      try {
        const raw = await base.getItem(key);
        if (raw !== null) JSON.parse(raw);
        readBlocked = false;
        return raw;
      } catch (error) {
        readBlocked = true;
        report(
          "Local storage could not be read. Disk writes are paused to protect saved data; current changes remain in memory.",
        );
        throw error;
      }
    },
    setItem(key, value) {
      pending.set(key, value);
      return flush().then(() => {});
    },
    async removeItem(key) {
      await flush();
      pending.delete(key);
      await base.removeItem(key);
    },
  };
  return { storage, flush, hasPending: () => pending.size > 0 };
}

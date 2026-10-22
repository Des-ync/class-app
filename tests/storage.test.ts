import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createResilientStorage } from "../services/storage";

test("storage serializes delayed writes and coalesces to the newest optimistic snapshot", async () => {
  let release!: () => void;
  const barrier = new Promise<void>((r) => {
    release = r;
  });
  const writes: string[] = [];
  let concurrent = 0,
    max = 0,
    disk = "";
  const storage = createResilientStorage(
    {
      getItem: async () => disk,
      setItem: async (_key, value) => {
        concurrent++;
        max = Math.max(max, concurrent);
        writes.push(value);
        if (writes.length === 1) await barrier;
        disk = value;
        concurrent--;
      },
      removeItem: async () => {},
    },
    () => {},
  );
  const first = storage.storage.setItem("state", '{"n":1}');
  const second = storage.storage.setItem("state", '{"n":2}');
  const third = storage.storage.setItem("state", '{"n":3}');
  assert.equal(await storage.storage.getItem("state"), '{"n":3}');
  release();
  await Promise.all([first, second, third]);
  assert.equal(disk, '{"n":3}');
  assert.equal(max, 1);
  assert.deepEqual(writes, ['{"n":1}', '{"n":3}']);
  assert.equal(storage.hasPending(), false);
});
test("storage failure preserves the newest snapshot, reports unsaved changes and recovers on retry", async () => {
  let offline = true,
    disk = "";
  const reports: (string | null)[] = [];
  const resilient = createResilientStorage(
    {
      getItem: async () => disk,
      setItem: async (_key, value) => {
        if (offline) throw new Error("disk unavailable");
        disk = value;
      },
      removeItem: async () => {},
    },
    (message) => reports.push(message),
  );
  await resilient.storage.setItem("state", '{"boarded":true}');
  assert.equal(resilient.hasPending(), true);
  assert.match(reports.at(-1)!, /memory only/);
  await resilient.storage.setItem("state", '{"boarded":true,"receipt":1}');
  offline = false;
  assert.equal(await resilient.flush(), true);
  assert.equal(disk, '{"boarded":true,"receipt":1}');
  assert.equal(reports.at(-1), null);
});
test("unreadable or corrupt saved data is never overwritten by hydration defaults", async () => {
  let unreadable = true,
    disk = "{broken",
    writes = 0;
  const resilient = createResilientStorage(
    {
      getItem: async () => {
        if (unreadable) throw new Error("disk unavailable");
        return disk;
      },
      setItem: async (_key, value) => {
        writes++;
        disk = value;
      },
      removeItem: async () => {},
    },
    () => {},
  );
  await assert.rejects(async () => resilient.storage.getItem("state"));
  await resilient.storage.setItem("state", '{"defaults":true}');
  assert.equal(writes, 0);
  unreadable = false;
  await assert.rejects(async () => resilient.storage.getItem("state"));
  assert.equal(writes, 0);
  assert.equal(disk, "{broken");
  disk = '{"restored":true}';
  assert.equal(await resilient.storage.getItem("state"), disk);
  await resilient.flush();
  assert.equal(writes, 1);
});

test("an idle flush cannot strand a write started in the same event-loop turn", async () => {
  let disk = "";
  const resilient = createResilientStorage(
    {
      getItem: async () => disk,
      setItem: async (_key, value) => {
        disk = value;
      },
      removeItem: async () => {},
    },
    () => {},
  );
  const idle = resilient.flush();
  const write = resilient.storage.setItem("state", '{"boarded":true}');
  await Promise.all([idle, write]);
  assert.equal(disk, '{"boarded":true}');
  assert.equal(resilient.hasPending(), false);
});
test("snapshots queued while clearing a storage warning are drained before flush succeeds", async () => {
  let disk = "",
    offline = true,
    recovered = false;
  const resilient = createResilientStorage(
    {
      getItem: async () => disk,
      setItem: async (_key, value) => {
        if (offline) throw new Error("offline");
        disk = value;
      },
      removeItem: async () => {},
    },
    (message) => {
      if (message === null && !recovered) {
        recovered = true;
        void resilient.storage.setItem("state", '{"warningCleared":true}');
      }
    },
  );
  await resilient.storage.setItem("state", '{"boarded":true}');
  offline = false;
  assert.equal(await resilient.flush(), true);
  assert.equal(disk, '{"warningCleared":true}');
  assert.equal(resilient.hasPending(), false);
});

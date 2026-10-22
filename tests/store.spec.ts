import { test } from "node:test";
import { strict as assert } from "node:assert";
import { useShuttleStore } from "../store/useShuttleStore";
import { passToken } from "../services/api";
const current = () => useShuttleStore.getState();
test("driver boarding updates commuter status and persists an activity event", async () => {
  await useShuttleStore.persist.rehydrate();
  current().reset();
  current().loginDemo("commuter", "Worker");
  const rider = current().riders.find((r) => r.id === "r2")!;
  current().switchRole("driver");
  current().notify(rider.stopId);
  current().scan(passToken(rider));
  current().switchRole("commuter");
  assert.equal(
    current().riders.find((r) => r.id === "r2")!.statuses.morning,
    "Boarded",
  );
  assert.ok(
    current().activity.some(
      (a) => a.riderId === "r2" && a.title.includes("Boarded"),
    ),
  );
  const count = current().activity.length;
  current().scan(passToken(rider));
  assert.equal(current().activity.length, count);
  await useShuttleStore.persist.rehydrate();
  assert.equal(
    current().riders.find((r) => r.id === "r2")!.statuses.morning,
    "Boarded",
  );
});
test("absent passengers cannot board and trip completion distinguishes skipped riders", () => {
  current().reset();
  current().loginDemo("commuter", "Student");
  current().markAbsent();
  assert.throws(() => current().passengerStatus("r1", "Boarded"), /absent/);
  current().passengerStatus("r2", "Boarded");
  current().endTrip();
  assert.equal(
    current().riders.find((r) => r.id === "r2")!.statuses.morning,
    "Completed",
  );
  assert.equal(
    current().riders.find((r) => r.id === "r3")!.statuses.morning,
    "Skipped",
  );
  assert.equal(current().riders[0].statuses.morning, "Absent");
});
test("home pickup needs a valid address and VIP subscription before boarding", () => {
  current().reset();
  current().loginDemo("commuter", "Worker");
  const rider = current().riders.find((r) => r.id === "r2")!;
  const booking = {
    routeId: rider.routeId,
    stopId: rider.stopId,
    pickup: "home" as const,
    address: "short",
    morning: rider.morning,
    evening: rider.evening,
  };
  assert.throws(() => current().configure(booking), /address/);
  current().configure({ ...booking, address: "14 Mango Lane, East Legon" });
  assert.throws(
    () => current().passengerStatus("r2", "Boarded"),
    /Doorstep VIP/,
  );
});
test("day rollover resets attendance while preserving billing and saved schedules", () => {
  current().reset();
  current().loginDemo("commuter", "Student");
  current().setEvening("06:30 PM");
  current().markAbsent();
  useShuttleStore.setState({ serviceDay: "2000-01-01" });
  current().tick();
  assert.equal(current().riders[0].statuses.morning, "Waiting");
  assert.equal(current().riders[0].evening, "06:30 PM");
  assert.ok(current().riders[0].subscription);
});

const payment = { planId: "worker", method: "MTN MoMo", account: "0241234567" };
test("concurrent duplicate checkout and persisted retries activate only one payment", async () => {
  current().reset();
  current().loginDemo("commuter", "Worker");
  const before = current().riders[1].subscription!.end;
  const first = current().checkout({ ...payment, requestId: "retry-safe" });
  const duplicate = current().checkout({ ...payment, requestId: "retry-safe" });
  assert.equal(first, duplicate);
  await assert.rejects(
    current().checkout({ ...payment, requestId: "second-purchase" }),
    /already processing/,
  );
  const receipt = await first;
  assert.equal(current().receipts.length, 1);
  assert.equal(Date.parse(receipt.end) - Date.parse(before), 30 * 86400000);
  await useShuttleStore.persist.rehydrate();
  assert.equal(
    (await current().checkout({ ...payment, requestId: "retry-safe" })).id,
    receipt.id,
  );
  assert.equal(current().receipts.length, 1);
  await assert.rejects(
    current().checkout({ ...payment, planId: "vip", requestId: "retry-safe" }),
    /different purchase/,
  );
});
test("last available seat is held before asynchronous payment and cannot be oversold", async () => {
  current().reset();
  const template = current().riders[1];
  const full = Array.from({ length: 17 }, (_, i) => ({
    ...template,
    id: `full-${i}`,
    seat: i + 1,
  }));
  const a = { ...template, id: "buyer-a", seat: 0, subscription: null };
  const b = { ...template, id: "buyer-b", seat: 0, subscription: null };
  useShuttleStore.setState({ riders: [...full, a, b], riderId: a.id });
  const pending = current().checkout({ ...payment, requestId: "last-seat" });
  useShuttleStore.setState({ riderId: b.id });
  await assert.rejects(
    current().checkout({ ...payment, requestId: "oversold" }),
    /fully reserved/,
  );
  const receipt = await pending;
  assert.equal(receipt.seat, 18);
  assert.equal(current().riders.find((r) => r.id === a.id)!.seat, 18);
  assert.equal(current().receipts.length, 1);
});
test("reset and route edits cannot apply a stale payment result", async () => {
  current().reset();
  current().loginDemo("commuter", "Worker");
  const pending = current().checkout({ ...payment, requestId: "stale" });
  const r = current().riders[1];
  assert.throws(
    () =>
      current().configure({
        routeId: r.routeId,
        stopId: r.stopId,
        pickup: r.pickup,
        address: r.address,
        morning: r.morning,
        evening: r.evening,
      }),
    /payment/,
  );
  current().reset();
  await assert.rejects(pending, /booking changed/);
  assert.equal(current().receipts.length, 0);
});
test("registration does not allocate or duplicate paid seats and route changes enforce reservation capacity", async () => {
  current().reset();
  await Promise.all([
    current().register("New Rider One", "one@example.com", "Worker"),
    current().register("New Rider Two", "two@example.com", "Worker"),
  ]);
  const newRiders = current().riders.filter((r) =>
    r.email.endsWith("@example.com"),
  );
  assert.equal(newRiders.length, 2);
  assert.equal(new Set(newRiders.map((r) => r.id)).size, 2);
  assert.ok(newRiders.every((r) => r.seat === 0));
  current().reset();
  const r = current().riders[1];
  useShuttleStore.setState({
    riders: [
      ...current().riders,
      ...Array.from({ length: 17 }, (_, i) => ({
        ...r,
        id: `school-${i}`,
        routeId: "school",
        stopId: "spi",
        seat: i + 2,
      })),
    ],
  });
  current().loginDemo("commuter", "Worker");
  assert.throws(
    () =>
      current().configure({
        routeId: "school",
        stopId: "spi",
        pickup: "stop",
        address: r.address,
        morning: r.morning,
        evening: r.evening,
      }),
    /fully reserved/,
  );
});

import testStorage, { storageControls } from "./storage";
import { dayKey, seedRouteTrips } from "../data/mockData";
import { hydrateDomain } from "../store/hydration";
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

test("boarding consumption survives rehydration and prevents a replay after status rollback", async () => {
  current().reset();
  current().loginDemo("commuter", "Worker");
  const rider = current().riders[1],
    token = passToken(rider);
  current().scan(token);
  assert.equal(current().boardingRecords.length, 1);
  await useShuttleStore.persist.rehydrate();
  useShuttleStore.setState({
    riders: current().riders.map((r) =>
      r.id === rider.id
        ? { ...r, statuses: { ...r.statuses, morning: "Waiting" } }
        : r,
    ),
  });
  assert.throws(() => current().scan(token), /already been used/);
  assert.equal(current().boardingRecords.length, 1);
});
test("a previous trip screenshot cannot board a restarted run", () => {
  current().reset();
  const rider = current().riders[1],
    token = passToken(rider);
  current().endTrip();
  current().startTrip();
  assert.throws(() => current().scan(token), /Invalid/);
});

test("hydration migrates missing fields and repairs duplicate seats without dropping valid accounts", () => {
  current().reset();
  const legacy = {
    ...current(),
    boardingRecords: undefined,
    riders: current().riders.map((r) => ({ ...r, seat: 2 })),
  };
  const restored = hydrateDomain(legacy, current());
  assert.equal(restored.riders.length, 14);
  assert.deepEqual(restored.boardingRecords, []);
  const east = restored.riders.filter((r) => r.routeId === "east");
  assert.equal(new Set(east.map((r) => r.seat)).size, east.length);
  assert.ok(restored.riders.every((r) => r.subscription));
});
test("hydration rejects corrupt validity, unknown routes and unsafe progress", () => {
  current().reset();
  const riders = current().riders.map((r, i) =>
    i === 0
      ? { ...r, subscription: { ...r.subscription!, end: "invalid" } }
      : i === 1
        ? { ...r, routeId: "missing" }
        : r,
  );
  const restored = hydrateDomain(
    {
      ...current(),
      riders,
      routeTrips: undefined,
      trips: {
        morning: {
          status: "En Route",
          progress: Infinity,
          notifiedStops: ["missing"],
        },
        evening: { status: "Completed", progress: -100 },
      },
      riderId: "unknown",
    },
    current(),
  );
  assert.equal(restored.riders[0].subscription, null);
  assert.equal(
    restored.riders.some((r) => r.id === "r2"),
    false,
  );
  assert.equal(restored.loggedIn, false);
  assert.equal(restored.trips.morning.progress, 0);
  assert.equal(restored.trips.evening.progress, 1);
  assert.deepEqual(restored.trips.morning.notifiedStops, []);
});

test("route completion leaves other route passengers and trip instances unchanged", () => {
  current().reset();
  current().passengerStatus("r2", "Boarded");
  const school = current().routeTrips.school.morning;
  current().endTrip("east");
  assert.equal(current().riders[1].statuses.morning, "Completed");
  assert.equal(current().riders[0].statuses.morning, "Waiting");
  assert.equal(current().routeTrips.school.morning, school);
  const count = current().activity.length;
  current().endTrip("east");
  assert.equal(current().activity.length, count);
});
test("all active route directions advance independently of the selected view and catch up after delays", () => {
  current().reset();
  const now = Date.parse("2026-10-22T08:00:00Z"),
    routeTrips = seedRouteTrips(now);
  routeTrips.east.evening = { ...routeTrips.east.morning, progress: 0 };
  useShuttleStore.setState({
    hydrated: true,
    serviceDay: dayKey(now),
    routeTrips,
    trips: routeTrips.east,
  });
  current().setRun("evening");
  current().tick(now + 60000);
  assert.ok(
    Math.abs(current().routeTrips.east.morning.progress - 0.22) < 1e-12,
  );
  assert.ok(
    Math.abs(current().routeTrips.east.evening.progress - 0.04) < 1e-12,
  );
  assert.ok(
    Math.abs(current().routeTrips.school.morning.progress - 0.22) < 1e-12,
  );
  const progress = current().routeTrips.east.morning.progress;
  current().tick(now + 60000);
  assert.equal(current().routeTrips.east.morning.progress, progress);
});
test("notifications cannot start scheduled runs or modify a different route and repeated starts are idempotent", () => {
  current().reset();
  current().setRun("evening");
  assert.throws(() => current().notify("mad", "east"), /Start/);
  assert.throws(() => current().notify("spi", "east"), /stop/);
  current().startTrip("east");
  const trip = current().routeTrips.east.evening,
    count = current().activity.length;
  current().startTrip("east");
  assert.equal(current().routeTrips.east.evening, trip);
  assert.equal(current().activity.length, count);
  current().notify("mad", "east");
  assert.equal(current().routeTrips.east.evening.status, "Arriving");
  assert.equal(current().routeTrips.school.evening.status, "Scheduled");
});
test("absence cannot undo boarding and completed passengers cannot be boarded twice", () => {
  current().reset();
  current().loginDemo("commuter", "Worker");
  current().passengerStatus("r2", "Boarded");
  current().markAbsent();
  assert.equal(current().riders[1].statuses.morning, "Boarded");
  assert.equal(current().riders[1].statuses.evening, "Absent");
  assert.throws(
    () => current().passengerStatus("r2", "Skipped"),
    /already boarded/,
  );
  current().endTrip("east");
  assert.throws(() => current().passengerStatus("r2", "Boarded"), /completed/);
});
test("a scanner cannot accept another route pass and starting a different route preserves absence", () => {
  current().reset();
  const rider = current().riders[0];
  assert.throws(
    () => current().scan(passToken(rider), "east"),
    /another route/,
  );
  current().markAbsent();
  current().endTrip("school");
  current().startTrip("school");
  assert.equal(current().riders[0].statuses.morning, "Absent");
});

test("passed stops and invalid return windows are rejected without altering a booking", () => {
  current().reset();
  assert.throws(() => current().notify("adj", "east"), /already been passed/);
  const evening = current().riders[0].evening;
  assert.throws(() => current().setEvening("11:59 PM"), /valid evening/);
  assert.equal(current().riders[0].evening, evening);
});
test("manual boarding synchronizes a stale service day before consuming the pass", () => {
  current().reset();
  useShuttleStore.setState({ serviceDay: "2000-01-01" });
  current().passengerStatus("r2", "Boarded");
  assert.equal(current().serviceDay, dayKey());
  assert.ok(current().boardingRecords[0].key.includes(dayKey()));
  assert.equal(current().riders[1].statuses.morning, "Boarded");
});

test("boarding remains optimistic during storage failure and persists both status and replay ledger on recovery", async () => {
  current().reset();
  await current().retryPersistence();
  storageControls.failWrites = true;
  try {
    current().scan(passToken(current().riders[1]));
    assert.equal(current().riders[1].statuses.morning, "Boarded");
    assert.equal(await current().retryPersistence(), false);
    assert.match(current().storageError!, /memory only/);
  } finally {
    storageControls.failWrites = false;
  }
  assert.equal(await current().retryPersistence(), true);
  assert.equal(current().storageError, null);
  const saved = JSON.parse(
    (await testStorage.getItem("shuttlepass-v1"))!,
  ).state;
  assert.equal(
    saved.riders.find((r: { id: string }) => r.id === "r2").statuses.morning,
    "Boarded",
  );
  assert.equal(saved.boardingRecords.length, 1);
  await useShuttleStore.persist.rehydrate();
  assert.equal(current().riders[1].statuses.morning, "Boarded");
  assert.equal(current().boardingRecords.length, 1);
});

test("mutating a pending checkout form cannot activate a different tier or invalidate the request identity", async () => {
  current().reset();
  current().loginDemo("commuter", "Worker");
  const input = { ...payment, requestId: "immutable-purchase" };
  const pending = current().checkout(input);
  input.planId = "vip";
  input.requestId = "mutated-purchase";
  const receipt = await pending;
  const rider = current().riders[1];
  assert.equal(receipt.planId, "worker");
  assert.equal(receipt.amount, 650);
  assert.equal(receipt.requestId, "immutable-purchase");
  assert.equal(rider.subscription!.planId, "worker");
  assert.equal(rider.pickup, "stop");
  assert.equal(
    (await current().checkout({ ...payment, requestId: "immutable-purchase" }))
      .id,
    receipt.id,
  );
  assert.equal(current().receipts.length, 1);
});

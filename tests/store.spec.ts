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

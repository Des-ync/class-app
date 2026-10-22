import {
  Activity,
  BoardingRecord,
  Receipt,
  Rider,
  Role,
  Run,
  Trip,
} from "../types";
import {
  driver,
  eveningTimes,
  morningTimes,
  plans,
  routes,
} from "../data/mockData";
import { isSubscriptionActive } from "../services/subscriptions";
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const text = (v: unknown, max = 1000): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const date = (v: unknown): v is string =>
  text(v) && Number.isFinite(Date.parse(v));
const statuses = ["Waiting", "Boarded", "Absent", "Skipped", "Completed"];
interface Domain {
  riders: Rider[];
  receipts: Receipt[];
  activity: Activity[];
  boardingRecords: BoardingRecord[];
  trips: Record<Run, Trip>;
  riderId: string;
  role: Role;
  loggedIn: boolean;
  run: Run;
  serviceDay: string;
}
export function hydrateDomain<T extends Domain>(
  stored: unknown,
  current: T,
): T {
  const raw = object(stored);
  if (!Object.keys(raw).length) return current;
  const seen = new Set<string>();
  const riders: Rider[] = [];
  for (const value of Array.isArray(raw.riders) ? raw.riders : current.riders) {
    const r = object(value),
      route = routes.find((p) => p.id === r.routeId),
      status = object(r.statuses);
    if (
      !text(r.id, 100) ||
      seen.has(r.id) ||
      !text(r.name, 200) ||
      !text(r.email, 254) ||
      !route ||
      !route.stops.slice(0, -1).some((p) => p.id === r.stopId) ||
      !["Student", "Worker"].includes(String(r.type)) ||
      !["home", "stop"].includes(String(r.pickup)) ||
      typeof r.address !== "string"
    )
      continue;
    const sub = object(r.subscription);
    const subscription =
      plans.some((p) => p.id === sub.planId) &&
      date(sub.start) &&
      date(sub.end) &&
      Date.parse(sub.start) < Date.parse(sub.end)
        ? {
            planId: String(sub.planId),
            start: sub.start,
            end: sub.end,
            autoRenew: sub.autoRenew === true,
          }
        : null;
    const rider: Rider = {
      id: r.id,
      name: r.name,
      email: r.email,
      type: r.type as Rider["type"],
      routeId: route.id,
      stopId: String(r.stopId),
      pickup: r.pickup as Rider["pickup"],
      address: r.address.slice(0, 1000),
      morning: morningTimes.includes(String(r.morning))
        ? String(r.morning)
        : morningTimes[2],
      evening: eveningTimes.includes(String(r.evening))
        ? String(r.evening)
        : eveningTimes[2],
      seat:
        Number.isInteger(r.seat) &&
        Number(r.seat) > 0 &&
        Number(r.seat) <= driver.capacity
          ? Number(r.seat)
          : 0,
      subscription,
      statuses: {
        morning: statuses.includes(String(status.morning))
          ? (status.morning as Rider["statuses"]["morning"])
          : "Waiting",
        evening: statuses.includes(String(status.evening))
          ? (status.evening as Rider["statuses"]["evening"])
          : "Waiting",
      },
    };
    // Repair old duplicate seats without discarding valid profiles or receipts.
    if (isSubscriptionActive(subscription)) {
      const used = new Set(
        riders
          .filter(
            (p) =>
              p.routeId === rider.routeId &&
              isSubscriptionActive(p.subscription),
          )
          .map((p) => p.seat),
      );
      if (!rider.seat || used.has(rider.seat))
        rider.seat =
          Array.from({ length: driver.capacity }, (_, i) => i + 1).find(
            (n) => !used.has(n),
          ) ?? 0;
      if (!rider.seat) rider.subscription = null;
    }
    if (!isSubscriptionActive(rider.subscription))
      for (const run of ["morning", "evening"] as const)
        if (rider.statuses[run] === "Boarded") rider.statuses[run] = "Waiting";
    seen.add(rider.id);
    riders.push(rider);
  }
  if (!riders.length) riders.push(...current.riders);
  const ids = new Set(riders.map((r) => r.id));
  const receipts: Receipt[] = [];
  const receiptIds = new Set<string>();
  const requests = new Set<string>();
  for (const value of Array.isArray(raw.receipts) ? raw.receipts : []) {
    const r = object(value);
    if (
      !text(r.id, 200) ||
      receiptIds.has(r.id) ||
      !ids.has(String(r.riderId)) ||
      !plans.some((p) => p.id === r.planId) ||
      !Number.isFinite(r.amount) ||
      Number(r.amount) < 0 ||
      !text(r.method, 100) ||
      !date(r.date) ||
      !date(r.start) ||
      !date(r.end) ||
      Date.parse(r.end) <= Date.parse(r.start)
    )
      continue;
    if (text(r.requestId, 200) && requests.has(r.requestId)) continue;
    receipts.push({
      id: r.id,
      riderId: String(r.riderId),
      planId: String(r.planId),
      amount: Number(r.amount),
      method: r.method,
      date: r.date,
      start: r.start,
      end: r.end,
      ...(text(r.requestId, 200) ? { requestId: r.requestId } : {}),
      ...(text(r.routeId, 100) ? { routeId: r.routeId } : {}),
      ...(Number.isInteger(r.seat) ? { seat: Number(r.seat) } : {}),
    });
    receiptIds.add(r.id);
    if (text(r.requestId, 200)) requests.add(r.requestId);
  }
  const trips = { ...current.trips };
  for (const run of ["morning", "evening"] as const) {
    const t = object(object(raw.trips)[run]);
    if (
      !["Scheduled", "En Route", "Arriving", "Completed"].includes(
        String(t.status),
      )
    )
      continue;
    const progress =
      typeof t.progress === "number" && Number.isFinite(t.progress)
        ? Math.max(0, Math.min(1, t.progress))
        : 0;
    trips[run] = {
      status: t.status as Trip["status"],
      progress: t.status === "Completed" ? 1 : progress,
      notifiedStops: Array.isArray(t.notifiedStops)
        ? t.notifiedStops.filter((id): id is string =>
            routes.some((r) => r.stops.some((s) => s.id === id)),
          )
        : [],
      ...(text(t.id, 200) ? { id: t.id } : {}),
    };
  }
  const activity: Activity[] = (Array.isArray(raw.activity) ? raw.activity : [])
    .filter((a): a is Activity => {
      const r = object(a);
      return (
        text(r.id, 200) &&
        text(r.title) &&
        text(r.detail) &&
        date(r.date) &&
        (!r.riderId || ids.has(String(r.riderId)))
      );
    })
    .slice(0, 100);
  const boardingRecords: BoardingRecord[] = (
    Array.isArray(raw.boardingRecords) ? raw.boardingRecords : []
  )
    .filter((a): a is BoardingRecord => {
      const r = object(a);
      return (
        text(r.key, 1000) && ids.has(String(r.riderId)) && date(r.boardedAt)
      );
    })
    .slice(-1000);
  const riderId = ids.has(String(raw.riderId))
    ? String(raw.riderId)
    : riders[0].id;
  return {
    ...current,
    riders,
    receipts,
    trips,
    activity,
    boardingRecords,
    riderId,
    loggedIn: raw.loggedIn === true && ids.has(String(raw.riderId)),
    role: ["commuter", "driver", "admin"].includes(String(raw.role))
      ? (raw.role as Role)
      : "commuter",
    run: raw.run === "evening" ? "evening" : "morning",
    serviceDay:
      text(raw.serviceDay, 10) && /^\d{4}-\d{2}-\d{2}$/.test(raw.serviceDay)
        ? raw.serviceDay
        : current.serviceDay,
  };
}

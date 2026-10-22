import { Rider, Subscription } from "../types";
import { driver, plans } from "../data/mockData";

export function isSubscriptionActive(
  subscription: Subscription | null,
  now = Date.now(),
): boolean {
  if (!subscription || !plans.some((p) => p.id === subscription.planId))
    return false;
  const start = Date.parse(subscription.start),
    end = Date.parse(subscription.end);
  return (
    Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end
  );
}
export interface SeatHold {
  riderId: string;
  routeId: string;
  seat: number;
}
export function reserveSeat(
  riders: Rider[],
  routeId: string,
  riderId: string,
  holds: SeatHold[] = [],
  now = Date.now(),
): number {
  const occupied = new Set(
    riders
      .filter(
        (r) =>
          r.id !== riderId &&
          r.routeId === routeId &&
          isSubscriptionActive(r.subscription, now),
      )
      .map((r) => r.seat),
  );
  for (const hold of holds)
    if (hold.routeId === routeId && hold.riderId !== riderId)
      occupied.add(hold.seat);
  const current = riders.find((r) => r.id === riderId);
  if (
    current?.routeId === routeId &&
    Number.isInteger(current.seat) &&
    current.seat > 0 &&
    current.seat <= driver.capacity &&
    !occupied.has(current.seat)
  )
    return current.seat;
  for (let seat = 1; seat <= driver.capacity; seat++)
    if (!occupied.has(seat)) return seat;
  throw new Error(
    "This route is fully reserved. Choose another route before paying.",
  );
}
let sequence = 0;
export function operationId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
}

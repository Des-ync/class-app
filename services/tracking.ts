import { Route, Run, Trip } from "../types";
export const TRIP_DURATION_MS = 25 * 60 * 1000;
export const clampProgress = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
export function routeStops(route: Route, run: Run) {
  return run === "evening" ? [...route.stops].reverse() : route.stops;
}
export function routeDistances(route: Route, run: Run) {
  const stops = routeStops(route, run),
    distances = [0];
  for (let i = 1; i < stops.length; i++)
    distances.push(
      distances[i - 1] +
        Math.hypot(stops[i].x - stops[i - 1].x, stops[i].y - stops[i - 1].y),
    );
  const total = distances.at(-1) || 1;
  return { stops, fractions: distances.map((d) => d / total) };
}
export function stopProgress(route: Route, run: Run, stopId: string): number {
  const { stops, fractions } = routeDistances(route, run);
  const index = stops.findIndex((s) => s.id === stopId);
  return index < 0 ? 0 : fractions[index];
}
export function routePosition(route: Route, progress: number, run: Run) {
  const { stops, fractions } = routeDistances(route, run);
  if (!stops.length) return { x: 180, y: 135 };
  if (stops.length === 1) return { x: stops[0].x, y: stops[0].y };
  const p = clampProgress(progress);
  let i = 0;
  while (i < stops.length - 2 && fractions[i + 1] < p) i++;
  const width = fractions[i + 1] - fractions[i],
    local = width ? (p - fractions[i]) / width : 0;
  return {
    x: stops[i].x + (stops[i + 1].x - stops[i].x) * local,
    y: stops[i].y + (stops[i + 1].y - stops[i].y) * local,
  };
}
export function advanceTrip(trip: Trip, now: number): Trip {
  if (!["En Route", "Arriving"].includes(trip.status)) return trip;
  const last = Number.isFinite(trip.lastUpdatedAt) ? trip.lastUpdatedAt! : now;
  const progress = clampProgress(
    clampProgress(trip.progress) + Math.max(0, now - last) / TRIP_DURATION_MS,
  );
  return {
    ...trip,
    progress,
    lastUpdatedAt: Math.max(last, now),
    status: progress === 1 ? "Completed" : trip.status,
  };
}
export function stopTiming(route: Route, run: Run, stopId: string, trip: Trip) {
  const delta = stopProgress(route, run, stopId) - clampProgress(trip.progress);
  const minutes = Math.ceil((Math.max(0, delta) * TRIP_DURATION_MS) / 60000);
  const state =
    trip.status === "Scheduled"
      ? "scheduled"
      : trip.status === "Completed"
        ? "completed"
        : delta < -0.01
          ? "passed"
          : Math.abs(delta) <= 0.01
            ? "at-stop"
            : minutes <= 2
              ? "arriving"
              : "upcoming";
  return { minutes, state };
}

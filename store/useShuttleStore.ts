import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Activity,
  BoardingRecord,
  Booking,
  PaymentInput,
  Receipt,
  Rider,
  RiderType,
  Role,
  Run,
  Trip,
  PassengerStatus,
} from "../types";
import {
  dayKey,
  plans,
  routes,
  seedRiders,
  seedTrips,
  morningTimes,
  eveningTimes,
} from "../data/mockData";
import {
  isSubscriptionActive,
  operationId,
  reserveSeat,
  SeatHold,
} from "../services/subscriptions";
import { api, validatePayment, verifyPass } from "../services/api";
import { createResilientStorage } from "../services/storage";
import { hydrateDomain } from "./hydration";
const localStorage = createResilientStorage(AsyncStorage, (message) => {
  if (useShuttleStore.getState().storageError !== message)
    useShuttleStore.setState({ storageError: message });
});
interface CheckoutOperation extends SeatHold {
  requestId: string;
  planId: string;
  method: string;
  promise: Promise<Receipt>;
}
const checkouts = new Map<string, CheckoutOperation>();
let generation = 0;
import { boardingKey, ticketContext } from "../services/ticketing";
interface State {
  hydrated: boolean;
  storageError: string | null;
  loggedIn: boolean;
  role: Role;
  riderId: string;
  riders: Rider[];
  receipts: Receipt[];
  boardingRecords: BoardingRecord[];
  activity: Activity[];
  run: Run;
  trips: Record<Run, Trip>;
  serviceDay: string;
  retryPersistence: () => Promise<boolean>;
  setHydrated: () => void;
  loginDemo: (role: Role, type?: RiderType) => void;
  register: (name: string, email: string, type: RiderType) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => void;
  configure: (booking: Booking) => void;
  setEvening: (time: string) => void;
  markAbsent: () => void;
  toggleRenew: () => void;
  checkout: (input: PaymentInput) => Promise<Receipt>;
  setRun: (run: Run) => void;
  startTrip: () => void;
  endTrip: () => void;
  tick: () => void;
  passengerStatus: (id: string, status: PassengerStatus) => void;
  notify: (stopId: string) => void;
  scan: (token: string) => void;
  reset: () => void;
}
const event = (title: string, detail: string, riderId?: string): Activity => ({
  id: `${Date.now()}-${Math.random()}`,
  title,
  detail,
  riderId,
  date: new Date().toISOString(),
});
export const useShuttleStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      storageError: null,
      loggedIn: false,
      role: "commuter",
      riderId: "r1",
      riders: seedRiders(),
      receipts: [],
      boardingRecords: [],
      activity: [
        event("Welcome to ShuttlePass", "Your daily commute, taken care of."),
      ],
      run: "morning",
      trips: seedTrips(),
      serviceDay: dayKey(),
      retryPersistence: () => localStorage.flush(),
      setHydrated: () => set({ hydrated: true }),
      loginDemo: (role, type = "Student") =>
        set({
          loggedIn: true,
          role,
          riderId: type === "Student" ? "r1" : "r2",
        }),
      register: async (name, email, type) => {
        const profile = await api.login(email, name);
        const existing = get().riders.find((r) => r.email === profile.email);
        if (existing) {
          set({ loggedIn: true, role: "commuter", riderId: existing.id });
          return;
        }
        const base = seedRiders()[type === "Student" ? 0 : 1];
        const id = operationId("rider");
        set((s) => ({
          riders: [
            ...s.riders,
            {
              ...base,
              ...profile,
              id,
              type,
              subscription: null,
              seat: 0,
              statuses: { morning: "Waiting", evening: "Waiting" },
            },
          ],
          loggedIn: true,
          role: "commuter",
          riderId: id,
        }));
      },
      logout: () => set({ loggedIn: false }),
      switchRole: (role) => set({ role }),
      configure: (booking) => {
        const s = get();
        const rider = s.riders.find((r) => r.id === s.riderId)!;
        const route = routes.find((r) => r.id === booking.routeId);
        if (!route || !route.stops.some((p) => p.id === booking.stopId))
          throw new Error("Choose a valid route and pickup stop.");
        if (booking.pickup === "home" && booking.address.trim().length < 10)
          throw new Error("Enter a full residential address and landmark.");
        if (checkouts.has(rider.id))
          throw new Error(
            "Wait for your payment to finish before changing routes.",
          );
        if (
          !morningTimes.includes(booking.morning) ||
          !eveningTimes.includes(booking.evening)
        )
          throw new Error("Choose a valid pickup and return window.");
        if (route.stops.at(-1)?.id === booking.stopId)
          throw new Error("Choose a pickup stop before the destination.");
        if (Object.values(rider.statuses).includes("Boarded"))
          throw new Error("You can change your route after this trip ends.");
        const seat = isSubscriptionActive(rider.subscription)
          ? reserveSeat(s.riders, booking.routeId, rider.id, [
              ...checkouts.values(),
            ])
          : 0;
        set((s) => ({
          riders: s.riders.map((r) =>
            r.id === s.riderId ? { ...r, ...booking, seat } : r,
          ),
          activity: [
            event(
              "Route updated",
              `${route.name} · ${booking.pickup === "home" ? "Doorstep pickup" : route.stops.find((p) => p.id === booking.stopId)!.name}`,
              s.riderId,
            ),
            ...s.activity,
          ].slice(0, 100),
        }));
      },
      setEvening: (time) =>
        set((s) => ({
          riders: s.riders.map((r) =>
            r.id === s.riderId ? { ...r, evening: time } : r,
          ),
          activity: [
            event(
              "Return time changed",
              `Evening pickup at ${time}`,
              s.riderId,
            ),
            ...s.activity,
          ].slice(0, 100),
        })),
      markAbsent: () =>
        set((s) => ({
          riders: s.riders.map((r) =>
            r.id === s.riderId
              ? { ...r, statuses: { morning: "Absent", evening: "Absent" } }
              : r,
          ),
          activity: [
            event(
              "Absence recorded",
              "No pickup is needed today. Your driver has been notified.",
              s.riderId,
            ),
            ...s.activity,
          ].slice(0, 100),
        })),
      toggleRenew: () =>
        set((s) => ({
          riders: s.riders.map((r) =>
            r.id === s.riderId && r.subscription
              ? {
                  ...r,
                  subscription: {
                    ...r.subscription,
                    autoRenew: !r.subscription.autoRenew,
                  },
                }
              : r,
          ),
        })),
      checkout: (input) => {
        const rider = get().riders.find((r) => r.id === get().riderId)!;
        const error = validatePayment(input);
        if (error) return Promise.reject(new Error(error));
        const existing = input.requestId
          ? get().receipts.find((r) => r.requestId === input.requestId)
          : undefined;
        if (existing) {
          if (
            existing.riderId !== rider.id ||
            existing.planId !== input.planId ||
            existing.method !== input.method
          )
            return Promise.reject(
              new Error(
                "This payment request was already used for a different purchase.",
              ),
            );
          return Promise.resolve(existing);
        }
        if (
          input.requestId &&
          [...checkouts.values()].some(
            (p) => p.requestId === input.requestId && p.riderId !== rider.id,
          )
        )
          return Promise.reject(
            new Error(
              "This payment request is already processing for another rider.",
            ),
          );
        const pending = checkouts.get(rider.id);
        if (pending) {
          if (
            pending.planId === input.planId &&
            pending.method === input.method &&
            (!input.requestId || input.requestId === pending.requestId)
          )
            return pending.promise;
          return Promise.reject(
            new Error("A payment is already processing for this rider."),
          );
        }
        let seat: number;
        try {
          seat = reserveSeat(get().riders, rider.routeId, rider.id, [
            ...checkouts.values(),
          ]);
        } catch (error) {
          return Promise.reject(error);
        }
        const requestId = input.requestId || operationId("payment");
        const epoch = generation;
        const snapshot = {
          ...rider,
          subscription: rider.subscription ? { ...rider.subscription } : null,
        };
        const operation = {
          riderId: rider.id,
          routeId: rider.routeId,
          seat,
          requestId,
          planId: input.planId,
          method: input.method,
        };
        const promise = (async () => {
          try {
            const response = await api.checkout({ ...input }, snapshot);
            const current = get().riders.find((r) => r.id === rider.id);
            if (
              epoch !== generation ||
              !current ||
              current.routeId !== snapshot.routeId
            )
              throw new Error(
                "The booking changed while payment was processing. No pass was activated.",
              );
            const receipt: Receipt = {
              ...response,
              requestId,
              routeId: rider.routeId,
              seat,
            };
            set((s) => ({
              receipts: [receipt, ...s.receipts],
              riders: s.riders.map((r) =>
                r.id === rider.id
                  ? {
                      ...r,
                      seat,
                      pickup: plans.find((p) => p.id === input.planId)!.pickup,
                      subscription: {
                        planId: input.planId,
                        start: isSubscriptionActive(r.subscription)
                          ? r.subscription!.start
                          : receipt.start,
                        end: receipt.end,
                        autoRenew: r.subscription?.autoRenew ?? true,
                      },
                    }
                  : r,
              ),
              activity: [
                event(
                  "Payment successful",
                  `GHS ${receipt.amount} · ${receipt.method}`,
                  rider.id,
                ),
                ...s.activity,
              ].slice(0, 100),
            }));
            return receipt;
          } finally {
            if (checkouts.get(rider.id)?.requestId === requestId)
              checkouts.delete(rider.id);
          }
        })();
        checkouts.set(rider.id, { ...operation, promise });
        return promise;
      },
      setRun: (run) => set({ run }),
      startTrip: () =>
        set((s) => ({
          trips: {
            ...s.trips,
            [s.run]: {
              id:
                s.trips[s.run].status === "Completed"
                  ? operationId("trip")
                  : s.trips[s.run].id,
              status: "En Route",
              progress:
                s.trips[s.run].status === "Completed"
                  ? 0
                  : s.trips[s.run].progress,
              notifiedStops: [],
            },
          },
          riders:
            s.trips[s.run].status === "Completed"
              ? s.riders.map((r) => ({
                  ...r,
                  statuses: {
                    ...r.statuses,
                    [s.run]: "Waiting" as PassengerStatus,
                  },
                }))
              : s.riders,
          activity: [
            event(
              "Trip started",
              `${s.run === "morning" ? "Morning inbound" : "Evening outbound"} run is on the road.`,
            ),
            ...s.activity,
          ].slice(0, 100),
        })),
      endTrip: () =>
        set((s) => ({
          trips: {
            ...s.trips,
            [s.run]: { ...s.trips[s.run], status: "Completed", progress: 1 },
          },
          riders: s.riders.map((r) => ({
            ...r,
            statuses: {
              ...r.statuses,
              [s.run]:
                r.statuses[s.run] === "Boarded"
                  ? "Completed"
                  : r.statuses[s.run] === "Waiting"
                    ? "Skipped"
                    : r.statuses[s.run],
            },
          })),
          activity: [
            event(
              "Trip completed",
              `${s.run} run has reached its destination.`,
            ),
            ...s.activity,
          ].slice(0, 100),
        })),
      tick: () => {
        if (!get().hydrated) return;
        void localStorage.flush();
        const s = get();
        if (s.serviceDay !== dayKey()) {
          set({
            serviceDay: dayKey(),
            trips: seedTrips(),
            riders: s.riders.map((r) => ({
              ...r,
              statuses: { morning: "Waiting", evening: "Waiting" },
            })),
          });
          return;
        }
        const trip = s.trips[s.run];
        if (trip.status !== "En Route" && trip.status !== "Arriving") return;
        if (trip.progress >= 1) {
          get().endTrip();
          return;
        }
        set({
          trips: {
            ...s.trips,
            [s.run]: { ...trip, progress: Math.min(1, trip.progress + 0.003) },
          },
        });
      },
      passengerStatus: (id, status) => {
        const s = get();
        const rider = s.riders.find((r) => r.id === id);
        if (!rider) throw new Error("Passenger was not found.");
        if (status === "Boarded") {
          if (rider.pickup === "home" && rider.subscription?.planId !== "vip")
            throw new Error(
              "Doorstep pickup requires an active Doorstep VIP plan.",
            );
          if (!isSubscriptionActive(rider.subscription))
            throw new Error("An active subscription is required to board.");
          if (
            s.trips[s.run].status === "Completed" ||
            s.trips[s.run].status === "Scheduled"
          )
            throw new Error("Start the trip before boarding.");
          if (rider.statuses[s.run] === "Absent")
            throw new Error("This rider has marked themselves absent today.");
          if (rider.statuses[s.run] === "Boarded") return;
          const key = boardingKey(
            rider,
            ticketContext(s.run, s.trips[s.run], s.serviceDay),
          );
          if (s.boardingRecords.some((record) => record.key === key))
            throw new Error("This pass has already been used on this trip.");
          if (
            s.riders.filter((r) => r.statuses[s.run] === "Boarded").length >= 18
          )
            throw new Error("This shuttle has reached its 18-seat capacity.");
        }
        set((s) => ({
          boardingRecords:
            status === "Boarded"
              ? [
                  ...s.boardingRecords,
                  {
                    key: boardingKey(
                      rider,
                      ticketContext(s.run, s.trips[s.run], s.serviceDay),
                    ),
                    riderId: id,
                    boardedAt: new Date().toISOString(),
                  },
                ].slice(-1000)
              : s.boardingRecords,
          riders: s.riders.map((r) =>
            r.id === id
              ? { ...r, statuses: { ...r.statuses, [s.run]: status } }
              : r,
          ),
          activity: [
            event(`${rider.name} · ${status}`, `${s.run} run`, id),
            ...s.activity,
          ].slice(0, 100),
        }));
      },
      notify: (stopId) =>
        set((s) => ({
          trips: {
            ...s.trips,
            [s.run]: {
              ...s.trips[s.run],
              status: "Arriving",
              notifiedStops: [
                ...new Set([...s.trips[s.run].notifiedStops, stopId]),
              ],
            },
          },
          activity: [
            event(
              "Shuttle arriving",
              "Your shuttle will arrive in approximately 2 minutes.",
            ),
            ...s.activity,
          ].slice(0, 100),
        })),
      scan: (token) => {
        const s = get();
        const rider = verifyPass(
          token,
          s.riders,
          Date.now(),
          ticketContext(s.run, s.trips[s.run], s.serviceDay),
        );
        get().passengerStatus(rider.id, "Boarded");
      },
      reset: () => {
        generation++;
        checkouts.clear();
        set({
          riders: seedRiders(),
          receipts: [],
          boardingRecords: [],
          activity: [event("Demo reset", "All demo data has been restored.")],
          trips: seedTrips(),
          run: "morning",
          riderId: "r1",
          serviceDay: dayKey(),
        });
      },
    }),
    {
      name: "shuttlepass-v1",
      storage: createJSONStorage(() => localStorage.storage),
      merge: (stored, current) => hydrateDomain(stored, current),
      partialize: ({ hydrated, storageError, ...rest }) => rest,
      onRehydrateStorage: () => (state, error) => {
        if (state) state.setHydrated();
        if (error)
          useShuttleStore.setState({
            hydrated: true,
            storageError:
              "Local storage could not be loaded. Current data is retained in memory; saved data has not been overwritten.",
          });
      },
    },
  ),
);

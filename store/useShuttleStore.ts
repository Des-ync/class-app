import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Activity,
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
import { dayKey, plans, routes, seedRiders, seedTrips } from "../data/mockData";
import { api, verifyPass } from "../services/api";
interface State {
  hydrated: boolean;
  storageError: string | null;
  loggedIn: boolean;
  role: Role;
  riderId: string;
  riders: Rider[];
  receipts: Receipt[];
  activity: Activity[];
  run: Run;
  trips: Record<Run, Trip>;
  serviceDay: string;
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
      activity: [
        event("Welcome to ShuttlePass", "Your daily commute, taken care of."),
      ],
      run: "morning",
      trips: seedTrips(),
      serviceDay: dayKey(),
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
        const id = `u${Date.now()}`;
        set((s) => ({
          riders: [
            ...s.riders,
            {
              ...base,
              ...profile,
              id,
              type,
              subscription: null,
              seat: 15,
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
        if (rider.statuses[s.run] === "Boarded")
          throw new Error("You can change your route after this trip ends.");
        set((s) => ({
          riders: s.riders.map((r) =>
            r.id === s.riderId ? { ...r, ...booking } : r,
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
      checkout: async (input) => {
        const rider = get().riders.find((r) => r.id === get().riderId)!;
        const receipt = await api.checkout(input, rider);
        set((s) => ({
          receipts: [receipt, ...s.receipts],
          riders: s.riders.map((r) =>
            r.id === rider.id
              ? {
                  ...r,
                  pickup: plans.find((p) => p.id === input.planId)!.pickup,
                  subscription: {
                    planId: input.planId,
                    start:
                      r.subscription &&
                      new Date(r.subscription.end) > new Date()
                        ? r.subscription.start
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
      },
      setRun: (run) => set({ run }),
      startTrip: () =>
        set((s) => ({
          trips: {
            ...s.trips,
            [s.run]: {
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
          if (
            !rider.subscription ||
            new Date(rider.subscription.end) < new Date()
          )
            throw new Error("An active subscription is required to board.");
          if (
            s.trips[s.run].status === "Completed" ||
            s.trips[s.run].status === "Scheduled"
          )
            throw new Error("Start the trip before boarding.");
          if (rider.statuses[s.run] === "Absent")
            throw new Error("This rider has marked themselves absent today.");
          if (rider.statuses[s.run] === "Boarded") return;
          if (
            s.riders.filter((r) => r.statuses[s.run] === "Boarded").length >= 18
          )
            throw new Error("This shuttle has reached its 18-seat capacity.");
        }
        set((s) => ({
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
        const rider = verifyPass(token, get().riders);
        get().passengerStatus(rider.id, "Boarded");
      },
      reset: () =>
        set({
          riders: seedRiders(),
          receipts: [],
          activity: [event("Demo reset", "All demo data has been restored.")],
          trips: seedTrips(),
          run: "morning",
          riderId: "r1",
          serviceDay: dayKey(),
        }),
    }),
    {
      name: "shuttlepass-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, storageError, ...rest }) => rest,
      onRehydrateStorage: () => (state, error) => {
        if (state) state.setHydrated();
        if (error)
          useShuttleStore.setState({
            hydrated: true,
            storageError:
              "Local storage could not be loaded. This session is using fresh demo data.",
          });
      },
    },
  ),
);

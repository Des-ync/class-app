export type Role = "commuter" | "driver" | "admin";
export type RiderType = "Student" | "Worker";
export type Run = "morning" | "evening";
export type PassengerStatus =
  "Waiting" | "Boarded" | "Absent" | "Skipped" | "Completed";
export type TripStatus = "Scheduled" | "En Route" | "Arriving" | "Completed";
export interface Stop {
  id: string;
  name: string;
  landmark: string;
  x: number;
  y: number;
}
export interface Route {
  id: string;
  code: string;
  name: string;
  destination: string;
  stops: Stop[];
  color: string;
}
export interface Plan {
  id: string;
  name: string;
  price: number;
  pickup: "stop" | "home";
  description: string;
  features: string[];
}
export interface Subscription {
  planId: string;
  start: string;
  end: string;
  autoRenew: boolean;
}
export interface Rider {
  id: string;
  name: string;
  email: string;
  type: RiderType;
  routeId: string;
  stopId: string;
  pickup: "stop" | "home";
  address: string;
  morning: string;
  evening: string;
  seat: number;
  subscription: Subscription | null;
  statuses: Record<Run, PassengerStatus>;
}
export interface Receipt {
  requestId?: string;
  routeId?: string;
  seat?: number;
  id: string;
  riderId: string;
  planId: string;
  amount: number;
  method: string;
  date: string;
  start: string;
  end: string;
}
export interface Trip {
  status: TripStatus;
  progress: number;
  notifiedStops: string[];
}
export interface Activity {
  id: string;
  riderId?: string;
  title: string;
  detail: string;
  date: string;
}
export interface Booking {
  routeId: string;
  stopId: string;
  pickup: "stop" | "home";
  address: string;
  morning: string;
  evening: string;
}
export interface PaymentInput {
  requestId?: string;
  planId: string;
  method: string;
  account: string;
  expiry?: string;
  cvv?: string;
}

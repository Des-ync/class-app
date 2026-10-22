import { Plan, Rider, Route, Run, Trip } from "../types";
export const dayKey = (now = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 86400000).toISOString();
export const plans: Plan[] = [
  {
    id: "student",
    name: "Student Standard",
    price: 450,
    pickup: "stop",
    description: "A dependable ride to a brighter future.",
    features: [
      "Guaranteed weekday seat",
      "Morning & evening rides",
      "Live tracking & digital pass",
    ],
  },
  {
    id: "worker",
    name: "Worker Express",
    price: 650,
    pickup: "stop",
    description: "Your workday starts with peace of mind.",
    features: [
      "Priority express route",
      "Flexible evening return",
      "Air-conditioned shuttle",
    ],
  },
  {
    id: "vip",
    name: "Doorstep VIP",
    price: 950,
    pickup: "home",
    description: "From your front door to your destination.",
    features: [
      "Home pickup & drop-off",
      "All express benefits",
      "Personal pickup coordination",
    ],
  },
];
export const routes: Route[] = [
  {
    id: "east",
    code: "SP • 01",
    name: "East Legon → Airport",
    destination: "Airport City Offices",
    color: "#10B981",
    stops: [
      {
        id: "adj",
        name: "Adenta Barrier",
        landmark: "Shell station forecourt",
        x: 48,
        y: 218,
      },
      {
        id: "mad",
        name: "Madina Zongo Junction",
        landmark: "Ecobank bus shelter",
        x: 100,
        y: 172,
      },
      {
        id: "leg",
        name: "East Legon",
        landmark: "A&C Mall main entrance",
        x: 167,
        y: 190,
      },
      {
        id: "shi",
        name: "Shiashie",
        landmark: "Accra Mall footbridge",
        x: 212,
        y: 115,
      },
      {
        id: "air",
        name: "Airport City",
        landmark: "One Airport Square",
        x: 304,
        y: 65,
      },
    ],
  },
  {
    id: "school",
    code: "SP • 02",
    name: "Spintex → School District",
    destination: "Association International School",
    color: "#6366F1",
    stops: [
      {
        id: "com",
        name: "Community 18",
        landmark: "Junction Mall entrance",
        x: 48,
        y: 218,
      },
      {
        id: "bat",
        name: "Baatsona",
        landmark: "TotalEnergies station",
        x: 100,
        y: 172,
      },
      {
        id: "spi",
        name: "Spintex Road",
        landmark: "Palace Mall bus bay",
        x: 167,
        y: 190,
      },
      {
        id: "tes",
        name: "Teshie Link",
        landmark: "Community library",
        x: 212,
        y: 115,
      },
      {
        id: "sch",
        name: "School District",
        landmark: "School main gate",
        x: 304,
        y: 65,
      },
    ],
  },
  {
    id: "tema",
    code: "SP • 03",
    name: "Tema → Ridge",
    destination: "Ridge Business District",
    color: "#F59E0B",
    stops: [
      {
        id: "t1",
        name: "Tema Community 1",
        landmark: "Meridian plaza",
        x: 48,
        y: 218,
      },
      {
        id: "t2",
        name: "Motorway Roundabout",
        landmark: "GOIL station",
        x: 100,
        y: 172,
      },
      {
        id: "t3",
        name: "Accra Mall",
        landmark: "North parking entrance",
        x: 167,
        y: 190,
      },
      {
        id: "t4",
        name: "37 Station",
        landmark: "Military hospital bus bay",
        x: 212,
        y: 115,
      },
      {
        id: "t5",
        name: "Ridge",
        landmark: "World Trade Centre",
        x: 304,
        y: 65,
      },
    ],
  },
];
export const driver = {
  name: "Kwame Mensah",
  phone: "+233241234567",
  plate: "GR 4821–24",
  vehicle: "Toyota Coaster",
  capacity: 18,
  rating: "4.9",
  license: "GH-DL-204815",
};
export const morningTimes = ["06:00 AM", "06:30 AM", "06:45 AM", "07:00 AM"];
export const eveningTimes = ["04:30 PM", "05:00 PM", "05:30 PM", "06:30 PM"];
export function seedRiders(): Rider[] {
  const names = [
    "Ama Osei",
    "Kofi Asante",
    "Akosua Boateng",
    "Yaw Owusu",
    "Abena Addo",
    "Kojo Agyeman",
    "Efua Arthur",
    "Nana Appiah",
    "Esi Quaye",
    "Kwesi Darko",
    "Adwoa Sarpong",
    "Fiifi Annan",
    "Afia Baah",
    "Kweku Opoku",
  ];
  return names.map((name, i) => ({
    id: `r${i + 1}`,
    name,
    email: name.toLowerCase().replace(" ", ".") + "@demo.shuttlepass.app",
    type: i === 0 || i % 3 === 0 ? "Student" : "Worker",
    routeId: i === 0 ? "school" : "east",
    stopId: i === 0 ? "spi" : routes[0].stops[i % 4].id,
    pickup: i === 5 ? "home" : "stop",
    address:
      i === 5
        ? "14 Mango Lane, East Legon, near the pharmacy"
        : "12 Garden Road, Spintex, near Palace Mall",
    morning: "06:45 AM",
    evening: "05:30 PM",
    seat: i + 1,
    subscription: {
      planId: i === 5 ? "vip" : i === 0 || i % 3 === 0 ? "student" : "worker",
      start: addDays(new Date(), -7),
      end: addDays(new Date(), 23),
      autoRenew: true,
    },
    statuses: { morning: "Waiting", evening: "Waiting" },
  }));
}
export const seedTrips = (now = Date.now()): Record<Run, Trip> => ({
  morning: {
    status: "En Route",
    progress: 0.18,
    notifiedStops: [],
    lastUpdatedAt: now,
  },
  evening: {
    status: "Scheduled",
    progress: 0,
    notifiedStops: [],
    lastUpdatedAt: now,
  },
});

export const seedRouteTrips = (
  now = Date.now(),
): Record<string, Record<Run, Trip>> =>
  Object.fromEntries(routes.map((route) => [route.id, seedTrips(now)]));

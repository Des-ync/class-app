import { PaymentInput, Receipt, Rider } from "../types";
import { addDays, plans } from "../data/mockData";
export const delay = (ms = 500) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export function validatePayment(input: PaymentInput): string | null {
  if (
    ![
      "MTN MoMo",
      "Telecel Cash",
      "AirtelTigo Money",
      "Visa / Mastercard",
    ].includes(input.method)
  )
    return "Choose a supported payment method.";
  if (!plans.some((p) => p.id === input.planId))
    return "Please select a subscription plan.";
  if (input.method === "Visa / Mastercard") {
    const digits = input.account.replace(/\s/g, "");
    if (!/^\d{13,19}$/.test(digits))
      return "Enter a valid card number (13–19 digits).";
    let sum = 0,
      alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = Number(digits[i]);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    if (sum % 10)
      return "The card number did not pass validation. Demo card: 4242 4242 4242 4242.";
    if (!/^\d{2}\/\d{2}$/.test(input.expiry || ""))
      return "Enter expiry as MM/YY.";
    const [month, year] = input.expiry!.split("/").map(Number);
    if (
      month < 1 ||
      month > 12 ||
      new Date(2000 + year, month, 1).getTime() <= Date.now()
    )
      return "The card expiry must be in the future.";
    if (!/^\d{3,4}$/.test(input.cvv || ""))
      return "Enter a 3 or 4 digit security code.";
  } else if (
    !/^(?:\+233|233|0)\d{9}$/.test(input.account.replace(/[\s-]/g, ""))
  )
    return "Enter a Ghana mobile number, e.g. 024 123 4567.";
  return null;
}
export const api = {
  async login(email: string, name: string) {
    await delay();
    if (!/^\S+@\S+\.\S+$/.test(email))
      throw new Error("Enter a valid email address.");
    if (name.trim().length < 2) throw new Error("Enter your full name.");
    return { email: email.trim().toLowerCase(), name: name.trim() };
  },
  async checkout(input: PaymentInput, rider: Rider): Promise<Receipt> {
    const error = validatePayment(input);
    if (error) throw new Error(error);
    await delay(1100);
    const start =
      rider.subscription &&
      new Date(rider.subscription.end).getTime() > Date.now()
        ? rider.subscription.end
        : new Date().toISOString();
    return {
      id: `SP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      riderId: rider.id,
      planId: input.planId,
      amount: plans.find((p) => p.id === input.planId)!.price,
      method: input.method,
      date: new Date().toISOString(),
      start,
      end: addDays(new Date(start), 30),
    };
  },
};
function demoHash(payload: string): string {
  let hash = 2166136261;
  for (const c of `shuttlepass-local-demo:${payload}`) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
export function passToken(rider: Rider, now = Date.now()) {
  const payload = `SP1|${rider.id}|${rider.routeId}|${rider.seat}|${Math.floor(now / 30000)}`;
  return `${payload}|${demoHash(payload)}`;
}
export function verifyPass(
  token: string,
  riders: Rider[],
  now = Date.now(),
): Rider {
  const parts = token.trim().split("|");
  const [version, id, route, seat, bucket, hash] = parts;
  if (parts.length !== 6 || hash !== demoHash(parts.slice(0, 5).join("|")))
    throw new Error("Invalid or expired pass. Refresh the rider’s QR code.");
  const rider = riders.find((r) => r.id === id);
  if (
    version !== "SP1" ||
    !rider ||
    rider.routeId !== route ||
    String(rider.seat) !== seat ||
    Math.abs(Math.floor(now / 30000) - Number(bucket)) > 1 ||
    !Number.isFinite(Number(bucket))
  )
    throw new Error(
      "Invalid or expired pass. Ask the rider to refresh their pass.",
    );
  if (!rider.subscription || new Date(rider.subscription.end).getTime() < now)
    throw new Error("This subscription has expired.");
  return rider;
}

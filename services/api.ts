import { PaymentInput, Receipt, Rider } from "../types";
import { isSubscriptionActive, operationId } from "./subscriptions";
import { addDays, plans } from "../data/mockData";
export const delay = (ms = 500) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export function validatePayment(input: PaymentInput): string | null {
  if (
    input.requestId !== undefined &&
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.requestId)
  )
    return "Use a valid payment request ID (1–128 letters, numbers, underscores or hyphens).";
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
  async checkout(payment: PaymentInput, customer: Rider): Promise<Receipt> {
    const input = { ...payment };
    const rider = {
      ...customer,
      subscription: customer.subscription ? { ...customer.subscription } : null,
    };
    const error = validatePayment(input);
    if (error) throw new Error(error);
    await delay(1100);
    const start = isSubscriptionActive(rider.subscription)
      ? rider.subscription!.end
      : new Date().toISOString();
    return {
      id: operationId("SP"),
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
export { passToken, verifyPass } from "./ticketing";

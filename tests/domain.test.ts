import { strict as assert } from "node:assert";
import { test } from "node:test";
import { api, passToken, validatePayment, verifyPass } from "../services/api";
import { seedRiders, addDays } from "../data/mockData";
const card = {
  planId: "worker",
  method: "Visa / Mastercard",
  account: "4242 4242 4242 4242",
  expiry: "12/35",
  cvv: "123",
};
test("checkout validates payment inputs and rejects expired cards", () => {
  assert.equal(validatePayment(card), null);
  assert.match(
    validatePayment({ ...card, account: "4242424242424241" })!,
    /validation/,
  );
  assert.match(validatePayment({ ...card, expiry: "01/20" })!, /future/);
  assert.match(validatePayment({ ...card, cvv: "1" })!, /security/);
  assert.equal(
    validatePayment({
      planId: "vip",
      method: "MTN MoMo",
      account: "0241234567",
    }),
    null,
  );
  assert.match(
    validatePayment({ planId: "vip", method: "MTN MoMo", account: "123" })!,
    /Ghana/,
  );
});
test("payments extend an active subscription by exactly 30 days", async () => {
  const rider = seedRiders()[1];
  const receipt = await api.checkout(card, rider);
  assert.equal(receipt.start, rider.subscription!.end);
  assert.equal(
    new Date(receipt.end).getTime() - new Date(receipt.start).getTime(),
    30 * 86400000,
  );
  assert.equal(receipt.amount, 650);
  assert.equal(receipt.riderId, rider.id);
  assert.equal("account" in receipt, false);
});
test("new subscriptions start immediately", async () => {
  const rider = { ...seedRiders()[0], subscription: null };
  const before = Date.now();
  const receipt = await api.checkout({ ...card, planId: "student" }, rider);
  assert.ok(new Date(receipt.start).getTime() >= before);
  assert.equal(receipt.amount, 450);
});
test("rotating passes validate identity, route, seat, time and subscription", () => {
  const riders = seedRiders();
  const now = Date.now();
  const token = passToken(riders[0], now);
  assert.equal(verifyPass(token, riders, now).id, "r1");
  assert.throws(() => verifyPass(token, riders, now + 90000), /expired/);
  assert.throws(
    () => verifyPass(token.replace("|school|", "|east|"), riders, now),
    /Invalid/,
  );
  assert.throws(
    () => verifyPass(token.replace("|1|", "|18|"), riders, now),
    /Invalid/,
  );
  assert.throws(
    () => verifyPass("SP1|r1|school|1|oops", riders, now),
    /Invalid/,
  );
  riders[0].subscription!.end = addDays(new Date(), -1);
  assert.throws(() => verifyPass(token, riders, now), /subscription/);
});
test("local account registration validates and normalizes identity", async () => {
  assert.deepEqual(await api.login(" AMA@EXAMPLE.COM ".trim(), " Ama Osei "), {
    name: "Ama Osei",
    email: "ama@example.com",
  });
  await assert.rejects(api.login("bad", "Ama"), /email/);
});

import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  Body,
  Button,
  C,
  Card,
  Chips,
  Field,
  Icon,
  Label,
  Page,
  s,
  Sheet,
  Title,
  Badge,
} from "../components/ui";
import { operationId } from "../services/subscriptions";
import { plans } from "../data/mockData";
import { Receipt } from "../types";
import { dateLabel, useRider } from "./Commuter";
const methods = [
  "MTN MoMo",
  "Telecel Cash",
  "AirtelTigo Money",
  "Visa / Mastercard",
];
export function receiptText(receipt: Receipt, name: string) {
  return `SHUTTLEPASS\nPAYMENT RECEIPT (SIMULATED)\n\nReceipt: ${receipt.id}\nCustomer: ${name}\nPlan: ${plans.find((p) => p.id === receipt.planId)?.name}\nPaid: GHS ${receipt.amount.toFixed(2)}\nPayment method: ${receipt.method}\nDate: ${dateLabel(receipt.date)}\nService period: ${dateLabel(receipt.start)} - ${dateLabel(receipt.end)}\n\nPayment status: Successful (demo)\nNo real funds were collected.\nThank you for riding with ShuttlePass.`;
}
export async function exportReceipt(receipt: Receipt, name: string) {
  const content = receiptText(receipt, name);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${receipt.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, `${receipt.id}.txt`);
  file.write(content);
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/plain",
      dialogTitle: "Save payment receipt",
    });
  else
    throw new Error(
      "Sharing is unavailable on this device. Your receipt remains available in billing history.",
    );
}
export function Plans() {
  const { store, rider } = useRider();
  const [selected, setSelected] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(() => operationId("payment"));
  const [method, setMethod] = useState(methods[0]);
  const [account, setAccount] = useState("024 123 4567");
  const expiry = "12/35";
  const cvv = "123";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [saveError, setSaveError] = useState("");
  const receipts = store.receipts.filter((r) => r.riderId === rider.id);
  const plan = plans.find((p) => p.id === selected);
  const pay = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await store.checkout({
        planId: selected,
        requestId,
        method,
        account,
        expiry,
        cvv,
      });
      setReceipt(result);
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title="One month. Sorted."
      subtitle="Simple plans for the places you go."
    >
      <Card style={{ backgroundColor: C.tint }}>
        <View style={s.row}>
          <Icon name="sparkles-outline" color={C.darkGreen} />
          <View style={{ flex: 1 }}>
            <Title>Two rides a day. Zero daily fares.</Title>
            <Body>
              Every plan includes a guaranteed weekday seat, live tracking, and
              your digital pass.
            </Body>
          </View>
        </View>
      </Card>
      {plans.map((p, i) => (
        <Card
          key={p.id}
          style={i === 1 ? { borderColor: C.green, borderWidth: 2 } : undefined}
        >
          <View style={s.row}>
            <Icon
              name={
                i === 0
                  ? "school-outline"
                  : i === 1
                    ? "briefcase-outline"
                    : "home-outline"
              }
              color={C.darkGreen}
            />
            <Badge
              text={
                i === 1
                  ? "COMMUTER FAVORITE"
                  : p.pickup === "home"
                    ? "DOOR TO DOOR"
                    : "SCHOOL DAYS"
              }
              green={i === 1}
            />
          </View>
          <Title>{p.name}</Title>
          <Body>{p.description}</Body>
          <Text style={s.big}>
            <Text style={{ fontSize: 15 }}>GHS </Text>
            {p.price}
            <Text style={{ fontSize: 13, fontWeight: "500", color: C.muted }}>
              {" "}
              / month
            </Text>
          </Text>
          {p.features.map((f) => (
            <View style={{ flexDirection: "row", gap: 8 }} key={f}>
              <Icon name="checkmark-circle" size={17} color={C.darkGreen} />
              <Body>{f}</Body>
            </View>
          ))}
          <Button
            title={
              rider.subscription?.planId === p.id
                ? "Renew this plan"
                : "Choose this plan"
            }
            secondary={i !== 1}
            onPress={() => {
              setSelected(p.id);
              setRequestId(operationId("payment"));
              setError("");
            }}
          />
        </Card>
      ))}
      <Title>Billing history</Title>
      {receipts.length === 0 ? (
        <Card>
          <Icon name="receipt-outline" color={C.muted} />
          <Body>
            Your receipts will appear here after your first demo payment.
          </Body>
        </Card>
      ) : (
        receipts.map((r) => (
          <Card key={r.id}>
            <View style={s.row}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontWeight: "700", color: C.navy }}>
                  {plans.find((p) => p.id === r.planId)?.name}
                </Text>
                <Body>
                  {dateLabel(r.date)} · {r.method}
                </Body>
              </View>
              <Text style={{ fontWeight: "700", color: C.darkGreen }}>
                GHS {r.amount}
              </Text>
            </View>
            <Button
              title="View receipt"
              secondary
              onPress={() => {
                setReceipt(r);
                setSaveError("");
              }}
            />
          </Card>
        ))
      )}
      <Sheet
        visible={!!selected}
        title="Secure your next 30 days"
        onClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        <Title>
          {plan?.name} · GHS {plan?.price}
        </Title>
        <Body>
          Renewals extend an active subscription by 30 days. Switching plans
          applies the selected pickup tier immediately.
        </Body>
        <Chips
          options={methods}
          value={method}
          onChange={(v) => {
            setMethod(v);
            setAccount(
              v === "Visa / Mastercard"
                ? "4242 4242 4242 4242"
                : "024 123 4567",
            );
            setError("");
          }}
        />
        <Body>
          Demo checkout uses fixed test details. Real card and mobile money
          numbers are never requested.
        </Body>
        <Field
          label={
            method === "Visa / Mastercard"
              ? "Demo card number"
              : "Demo mobile money number"
          }
          value={account}
          editable={false}
        />
        {method === "Visa / Mastercard" && (
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Expiry (MM/YY)" value={expiry} editable={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Security code"
                value={cvv}
                editable={false}
                secureTextEntry
              />
            </View>
          </View>
        )}
        <Card>
          <Label>PAYMENT SUMMARY</Label>
          <View style={s.row}>
            <Body>Monthly subscription</Body>
            <Title>GHS {plan?.price}</Title>
          </View>
          <View style={s.row}>
            <Body>Service fee</Body>
            <Text>GHS 0</Text>
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Title>Total today</Title>
            <Title>GHS {plan?.price}</Title>
          </View>
        </Card>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button
          title={`Simulate payment · GHS ${plan?.price}`}
          loading={busy}
          onPress={pay}
        />
        <Body>
          This is a local payment simulation. No money is charged and no payment
          details are collected.
        </Body>
      </Sheet>
      <Sheet
        visible={!!receipt}
        title="Payment receipt"
        onClose={() => setReceipt(null)}
      >
        {receipt && (
          <>
            <Badge text="✓ PAYMENT SUCCESSFUL · DEMO" green />
            <Text
              selectable
              style={{ fontSize: 13, lineHeight: 24, color: C.navy }}
            >
              {receiptText(receipt, rider.name)}
            </Text>
            {!!saveError && <Text style={s.error}>{saveError}</Text>}
            <Button
              title="Download / share receipt"
              icon="download-outline"
              onPress={() =>
                exportReceipt(receipt, rider.name).catch((e) =>
                  setSaveError(e.message),
                )
              }
            />
          </>
        )}
      </Sheet>
    </Page>
  );
}

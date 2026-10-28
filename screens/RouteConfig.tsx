import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
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
  Title,
  Badge,
} from "../components/ui";
import { routes, morningTimes, eveningTimes, plans } from "../data/mockData";
import { Booking } from "../types";
import { useRider } from "./Commuter";
export function RouteConfig({ navigation }: { navigation: any }) {
  const { store, rider } = useRider();
  const [booking, setBooking] = useState<Booking>({
    routeId: rider.routeId,
    stopId: rider.stopId,
    pickup: rider.pickup,
    address: rider.address,
    morning: rider.morning,
    evening: rider.evening,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const route = routes.find((r) => r.id === booking.routeId)!;
  const update = (value: Partial<Booking>) => {
    setBooking({ ...booking, ...value });
    setSaved(false);
    setError("");
  };
  const price =
    booking.pickup === "home" ? 950 : rider.type === "Student" ? 450 : 650;
  return (
    <Page
      title="Your route. Your rhythm."
      subtitle="Set up a commute that fits your day."
    >
      <Title>01 Choose your destination</Title>
      {routes.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="radio"
          accessibilityState={{ checked: r.id === booking.routeId }}
          onPress={() => update({ routeId: r.id, stopId: r.stops[2].id })}
        >
          <Card
            style={
              r.id === booking.routeId
                ? { borderColor: C.green, backgroundColor: C.tint }
                : undefined
            }
          >
            <View style={s.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.darkGreen,
                    fontWeight: "700",
                  }}
                >
                  {r.code}
                </Text>
                <Title>{r.destination}</Title>
                <Body>{r.name}</Body>
              </View>
              <Icon
                name={
                  r.id === booking.routeId
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                color={r.id === booking.routeId ? C.darkGreen : C.muted}
              />
            </View>
          </Card>
        </Pressable>
      ))}
      <Card>
        <Title>02 Where do we meet you?</Title>
        <Chips
          options={["Designated bus stop", "Doorstep home pickup"]}
          value={
            booking.pickup === "home"
              ? "Doorstep home pickup"
              : "Designated bus stop"
          }
          onChange={(v) =>
            update({ pickup: v === "Doorstep home pickup" ? "home" : "stop" })
          }
        />
        {booking.pickup === "stop" ? (
          route.stops.slice(0, -1).map((stop) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: booking.stopId === stop.id }}
              key={stop.id}
              onPress={() => update({ stopId: stop.id })}
              style={[s.row, { paddingVertical: 8 }]}
            >
              <Icon
                name={
                  booking.stopId === stop.id
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                color={booking.stopId === stop.id ? C.darkGreen : C.muted}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "700", color: C.navy }}>
                  {stop.name}
                </Text>
                <Body>{stop.landmark}</Body>
              </View>
            </Pressable>
          ))
        ) : (
          <>
            <Field
              label="Residential address & nearest landmark"
              value={booking.address}
              onChangeText={(address) => update({ address })}
              multiline
              placeholder="House number, street, neighborhood, landmark"
            />
            <Label>NEAREST ROUTE HUB</Label>
            <Chips
              options={route.stops.slice(0, -1).map((p) => p.name)}
              value={
                route.stops.find((p) => p.id === booking.stopId)?.name || ""
              }
              onChange={(name) =>
                update({ stopId: route.stops.find((p) => p.name === name)!.id })
              }
            />
            <Body>
              Doorstep VIP covers home pickup within your chosen route’s
              neighborhood.
            </Body>
          </>
        )}
      </Card>
      <Card>
        <Title>03 Your daily schedule</Title>
        <Label>MORNING PICKUP WINDOW</Label>
        <Chips
          options={morningTimes}
          value={booking.morning}
          onChange={(morning) => update({ morning })}
        />
        <Label>EVENING RETURN WINDOW</Label>
        <Chips
          options={eveningTimes}
          value={booking.evening}
          onChange={(evening) => update({ evening })}
        />
      </Card>
      <Card dark>
        <Text style={{ color: C.onHeroMuted, fontSize: 12 }}>
          YOUR RECOMMENDED MONTHLY PLAN
        </Text>
        <Text style={{ fontSize: 22, color: C.onHero, fontWeight: "700" }}>
          {booking.pickup === "home"
            ? "Doorstep VIP"
            : rider.type === "Student"
              ? "Student Standard"
              : "Worker Express"}
        </Text>
        <Text style={{ fontSize: 32, color: C.onHero, fontWeight: "700" }}>
          GHS {price}
          <Text style={{ fontSize: 13 }}> / month</Text>
        </Text>
        <Body light>
          {booking.pickup === "home"
            ? "Doorstep pickup & return included."
            : "Designated stop pickup & return included."}
        </Body>
      </Card>
      {!!error && <Text style={s.error}>{error}</Text>}
      {saved && <Badge text="✓ ROUTE & SCHEDULE SAVED" green />}
      <Button
        title="Save route & schedule"
        icon="checkmark-outline"
        onPress={() => {
          try {
            store.configure(booking);
            setSaved(true);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {saved &&
        plans.find((p) => p.id === rider.subscription?.planId)?.pickup !==
          booking.pickup && (
          <Button
            title="Activate the matching plan"
            secondary
            onPress={() => navigation.navigate("Plans")}
          />
        )}
    </Page>
  );
}

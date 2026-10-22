import React, { useEffect, useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  Body,
  Button,
  C,
  Card,
  Chips,
  Icon,
  Label,
  Page,
  s,
  Sheet,
  Title,
  Badge,
} from "../components/ui";
import { RouteMap } from "../components/RouteMap";
import { driver, eveningTimes, plans, routes } from "../data/mockData";
import { useShuttleStore } from "../store/useShuttleStore";
import { passToken } from "../services/api";
export const useRider = () => {
  const store = useShuttleStore();
  return { store, rider: store.riders.find((r) => r.id === store.riderId)! };
};
export const callDriver = () =>
  Linking.openURL(`tel:${driver.phone}`).catch(() => {});
export const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Home({ navigation }: { navigation: any }) {
  const { store, rider } = useRider();
  const [slot, setSlot] = useState(false);
  const [absent, setAbsent] = useState(false);
  const [evening, setEvening] = useState(rider.evening);
  const route = routes.find((r) => r.id === rider.routeId)!;
  const sub = rider.subscription;
  const active = !!sub && new Date(sub.end) > new Date();
  const days = active
    ? Math.ceil((new Date(sub!.end).getTime() - Date.now()) / 86400000)
    : 0;
  const plan = plans.find((p) => p.id === sub?.planId);
  return (
    <Page
      title={`Good morning, ${rider.name.split(" ")[0]}`}
      subtitle={new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
      action={
        <View style={s.avatar}>
          <Text style={{ fontWeight: "800", color: C.darkGreen }}>
            {rider.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Text>
        </View>
      }
    >
      <Card dark>
        <View style={s.row}>
          <Text
            style={{
              color: "#A7F3D0",
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.5,
            }}
          >
            YOUR MONTHLY FREEDOM
          </Text>
          <Badge text={active ? "● ACTIVE" : "NO ACTIVE PASS"} green={active} />
        </View>
        <Text style={{ color: "white", fontSize: 25, fontWeight: "800" }}>
          {plan?.name || "Make your commute yours"}
        </Text>
        <View style={s.row}>
          <View>
            <Text style={{ color: "white", fontSize: 38, fontWeight: "800" }}>
              {days}
              <Text style={{ fontSize: 13, color: "#CBD5E1" }}> days left</Text>
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 11 }}>
              {sub
                ? `Valid until ${dateLabel(sub.end)}`
                : "Choose a plan to reserve your seat"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open boarding pass"
            onPress={() => navigation.navigate("Pass")}
            style={{
              backgroundColor: "#FFFFFF14",
              padding: 16,
              borderRadius: 16,
            }}
          >
            <Icon name="qr-code-outline" color="white" size={32} />
          </Pressable>
        </View>
        <View style={s.row}>
          <Text style={{ color: "#CBD5E1", fontSize: 12 }}>
            Auto-renew preference · simulated billing
          </Text>
          <Switch
            accessibilityLabel="Auto renew subscription"
            value={sub?.autoRenew || false}
            onValueChange={store.toggleRenew}
            disabled={!sub}
            trackColor={{ true: C.green }}
          />
        </View>
        <Button
          title={active ? "View boarding pass" : "Explore monthly plans"}
          icon={active ? "qr-code-outline" : "card-outline"}
          onPress={() => navigation.navigate(active ? "Pass" : "Plans")}
        />
      </Card>
      <View style={s.row}>
        <Title>Today’s journeys</Title>
        <Badge text="WEEKDAY SERVICE" />
      </View>
      {(["morning", "evening"] as const).map((run) => {
        const status = rider.statuses[run];
        const trip = store.trips[run];
        const text =
          status !== "Waiting"
            ? status
            : trip.notifiedStops.includes(rider.stopId)
              ? "Arriving in 2 mins"
              : trip.status;
        return (
          <Card key={run}>
            <View style={s.row}>
              <View style={s.row}>
                <View
                  style={[
                    s.avatar,
                    {
                      backgroundColor:
                        run === "morning" ? "#FEF3C7" : "#EDE9FE",
                    },
                  ]}
                >
                  <Icon
                    name={run === "morning" ? "sunny-outline" : "moon-outline"}
                    color={run === "morning" ? "#B45309" : "#7C3AED"}
                  />
                </View>
                <View style={{ gap: 5 }}>
                  <Title>
                    {run === "morning" ? "Morning pickup" : "Evening return"}
                  </Title>
                  <Label>
                    {run === "morning"
                      ? "HOME → DESTINATION"
                      : "DESTINATION → HOME"}
                  </Label>
                </View>
              </View>
              <Badge
                text={text}
                green={
                  text.includes("Arriving") ||
                  text === "Boarded" ||
                  text === "En Route"
                }
              />
            </View>
            <Text style={s.big}>{rider[run]}</Text>
            <View style={s.row}>
              <Icon
                name={
                  rider.pickup === "home" ? "home-outline" : "location-outline"
                }
                color={C.darkGreen}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "700", color: C.navy }}>
                  {rider.pickup === "home"
                    ? "Doorstep home pickup"
                    : route.stops.find((p) => p.id === rider.stopId)?.name}
                </Text>
                <Body>
                  {rider.pickup === "home"
                    ? rider.address
                    : route.stops.find((p) => p.id === rider.stopId)?.landmark}
                </Body>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: C.navy }}
                >
                  {driver.name} · {driver.plate}
                </Text>
                <Body>
                  {driver.vehicle} · Seat {String(rider.seat).padStart(2, "0")}
                </Body>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call driver"
                onPress={callDriver}
                style={s.avatar}
              >
                <Icon name="call-outline" color={C.darkGreen} />
              </Pressable>
            </View>
            <Button
              title={
                run === "morning"
                  ? "Track my shuttle"
                  : "Change evening time slot"
              }
              secondary
              icon={run === "morning" ? "navigate-outline" : "time-outline"}
              onPress={() => {
                if (run === "morning") {
                  store.setRun("morning");
                  navigation.navigate("Track");
                } else {
                  setEvening(rider.evening);
                  setSlot(true);
                }
              }}
            />
          </Card>
        );
      })}
      <Button
        title="Mark absent for today"
        secondary
        danger
        onPress={() => setAbsent(true)}
      />
      <Card>
        <View style={s.row}>
          <Icon name="shield-checkmark-outline" color={C.darkGreen} />
          <View style={{ flex: 1, gap: 4 }}>
            <Title>A familiar ride. Every day.</Title>
            <Body>
              Verified driver, guaranteed seat, and peace of mind for your daily
              commute.
            </Body>
          </View>
        </View>
      </Card>
      <Sheet
        visible={slot}
        title="Make the evening work for you"
        onClose={() => setSlot(false)}
      >
        <Body>
          Choose today’s return window. Your driver’s manifest updates
          immediately.
        </Body>
        <Chips options={eveningTimes} value={evening} onChange={setEvening} />
        <Button
          title="Confirm return time"
          onPress={() => {
            store.setEvening(evening);
            setSlot(false);
          }}
        />
      </Sheet>
      <Sheet
        visible={absent}
        title="Taking the day off?"
        onClose={() => setAbsent(false)}
      >
        <Body>
          This marks both journeys absent for today and informs your driver.
          Your subscription stays active.
        </Body>
        <Button
          title="Yes, mark me absent"
          danger
          secondary
          onPress={() => {
            store.markAbsent();
            setAbsent(false);
          }}
        />
        <Button
          title="Keep my rides"
          secondary
          onPress={() => setAbsent(false)}
        />
      </Sheet>
    </Page>
  );
}
export function Tracker() {
  const { store, rider } = useRider();
  const route = routes.find((r) => r.id === rider.routeId)!;
  const trip = store.trips[store.run];
  const points =
    store.run === "evening" ? [...route.stops].reverse() : route.stops;
  const target =
    points.findIndex((p) => p.id === rider.stopId) / (points.length - 1);
  const eta = Math.max(0, Math.ceil((target - trip.progress) * 25));
  const occupancy = store.riders.filter(
    (r) => r.statuses[store.run] === "Boarded",
  ).length;
  const [selected, setSelected] = useState("");
  return (
    <Page
      title="Your ride, in sight"
      subtitle={`${route.code} · ${route.name}`}
    >
      <Chips
        options={["morning", "evening"]}
        value={store.run}
        onChange={store.setRun}
      />
      <RouteMap
        route={route}
        progress={trip.progress}
        reverse={store.run === "evening"}
      />
      <Card>
        <View style={s.row}>
          <View>
            <Label>TO YOUR PICKUP</Label>
            <Text style={s.big}>
              {trip.status === "Scheduled"
                ? "Scheduled"
                : trip.status === "Completed"
                  ? "Arrived"
                  : eta
                    ? `${eta} min`
                    : "At your stop"}
            </Text>
          </View>
          <Badge text={trip.status} green={trip.status !== "Scheduled"} />
        </View>
        <View style={s.row}>
          <Body>
            {driver.plate} · {driver.vehicle}
          </Body>
          <Text style={{ fontWeight: "700", color: C.darkGreen }}>
            {occupancy}/{driver.capacity} aboard
          </Text>
        </View>
        <View
          style={{ height: 6, borderRadius: 4, backgroundColor: "#E2E8F0" }}
        >
          <View
            style={{
              height: 6,
              borderRadius: 4,
              width: `${(occupancy / driver.capacity) * 100}%`,
              backgroundColor: C.green,
            }}
          />
        </View>
      </Card>
      <Card>
        <Title>Along the way</Title>
        {points.map((stop, i) => (
          <Pressable
            key={stop.id}
            accessibilityRole="button"
            onPress={() => setSelected(selected === stop.id ? "" : stop.id)}
            style={s.row}
          >
            <View style={{ width: 28, alignItems: "center" }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor:
                    trip.progress >= i / (points.length - 1)
                      ? C.green
                      : "white",
                  borderWidth: 2,
                  borderColor: C.green,
                }}
              />
              {i < points.length - 1 && (
                <View
                  style={{
                    width: 2,
                    height: 30,
                    backgroundColor: C.line,
                    marginTop: 5,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, gap: 4, paddingBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.navy }}>
                {stop.name} {stop.id === rider.stopId ? "· Your stop" : ""}
              </Text>
              <Body>
                {selected === stop.id
                  ? stop.landmark
                  : trip.progress >= i / (points.length - 1)
                    ? "Passed"
                    : "Upcoming stop"}
              </Body>
            </View>
            {stop.id === rider.stopId && (
              <Icon name="person-circle-outline" color={C.darkGreen} />
            )}
          </Pressable>
        ))}
      </Card>
      <Card>
        <View style={s.row}>
          <View style={s.avatar}>
            <Text style={{ fontWeight: "800", color: C.darkGreen }}>KM</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Title>{driver.name}</Title>
            <Body>★ {driver.rating} · Verified shuttle partner</Body>
          </View>
        </View>
        <Button
          title="Call your driver"
          icon="call-outline"
          secondary
          onPress={callDriver}
        />
      </Card>
      <Body>
        Location and ETA are simulated for this demo. Tap a stop for its
        landmark.
      </Body>
    </Page>
  );
}
export function Pass({ navigation }: { navigation: any }) {
  const { rider } = useRider();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const active =
    rider.subscription && new Date(rider.subscription.end).getTime() > now;
  const route = routes.find((r) => r.id === rider.routeId)!;
  const plan = plans.find((p) => p.id === rider.subscription?.planId);
  const mismatch = rider.pickup === "home" && plan?.pickup !== "home";
  const [show, setShow] = useState(false);
  return (
    <Page
      title="One pass. Every journey."
      subtitle="Your guaranteed seat is right here."
    >
      {active ? (
        <>
          <Card style={{ alignItems: "center", padding: 28 }}>
            <Badge text="● ACTIVE BOARDING PASS" green />
            <View
              style={[s.avatar, { width: 76, height: 76, borderRadius: 38 }]}
            >
              <Text
                style={{ fontSize: 25, color: C.darkGreen, fontWeight: "800" }}
              >
                {rider.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </View>
            <Title>{rider.name}</Title>
            <Body>
              {rider.type} · {plan?.name}
            </Body>
            <View
              style={{
                padding: 16,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.line,
              }}
            >
              <QRCode
                value={passToken(rider, now)}
                size={210}
                color={C.navy}
                backgroundColor="white"
              />
            </View>
            <Text
              style={{ fontSize: 11, color: C.darkGreen, fontWeight: "700" }}
            >
              SECURITY TOKEN REFRESHES IN {30 - (Math.floor(now / 1000) % 30)}s
            </Text>
            <View style={[s.row, { width: "100%" }]}>
              <View>
                <Label>ROUTE</Label>
                <Title>{route.code}</Title>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Label>YOUR SEAT</Label>
                <Title>{String(rider.seat).padStart(2, "0")}</Title>
              </View>
            </View>
            <View style={[s.divider, { width: "100%" }]} />
            <Body>
              {dateLabel(rider.subscription!.start)} —{" "}
              {dateLabel(rider.subscription!.end)}
            </Body>
            <Body>{route.name}</Body>
          </Card>
          {mismatch && (
            <Card>
              <Title>Doorstep upgrade needed</Title>
              <Body>
                Your route now uses home pickup. Activate Doorstep VIP to cover
                the new pickup service.
              </Body>
              <Button
                title="Upgrade plan"
                onPress={() => navigation.navigate("Plans")}
              />
            </Card>
          )}
          <Button
            title={show ? "Hide demo scan token" : "Show demo scan token"}
            secondary
            onPress={() => setShow(!show)}
          />
          {show && (
            <Card>
              <Text
                selectable
                style={{ fontFamily: "monospace", fontSize: 12 }}
              >
                {passToken(rider, now)}
              </Text>
              <Body>
                Copy this token into the driver’s QR validator. Demo tokens
                rotate every 30 seconds.
              </Body>
            </Card>
          )}
          <Body>
            Show this QR to your driver at boarding. Token validation is
            simulated locally and is not a production security system.
          </Body>
        </>
      ) : (
        <Card>
          <Icon name="ticket-outline" size={42} color={C.darkGreen} />
          <Title>Your next chapter starts here</Title>
          <Body>
            Activate a monthly plan to unlock your digital pass and guaranteed
            daily seat.
          </Body>
          <Button
            title="Choose a subscription"
            onPress={() => navigation.navigate("Plans")}
          />
        </Card>
      )}
    </Page>
  );
}

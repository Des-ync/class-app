import React, { useState } from "react";
import { Text, View } from "react-native";
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
import { driver, routes } from "../data/mockData";
import { useShuttleStore } from "../store/useShuttleStore";
import { passToken } from "../services/api";
import { RouteMap } from "../components/RouteMap";
export function Driver() {
  const store = useShuttleStore();
  const [routeId, setRouteId] = useState("east");
  const [scanner, setScanner] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [end, setEnd] = useState(false);
  const route = routes.find((r) => r.id === routeId)!;
  const trip = store.trips[store.run];
  const riders = store.riders.filter((r) => r.routeId === routeId);
  const boarded = riders.filter(
    (r) => r.statuses[store.run] === "Boarded",
  ).length;
  const stops =
    store.run === "morning" ? route.stops : [...route.stops].reverse();
  const attempt = (fn: () => void, message: string) => {
    setError("");
    try {
      fn();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Page
      title="Let’s get them there."
      subtitle={`${driver.name} · ${driver.plate}`}
    >
      <Chips
        options={["morning", "evening"]}
        value={store.run}
        onChange={(v) => {
          store.setRun(v);
          setNotice("");
        }}
      />
      <Card dark>
        <View style={s.row}>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
            {store.run === "morning" ? "Morning run" : "Evening run"}
          </Text>
          <Badge
            text={trip.status}
            green={trip.status === "En Route" || trip.status === "Arriving"}
          />
        </View>
        <Body light>
          {store.run === "morning"
            ? "Inbound · Home to school & work"
            : "Outbound · School & work to home"}
        </Body>
        <View style={s.row}>
          {[
            [riders.length, "ASSIGNED"],
            [boarded, "BOARDED"],
            [
              riders.filter((r) => r.statuses[store.run] === "Waiting").length,
              "WAITING",
            ],
          ].map(([n, label]) => (
            <View key={label} style={{ gap: 6 }}>
              <Text style={{ fontSize: 30, color: "white", fontWeight: "800" }}>
                {n}
              </Text>
              <Text
                style={{ fontSize: 10, color: "#94A3B8", letterSpacing: 1 }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        {trip.status === "Scheduled" || trip.status === "Completed" ? (
          <Button
            title="Start trip"
            icon="play"
            onPress={() =>
              attempt(
                store.startTrip,
                "Trip started. Riders can track this run.",
              )
            }
          />
        ) : (
          <Button
            title="End trip"
            icon="stop"
            secondary
            onPress={() => setEnd(true)}
          />
        )}
      </Card>
      <Label>MANIFEST ROUTE</Label>
      <Chips
        options={routes.map((r) => r.code)}
        value={route.code}
        onChange={(code) => setRouteId(routes.find((r) => r.code === code)!.id)}
      />
      <RouteMap
        route={route}
        progress={trip.progress}
        reverse={store.run === "evening"}
      />
      <View style={s.row}>
        <Title>Passenger manifest</Title>
        <Badge text={`${boarded}/${driver.capacity} aboard`} green />
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && <Badge text={notice} green />}
      <Button
        title="Scan QR / validate pass"
        icon="qr-code-outline"
        onPress={() => {
          setScanner(true);
          setError("");
          setToken("");
        }}
      />
      {stops.map((stop, index) => {
        const passengers = riders.filter((r) => r.stopId === stop.id);
        if (!passengers.length) return null;
        return (
          <Card key={stop.id}>
            <View style={s.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    color: C.darkGreen,
                    fontSize: 10,
                    fontWeight: "800",
                    letterSpacing: 1,
                  }}
                >
                  STOP {String(index + 1).padStart(2, "0")}
                </Text>
                <Title>{stop.name}</Title>
                <Body>{stop.landmark}</Body>
              </View>
              <Badge text={`${passengers.length} riders`} />
            </View>
            <Button
              title={
                trip.notifiedStops.includes(stop.id)
                  ? "Arrival notification sent"
                  : "Notify arriving"
              }
              icon="notifications-outline"
              secondary
              disabled={
                trip.status === "Scheduled" ||
                trip.status === "Completed" ||
                trip.notifiedStops.includes(stop.id)
              }
              onPress={() =>
                attempt(
                  () => store.notify(stop.id),
                  `${stop.name}: riders notified.`,
                )
              }
            />
            {passengers.map((r) => (
              <View
                key={r.id}
                style={{
                  gap: 12,
                  borderTopWidth: 1,
                  borderTopColor: C.line,
                  paddingTop: 16,
                }}
              >
                <View style={s.row}>
                  <View style={[s.avatar, { width: 38, height: 38 }]}>
                    <Text style={{ fontWeight: "800", color: C.darkGreen }}>
                      {r.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontWeight: "700", color: C.navy }}>
                      {r.name}
                    </Text>
                    <Body>
                      {r.type} ·{" "}
                      {r.pickup === "home" ? "Home pickup" : "Bus stop"} · Seat{" "}
                      {r.seat}
                    </Body>
                  </View>
                  <Badge
                    text={r.statuses[store.run]}
                    green={r.statuses[store.run] === "Boarded"}
                  />
                </View>
                {r.pickup === "home" && <Body>{r.address}</Body>}
                {r.statuses[store.run] === "Waiting" && (
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Mark boarded"
                        secondary
                        onPress={() =>
                          attempt(
                            () => store.passengerStatus(r.id, "Boarded"),
                            `${r.name} is aboard.`,
                          )
                        }
                      />
                    </View>
                    <Button
                      title="Skip"
                      secondary
                      onPress={() =>
                        attempt(
                          () => store.passengerStatus(r.id, "Skipped"),
                          `${r.name} was skipped.`,
                        )
                      }
                    />
                  </View>
                )}
              </View>
            ))}
          </Card>
        );
      })}
      {!riders.length && (
        <Card>
          <Title>No passengers assigned</Title>
          <Body>Choose another route to view the seeded manifest.</Body>
        </Card>
      )}
      <Sheet
        visible={scanner}
        title="Validate a boarding pass"
        onClose={() => {
          setScanner(false);
          setError("");
        }}
      >
        <Body>
          Paste a rider’s rotating QR token or simulate scanning a waiting
          passenger below. No camera permission is needed for the demo.
        </Body>
        <Field
          label="QR payload"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="SP1|rider|route|seat|time"
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button
          title="Validate & board"
          onPress={() => {
            try {
              const id = token.split("|")[1];
              if (!riders.some((r) => r.id === id))
                throw new Error("This passenger is assigned to another route.");
              store.scan(token);
              setNotice("Pass validated. Passenger marked boarded.");
              setScanner(false);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        <Title>Simulate QR scan</Title>
        {riders
          .filter((r) => r.statuses[store.run] === "Waiting")
          .map((r) => (
            <Button
              key={r.id}
              title={`Scan ${r.name}’s pass`}
              secondary
              onPress={() => setToken(passToken(r))}
            />
          ))}
        <Body>
          QR validation is a local demo. Production requires server-signed
          passes and protected driver accounts.
        </Body>
      </Sheet>
      <Sheet
        visible={end}
        title="Complete this run?"
        onClose={() => setEnd(false)}
      >
        <Body>
          Boarded passengers will be marked completed. Waiting passengers will
          be marked skipped.
        </Body>
        <Button
          title="Complete trip"
          onPress={() => {
            store.endTrip();
            setEnd(false);
            setNotice("Run complete. Commuter trip history has been updated.");
          }}
        />
      </Sheet>
    </Page>
  );
}

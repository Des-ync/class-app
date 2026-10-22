import React, { useState } from "react";
import { Text, View } from "react-native";
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
import { useShuttleStore } from "../store/useShuttleStore";
import { driver, plans, routes } from "../data/mockData";
import { Role } from "../types";
export function Profile() {
  const store = useShuttleStore();
  const rider = store.riders.find((r) => r.id === store.riderId)!;
  const [reset, setReset] = useState(false);
  const activities = store.activity.filter(
    (a) => !a.riderId || a.riderId === rider.id,
  );
  return (
    <Page
      title="Your corner of ShuttlePass"
      subtitle="A commute that feels a little more personal."
    >
      <Card>
        <View style={s.row}>
          <View style={s.avatar}>
            <Icon
              name={store.role === "driver" ? "bus-outline" : "person-outline"}
              color={C.darkGreen}
            />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Title>
              {store.role === "driver"
                ? driver.name
                : store.role === "admin"
                  ? "Operations administrator"
                  : rider.name}
            </Title>
            <Body>
              {store.role === "commuter"
                ? rider.email
                : `${store.role} · Demo access`}
            </Body>
          </View>
        </View>
        <Badge
          text={
            store.role === "commuter"
              ? rider.type.toUpperCase()
              : store.role.toUpperCase()
          }
          green
        />
      </Card>
      <Card>
        <Title>Switch perspective</Title>
        <Body>
          All roles share the same local state. Driver actions appear in the
          commuter’s trips and activity.
        </Body>
        <Chips<Role>
          options={["commuter", "driver", "admin"]}
          value={store.role}
          onChange={store.switchRole}
        />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Button
              title="Student demo"
              secondary
              onPress={() => store.loginDemo("commuter", "Student")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Worker demo"
              secondary
              onPress={() => store.loginDemo("commuter", "Worker")}
            />
          </View>
        </View>
      </Card>
      <Title>Recent activity</Title>
      {activities.length ? (
        activities.slice(0, 15).map((a) => (
          <Card key={a.id}>
            <View style={s.row}>
              <Icon name="checkmark-circle-outline" color={C.darkGreen} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: C.navy }}
                >
                  {a.title}
                </Text>
                <Body>{a.detail}</Body>
                <Text style={{ color: "#94A3B8", fontSize: 10 }}>
                  {new Date(a.date).toLocaleString()}
                </Text>
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <Body>Your trip updates will appear here.</Body>
        </Card>
      )}
      <Card>
        <Title>About this experience</Title>
        <Body>
          ShuttlePass 1.0 · Accra, Ghana{`\n`}Weekday subscription transport for
          school and work. Data stays on this device. Payments, authentication,
          routes, and tracking are simulated.
        </Body>
      </Card>
      <Button
        title="Sign out"
        secondary
        icon="log-out-outline"
        onPress={store.logout}
      />
      <Button
        title="Reset demo data"
        danger
        secondary
        onPress={() => setReset(true)}
      />
      <Sheet
        visible={reset}
        title="Restore the demo?"
        onClose={() => setReset(false)}
      >
        <Body>
          This removes local registrations, receipts, route edits, and trip
          history and restores the seeded accounts.
        </Body>
        <Button
          title="Reset local demo"
          danger
          secondary
          onPress={() => {
            store.reset();
            setReset(false);
          }}
        />
      </Sheet>
    </Page>
  );
}
export function Admin() {
  const store = useShuttleStore();
  const active = store.riders.filter(
    (r) => r.subscription && new Date(r.subscription.end) > new Date(),
  );
  const revenue = store.receipts.reduce((sum, r) => sum + r.amount, 0);
  return (
    <Page
      title="A city on the move."
      subtitle="Operations overview · Local demo"
    >
      <Card dark>
        <Text style={{ color: "#A7F3D0", fontSize: 11, letterSpacing: 1.4 }}>
          SHUTTLEPASS OPERATIONS
        </Text>
        <Text style={{ fontSize: 32, color: "white", fontWeight: "800" }}>
          {active.length} active commuters
        </Text>
        <Body light>
          {routes.length} configured routes · {driver.capacity} vehicle seats
        </Body>
      </Card>
      <View style={s.row}>
        <Card style={{ flex: 1 }}>
          <Label>DEMO COLLECTIONS</Label>
          <Title>GHS {revenue}</Title>
        </Card>
        <Card style={{ flex: 1 }}>
          <Label>TRANSACTIONS</Label>
          <Title>{store.receipts.length}</Title>
        </Card>
      </View>
      <Title>Service runs</Title>
      {(["morning", "evening"] as const).map((run) => (
        <Card key={run}>
          <View style={s.row}>
            <Title>
              {run === "morning" ? "Morning inbound" : "Evening outbound"}
            </Title>
            <Badge text={store.trips[run].status} green />
          </View>
          <Body>
            {Math.round(store.trips[run].progress * 100)}% route progress ·{" "}
            {store.riders.filter((r) => r.statuses[run] === "Boarded").length}{" "}
            boarded
          </Body>
          <Button
            title="Open driver controls"
            secondary
            onPress={() => {
              store.setRun(run);
              store.switchRole("driver");
            }}
          />
        </Card>
      ))}
      <Title>Routes & demand</Title>
      {routes.map((route) => (
        <Card key={route.id}>
          <View style={s.row}>
            <Title>{route.code}</Title>
            <Badge
              text={`${store.riders.filter((r) => r.routeId === route.id).length} riders`}
            />
          </View>
          <Body>{route.name}</Body>
          <Body>
            {route.destination} · {route.stops.length} stops
          </Body>
        </Card>
      ))}
      <Title>Subscription register</Title>
      {store.riders.map((r) => (
        <Card key={r.id}>
          <View style={s.row}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontWeight: "700", color: C.navy }}>{r.name}</Text>
              <Body>
                {plans.find((p) => p.id === r.subscription?.planId)?.name ||
                  "No plan"}{" "}
                · {r.type}
              </Body>
            </View>
            <Badge
              text={active.some((a) => a.id === r.id) ? "Active" : "Inactive"}
              green={active.some((a) => a.id === r.id)}
            />
          </View>
        </Card>
      ))}
    </Page>
  );
}

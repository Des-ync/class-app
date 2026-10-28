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
  Page,
  s,
  Title,
} from "../components/ui";
import { useShuttleStore } from "../store/useShuttleStore";
import { RiderType, Role } from "../types";
export function Login() {
  const store = useShuttleStore();
  const [type, setType] = useState<RiderType>("Student");
  const [role, setRole] = useState<Role>("commuter");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await store.register(name, email, type);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title="Your seat. Your routine."
      subtitle="School days. Workdays. Better every day."
    >
      <Card dark>
        <View
          style={{
            height: 120,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              backgroundColor: C.green,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ rotate: "-8deg" }],
            }}
          >
            <Icon name="bus" size={50} color={C.onHero} />
          </View>
        </View>
        <Text
          style={{
            fontSize: 32,
            color: C.onHero,
            fontWeight: "700",
            letterSpacing: -1,
          }}
        >
          Less waiting.{"\n"}More living.
        </Text>
        <Body light>
          A guaranteed seat, a familiar driver, and one simple monthly
          subscription.
        </Body>
        <View style={s.wrap}>
          {["Live tracking", "Safe rides", "Monthly passes"].map((t) => (
            <Text key={t} style={{ color: C.onHeroAccent, fontSize: 12 }}>
              ✓ {t}
            </Text>
          ))}
        </View>
      </Card>
      <Title>Take it for a ride</Title>
      <Body>Explore with a ready-to-go demo account.</Body>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="Login as Student"
            icon="school-outline"
            onPress={() => store.loginDemo("commuter", "Student")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Login as Worker"
            secondary
            icon="briefcase-outline"
            onPress={() => store.loginDemo("commuter", "Worker")}
          />
        </View>
      </View>
      <Button
        title="Login as Driver"
        secondary
        icon="bus-outline"
        onPress={() => store.loginDemo("driver")}
      />
      <Card>
        <Title>Create your local account</Title>
        <Chips
          options={["Student", "Worker"]}
          value={type}
          onChange={setType}
        />
        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          autoComplete="name"
        />
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button title="Get started" loading={busy} onPress={submit} />
        <Body>
          Local demo authentication. No password or external account required.
        </Body>
      </Card>
      <Card>
        <Title>Explore another role</Title>
        <Chips
          options={["commuter", "driver", "admin"]}
          value={role}
          onChange={setRole}
        />
        <Button
          title={`Enter ${role} mode`}
          secondary
          onPress={() => store.loginDemo(role, type)}
        />
      </Card>
    </Page>
  );
}

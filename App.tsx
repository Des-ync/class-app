import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { C } from "./components/ui";
import { useShuttleStore } from "./store/useShuttleStore";
import { Login } from "./screens/Login";
import { Home, Tracker, Pass } from "./screens/Commuter";
import { Plans } from "./screens/Plans";
import { RouteConfig } from "./screens/RouteConfig";
import { Driver } from "./screens/Driver";
import { Profile, Admin } from "./screens/Profile";
const Tab = createBottomTabNavigator();
const icons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Home: "grid-outline",
  Track: "navigate-outline",
  Route: "map-outline",
  Pass: "qr-code-outline",
  Plans: "wallet-outline",
  Profile: "person-outline",
  Shift: "bus-outline",
  Overview: "stats-chart-outline",
};
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 32,
          gap: 20,
          backgroundColor: C.bg,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800" }}>
          Let’s get back on route.
        </Text>
        <Text>
          The app encountered an unexpected error. Reopen it to restore your
          saved session.
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => this.setState({ error: false })}
          style={{ color: C.darkGreen, fontWeight: "700" }}
        >
          Try again
        </Text>
      </View>
    ) : (
      this.props.children
    );
  }
}
function Root() {
  const hydrated = useShuttleStore((s) => s.hydrated);
  const loggedIn = useShuttleStore((s) => s.loggedIn);
  const role = useShuttleStore((s) => s.role);
  const storageError = useShuttleStore((s) => s.storageError);
  useEffect(() => {
    const timer = setInterval(() => useShuttleStore.getState().tick(), 2000);
    return () => clearInterval(timer);
  }, []);
  if (!hydrated)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.bg,
        }}
      >
        <ActivityIndicator color={C.green} />
        <Text style={{ marginTop: 14, color: C.muted }}>
          Getting your shuttle ready…
        </Text>
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      <Text
        accessibilityRole="text"
        style={{
          textAlign: "center",
          fontSize: 10,
          padding: 6,
          backgroundColor: "#FEF3C7",
          color: "#92400E",
        }}
      >
        DEMO • Payments and tracking are simulated
      </Text>
      {storageError && (
        <Text style={{ padding: 12, color: C.red }}>{storageError}</Text>
      )}
      {!loggedIn ? (
        <Login />
      ) : (
        <NavigationContainer
          key={role}
          theme={{
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              primary: C.darkGreen,
              background: C.bg,
            },
          }}
        >
          <Tab.Navigator
            key={role}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarAccessibilityLabel: route.name,
              tabBarActiveTintColor: C.darkGreen,
              tabBarInactiveTintColor: "#94A3B8",
              tabBarStyle: { borderTopColor: C.line, backgroundColor: "white" },
              tabBarLabelStyle: { fontSize: 9, fontWeight: "600" },
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={icons[route.name]} color={color} size={size} />
              ),
            })}
          >
            {role === "commuter" ? (
              <>
                <Tab.Screen name="Home" component={Home} />
                <Tab.Screen name="Track" component={Tracker} />
                <Tab.Screen name="Route" component={RouteConfig} />
                <Tab.Screen name="Pass" component={Pass} />
                <Tab.Screen name="Plans" component={Plans} />
              </>
            ) : role === "driver" ? (
              <Tab.Screen name="Shift" component={Driver} />
            ) : (
              <Tab.Screen name="Overview" component={Admin} />
            )}
            <Tab.Screen name="Profile" component={Profile} />
          </Tab.Navigator>
        </NavigationContainer>
      )}
    </>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

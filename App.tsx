import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { C, GlassBackground, Type } from "./components/ui";
import { useShuttleStore } from "./store/useShuttleStore";
import { Login } from "./screens/Login";
import { Home, Tracker, Pass } from "./screens/Commuter";
import { Plans } from "./screens/Plans";
import { RouteConfig } from "./screens/RouteConfig";
import { Driver } from "./screens/Driver";
import { Profile, Admin } from "./screens/Profile";
const Tab = createBottomTabNavigator();
type IconName = React.ComponentProps<typeof Ionicons>["name"];
// Filled symbol when selected, outline otherwise.
const icons: Record<string, [filled: IconName, outline: IconName]> = {
  Home: ["grid", "grid-outline"],
  Track: ["navigate", "navigate-outline"],
  Route: ["map", "map-outline"],
  Pass: ["qr-code", "qr-code-outline"],
  Plans: ["wallet", "wallet-outline"],
  Profile: ["person", "person-outline"],
  Shift: ["bus", "bus-outline"],
  Overview: ["stats-chart", "stats-chart-outline"],
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
        <Text style={{ fontSize: 28, fontWeight: "700", color: C.navy }}>
          Let’s get back on route.
        </Text>
        <Text style={{ fontSize: Type.body, color: C.muted }}>
          The app encountered an unexpected error. Reopen it to restore your
          saved session.
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => this.setState({ error: false })}
          style={{
            color: C.darkGreen,
            fontSize: Type.body,
            fontWeight: "600",
            paddingVertical: 12,
          }}
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
        <ActivityIndicator color={C.green as string} />
        <Text style={{ marginTop: 14, color: C.muted, fontSize: Type.callout }}>
          Getting your shuttle ready…
        </Text>
      </View>
    );
  return (
    <>
      <StatusBar style="auto" />
      <Text
        accessibilityRole="text"
        style={{
          textAlign: "center",
          fontSize: Type.caption,
          padding: 6,
          backgroundColor: C.amberTint,
          color: C.amber,
        }}
      >
        DEMO • Payments and tracking are simulated
      </Text>
      {storageError && (
        <Text style={{ padding: 12, color: C.red, fontSize: Type.callout }}>
          {storageError}
        </Text>
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
              primary: C.darkGreen as string,
              background: C.bg as string,
            },
          }}
        >
          <Tab.Navigator
            key={role}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarAccessibilityLabel: route.name,
              tabBarActiveTintColor: C.darkGreen as string,
              tabBarInactiveTintColor: C.muted as string,
              // Floating glass bar over content: the functional layer.
              tabBarBackground: () => <GlassBackground />,
              tabBarStyle: {
                position: "absolute",
                borderTopWidth: 0,
                backgroundColor: "transparent",
                elevation: 0,
              },
              tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={icons[route.name][focused ? 0 : 1]}
                  color={color as string}
                  size={size}
                />
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

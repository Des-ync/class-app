import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  ColorValue,
  DynamicColorIOS,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Semantic colors, named by role. On iOS each resolves to a light or dark
// value at render time; other platforms use the light value.
const dyn = (light: string, dark: string): ColorValue =>
  Platform.OS === "ios" ? DynamicColorIOS({ light, dark }) : light;

export const C = {
  // Surfaces
  bg: dyn("#F2F2F7", "#000000"), // grouped background
  card: dyn("#FFFFFF", "#1C1C1E"), // grouped content
  fill: dyn("#EEF0F3", "#2C2C2E"), // secondary controls
  line: dyn("#D9DCE1", "#38383A"), // separator
  hero: dyn("#0F172A", "#14231F"), // the one dark surface per screen
  // Content
  navy: dyn("#111827", "#F5F5F7"), // primary label
  muted: dyn("#5C6370", "#9AA0AB"), // secondary label, 5.4:1 on bg
  onHero: "#FFFFFF",
  onHeroMuted: "#C5CBD6", // 10.9:1 on hero
  onHeroAccent: "#A7F3D0",
  // Accent: the single brand color, reserved for the primary action,
  // selection, and status. Background carries it, not the label.
  green: dyn("#10B981", "#34D399"), // fills, map, switch track
  darkGreen: dyn("#047857", "#34D399"), // accent text and primary fill
  onAccent: dyn("#FFFFFF", "#04201A"), // label on the accent fill
  tint: dyn("#D1FAE5", "#12352B"), // accent-tinted background
  // Status
  red: dyn("#B91C1C", "#FF6B6B"),
  redTint: dyn("#FEE2E2", "#3A1B1B"),
  white: "#FFFFFF",
  amber: dyn("#92400E", "#FCD34D"),
  amberTint: dyn("#FEF3C7", "#3A2E0F"),
  violet: dyn("#6D28D9", "#C4B5FD"),
  violetTint: dyn("#EDE9FE", "#2A2146"),
};

export const Type = {
  largeTitle: 34,
  title: 20,
  body: 17,
  callout: 15,
  footnote: 13,
  caption: 12,
};

export function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((v) => live && setOn(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setOn,
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

// Liquid Glass approximation for the functional layer only (tab bar).
export function GlassBackground() {
  const opaque = useReduceTransparency();
  if (opaque || Platform.OS === "android")
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.card }]} />
    );
  return (
    <BlurView
      intensity={70}
      tint="systemChromeMaterial"
      style={StyleSheet.absoluteFill}
    />
  );
}

export function Icon({
  name,
  size = 22,
  color = C.navy,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: ColorValue;
}) {
  return <Ionicons name={name} size={size} color={color as string} />;
}

export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  loading = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const fg = danger ? C.red : secondary ? C.darkGreen : C.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: C.redTint },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color={fg} />}
          <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  dark = false,
  style,
}: {
  children: React.ReactNode;
  dark?: boolean;
  style?: any;
}) {
  return (
    <View style={[s.card, dark && { backgroundColor: C.hero }, style]}>
      {children}
    </View>
  );
}

export function Badge({
  text,
  green = false,
}: {
  text: string;
  green?: boolean;
}) {
  return (
    <View style={[s.badge, green && { backgroundColor: C.tint }]}>
      <Text
        style={{
          fontSize: Type.caption,
          fontWeight: "600",
          color: green ? C.darkGreen : C.muted,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Body({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Text style={[s.body, light && { color: C.onHeroMuted }]}>{children}</Text>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={C.muted as string}
        style={s.input}
        {...props}
      />
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.wrap}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
          key={option}
          onPress={() => onChange(option)}
          style={[s.chip, option === value && s.chipOn]}
        >
          <Text
            style={{
              fontWeight: "600",
              fontSize: Type.callout,
              color: option === value ? C.onAccent : C.navy,
            }}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Large-title page. Content scrolls under the floating tab bar, so the
// bottom inset comes from the tab bar's measured height when there is one.
export function Page({
  children,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[s.page, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={s.pageTitle}>
              {title}
            </Text>
            {subtitle && <Body>{subtitle}</Body>}
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <SafeAreaView style={s.sheet}>
          <View accessible={false} style={s.grabber} />
          <View style={s.row}>
            <Text accessibilityRole="header" style={[s.title, { flex: 1 }]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={s.closeButton}
            >
              <Icon name="close" size={20} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 18, paddingBottom: 30 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 20,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  pageTitle: {
    fontSize: Type.largeTitle,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: C.navy,
  },
  title: { fontSize: Type.title, fontWeight: "600", color: C.navy },
  body: { fontSize: Type.callout, lineHeight: 22, color: C.muted },
  label: { fontSize: Type.footnote, color: C.muted, fontWeight: "500" },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: C.card,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    backgroundColor: C.darkGreen,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 50,
  },
  buttonText: { fontSize: Type.body, fontWeight: "600" },
  secondary: { backgroundColor: C.fill },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.fill,
    alignSelf: "flex-start",
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: Type.body,
    color: C.navy,
    backgroundColor: C.fill,
    minHeight: 48,
  },
  chip: {
    paddingHorizontal: 18,
    justifyContent: "center",
    minHeight: 44,
    backgroundColor: C.fill,
    borderRadius: 999,
  },
  chipOn: { backgroundColor: C.darkGreen },
  overlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    maxHeight: "92%",
    width: "100%",
    maxWidth: 720,
    backgroundColor: C.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.line,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  big: { fontSize: 34, fontWeight: "700", color: C.navy, letterSpacing: 0.4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: C.red, fontSize: Type.callout, lineHeight: 22 },
});

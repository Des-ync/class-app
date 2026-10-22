import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
export const C = {
  navy: "#0F172A",
  green: "#10B981",
  darkGreen: "#047857",
  muted: "#64748B",
  line: "#E2E8F0",
  bg: "#F5F7FA",
  white: "#FFFFFF",
  red: "#DC2626",
};
export function Icon({
  name,
  size = 22,
  color = C.navy,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: "#FEF2F2" },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? C.navy : C.white} />
      ) : (
        <>
          {icon && (
            <Icon name={icon} size={18} color={secondary ? C.navy : C.white} />
          )}
          <Text
            style={[
              s.buttonText,
              secondary && { color: C.navy },
              danger && { color: C.red },
            ]}
          >
            {title}
          </Text>
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
    <View
      style={[
        s.card,
        dark && { backgroundColor: C.navy, borderColor: C.navy },
        style,
      ]}
    >
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
    <View style={[s.badge, green && { backgroundColor: "#D1FAE5" }]}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
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
    <Text style={[s.body, light && { color: "#CBD5E1" }]}>{children}</Text>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor="#94A3B8" style={s.input} {...props} />
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
              fontSize: 12,
              color: option === value ? C.white : C.muted,
            }}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
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
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.row}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.eyebrow}>SHUTTLEPASS</Text>
            <Text style={s.pageTitle}>{title}</Text>
            {subtitle && <Body>{subtitle}</Body>}
          </View>
          {action}
        </View>
        {children}
        <Text style={s.footer}>A better way to get there.</Text>
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
          <View style={s.row}>
            <Title>{title}</Title>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              hitSlop={15}
            >
              <Icon name="close" />
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
    padding: 22,
    gap: 20,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 32,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.8,
    fontWeight: "800",
    color: C.darkGreen,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    color: C.navy,
  },
  title: { fontSize: 18, fontWeight: "700", color: C.navy },
  body: { fontSize: 13, lineHeight: 20, color: C.muted },
  label: { fontSize: 12, color: C.muted, fontWeight: "600" },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
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
    borderRadius: 13,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
  },
  buttonText: { color: C.white, fontSize: 13, fontWeight: "700" },
  secondary: { backgroundColor: "#EDF2F7" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
  },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: C.navy,
    backgroundColor: C.white,
    minHeight: 48,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#EDF2F7",
    borderRadius: 12,
  },
  chipOn: { backgroundColor: C.navy },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    paddingTop: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#0F172A99",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    maxHeight: "92%",
    width: "100%",
    maxWidth: 720,
    backgroundColor: C.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    gap: 24,
  },
  big: { fontSize: 34, fontWeight: "800", color: C.navy, letterSpacing: -1 },
  divider: { height: 1, backgroundColor: C.line },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: C.red, fontSize: 13, lineHeight: 20 },
});

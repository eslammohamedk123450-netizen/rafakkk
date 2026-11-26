import { useColorScheme, View, Text, Pressable, ScrollView, TextInput, type ViewStyle, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { useAppStore } from "@/lib/app-store";
import { useRouter, useSegments } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/** Shared visual scale. Keep palette decisions in useSulyTheme; these tokens only
 * standardize rhythm, typography and touch targets across every screen. */
export const SulyMetrics = {
  pageHorizontal: 18,
  pageTop: 8,
  pageBottom: 150,
  sectionGap: 12,
  cardRadius: 20,
  cardPadding: 16,
  controlRadius: 14,
  controlHeight: 46,
  iconSmall: 18,
  iconDefault: 22,
  iconLarge: 26,
} as const;

export const SulyType = {
  pageTitle: 25,
  sectionTitle: 18,
  cardTitle: 16,
  body: 15,
  secondary: 13,
  caption: 11,
} as const;

export function useSulyTheme() {
  const deviceScheme = useColorScheme();
  const { store } = useAppStore();
  const dark = store.theme === "dark" || (store.theme === "system" && deviceScheme === "dark");
  const colors = dark
    ? { background: "#071F1B", surface: "#10352E", card: "#153F35", text: "#F5F2E8", muted: "#B8C6C0", border: "#2B594F", gold: "#E8C77B", accent: "#39B5A4", field: "#0B2A24" }
    : { background: "#F7F5EF", surface: "#FFFFFF", card: "#EEF3EF", text: "#123A31", muted: "#6E817A", border: "#D8E2DC", gold: "#C7A344", accent: "#188D7F", field: "#F2F5F2" };
  return { dark, colors };
}

export function AppScreen({ children, noBottomSpace = false }: { children: ReactNode; noBottomSpace?: boolean }) {
  const { colors } = useSulyTheme();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: SulyMetrics.pageHorizontal, paddingTop: SulyMetrics.pageTop, paddingBottom: noBottomSpace ? 24 : SulyMetrics.pageBottom, gap: SulyMetrics.sectionGap }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ScreenHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { colors } = useSulyTheme();
  const router = useRouter();
  const segments = useSegments();
  const isTabPage = segments[0] === "(tabs)";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4, paddingBottom: 6, gap: 10, minHeight: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {!isTabPage ? <>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} accessibilityRole="button" accessibilityLabel="رجوع للصفحة السابقة" style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="arrow-left" size={21} color={colors.gold} />
          </Pressable>
          <Pressable onPress={() => router.replace("/")} accessibilityRole="button" accessibilityLabel="العودة للرئيسية" style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="home-outline" size={20} color={colors.gold} />
          </Pressable>
        </> : null}
        {action}
      </View>
      <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: SulyType.pageTitle, fontWeight: "800", textAlign: "right", letterSpacing: -0.3 }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: SulyType.secondary, lineHeight: 19, textAlign: "right" }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function SulyCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useSulyTheme();
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: SulyMetrics.cardRadius, padding: SulyMetrics.cardPadding, gap: 12 }, style]}>{children}</View>;
}

export function SectionTitle({ children, trailing }: { children: string; trailing?: ReactNode }) {
  const { colors } = useSulyTheme();
  return <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 3, minHeight: 30 }}><Text style={{ color: colors.text, fontSize: SulyType.sectionTitle, fontWeight: "800", textAlign: "right" }}>{children}</Text>{trailing}</View>;
}

export function SulyButton({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const { colors } = useSulyTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => ({ minHeight: SulyMetrics.controlHeight, borderRadius: SulyMetrics.controlRadius, paddingHorizontal: 15, justifyContent: "center", alignItems: "center", backgroundColor: secondary ? colors.card : colors.gold, borderWidth: secondary ? 1 : 0, borderColor: colors.border, opacity: disabled ? 0.42 : pressed ? 0.76 : 1 })}>
      <Text style={{ color: secondary ? colors.text : "#17392F", fontSize: SulyType.body, fontWeight: "700", textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
}

export function SulyInput({ label, value, onChangeText, placeholder, keyboardType = "default", ...props }: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void }) {
  const { colors } = useSulyTheme();
  return <View style={{ gap: 6 }}><Text style={{ color: colors.muted, fontSize: SulyType.secondary, textAlign: "right" }}>{label}</Text><TextInput {...props} value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={colors.muted} style={[{ minHeight: SulyMetrics.controlHeight, borderRadius: SulyMetrics.controlRadius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field, color: colors.text, paddingHorizontal: 13, textAlign: "right", fontSize: SulyType.body }, props.style]} /></View>;
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { colors } = useSulyTheme();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: Math.min(value, max) }} style={{ height: 8, overflow: "hidden", borderRadius: 99, backgroundColor: colors.border, flexDirection: "row" }}><View style={{ width: `${ratio * 100}%`, height: "100%", backgroundColor: color ?? colors.accent, borderRadius: 99 }} /></View>;
}

export function TinyTag({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useSulyTheme();
  return <Pressable onPress={onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityState={onPress ? { selected } : undefined} style={({ pressed }) => ({ minHeight: 36, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.gold : colors.border, backgroundColor: selected ? colors.card : "transparent", paddingVertical: 7, paddingHorizontal: 12, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: selected ? colors.gold : colors.text, fontSize: 13, fontWeight: selected ? "700" : "500", textAlign: "center" }}>{title}</Text></Pressable>;
}

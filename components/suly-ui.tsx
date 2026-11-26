import { useColorScheme, View, Text, Pressable, ScrollView, TextInput, type ViewStyle, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { useAppStore } from "@/lib/app-store";
import { useRouter, useSegments } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: noBottomSpace ? 24 : 150, gap: 14 }}>
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
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4, paddingBottom: 8, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {!isTabPage ? <>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} accessibilityRole="button" accessibilityLabel="رجوع للصفحة السابقة" style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.gold} />
          </Pressable>
          <Pressable onPress={() => router.replace("/")} accessibilityRole="button" accessibilityLabel="العودة للرئيسية" style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="home-outline" size={21} color={colors.gold} />
          </Pressable>
        </> : null}
        {action}
      </View>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "right" }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4, textAlign: "right" }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function SulyCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useSulyTheme();
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 }, style]}>{children}</View>;
}

export function SectionTitle({ children, trailing }: { children: string; trailing?: ReactNode }) {
  const { colors } = useSulyTheme();
  return <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}><Text style={{ color: colors.text, fontSize: 19, fontWeight: "700", textAlign: "right" }}>{children}</Text>{trailing}</View>;
}

export function SulyButton({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const { colors } = useSulyTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, paddingHorizontal: 16, justifyContent: "center", alignItems: "center", backgroundColor: secondary ? colors.card : colors.gold, borderWidth: secondary ? 1 : 0, borderColor: colors.border, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 })}>
      <Text style={{ color: secondary ? colors.text : "#17392F", fontSize: 16, fontWeight: "700", textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
}

export function SulyInput({ label, value, onChangeText, placeholder, keyboardType = "default", ...props }: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void }) {
  const { colors } = useSulyTheme();
  return <View style={{ gap: 6 }}><Text style={{ color: colors.muted, fontSize: 13, textAlign: "right" }}>{label}</Text><TextInput {...props} value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={colors.muted} style={{ minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field, color: colors.text, paddingHorizontal: 12, textAlign: "right", fontSize: 16 }} /></View>;
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { colors } = useSulyTheme();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <View style={{ height: 9, overflow: "hidden", borderRadius: 99, backgroundColor: colors.border, flexDirection: "row" }}><View style={{ width: `${ratio * 100}%`, height: "100%", backgroundColor: color ?? colors.accent, borderRadius: 99 }} /></View>;
}

export function TinyTag({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useSulyTheme();
  return <Pressable onPress={onPress} style={{ borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.gold : colors.border, backgroundColor: selected ? colors.card : "transparent", paddingVertical: 8, paddingHorizontal: 12 }}><Text style={{ color: selected ? colors.gold : colors.text, fontWeight: selected ? "700" : "500", textAlign: "center" }}>{title}</Text></Pressable>;
}

import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSulyTheme } from "@/components/suly-ui";

type NavItem = { route: string; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] };
type NavigationGridProps = { state: any; navigation: any };
const topRow: NavItem[] = [
  { route: "quran", label: "القرآن", icon: "book-open-page-variant-outline" },
  { route: "prayer", label: "الصلاة", icon: "clock-time-four-outline" },
  { route: "index", label: "الرئيسية", icon: "home-outline" },
];
const secondRow: (NavItem | null)[] = [
  null,
  { route: "achievements", label: "إنجازاتي", icon: "chart-box-outline" },
  { route: "adhkar", label: "الأذكار", icon: "hands-pray" },
];

function NavigationGrid({ state, navigation }: NavigationGridProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useSulyTheme();
  const renderItem = (item: NavItem) => {
    const route = state.routes.find((entry: { name: string; key: string; params?: unknown }) => entry.name === item.route);
    const selected = state.routes[state.index]?.name === item.route;
    if (!route) return <View key={item.route} style={{ flex: 1 }} />;
    return (
      <Pressable
        key={item.route}
        accessibilityRole="tab"
        accessibilityState={selected ? { selected: true } : {}}
        accessibilityLabel={item.label}
        onPress={() => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 17, backgroundColor: selected ? colors.card : colors.surface, borderWidth: selected ? 1 : 0, borderColor: selected ? colors.gold : "transparent", alignItems: "center", justifyContent: "center", gap: 4, opacity: pressed ? 0.75 : 1 })}
      >
        <MaterialCommunityIcons name={item.icon} size={22} color={selected ? colors.gold : colors.muted} />
        <Text style={{ color: selected ? colors.gold : colors.muted, fontSize: 12, fontWeight: selected ? "700" : "500", writingDirection: "rtl", textAlign: "center" }}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 10, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 9), gap: 7, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
      <View style={{ flexDirection: "row", direction: "ltr", gap: 7 }}>{topRow.map(renderItem)}</View>
      <View style={{ flexDirection: "row", direction: "ltr", gap: 7 }}>{secondRow.map((item, index) => item ? renderItem(item) : <View key={`empty-${index}`} style={{ flex: 1 }} />)}</View>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useSulyTheme();
  return (
    <Tabs
      tabBar={(props) => <NavigationGrid state={props.state} navigation={props.navigation} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="prayer" options={{ title: "الصلاة" }} />
      <Tabs.Screen name="quran" options={{ title: "القرآن" }} />
      <Tabs.Screen name="achievements" options={{ title: "إنجازاتي" }} />
      <Tabs.Screen name="adhkar" options={{ title: "الأذكار" }} />
    </Tabs>
  );
}

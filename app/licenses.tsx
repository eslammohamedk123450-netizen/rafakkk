import { Linking, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppScreen, ScreenHeading, SulyCard, useSulyTheme } from "@/components/suly-ui";

export default function LicensesScreen() {
  const router = useRouter();
  const { colors } = useSulyTheme();
  const open = (url: string) => Linking.openURL(url);
  return (
    <AppScreen>
      <ScreenHeading title="حول التطبيق والتراخيص" subtitle="معلومات المصادر وحقوق الاستخدام" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.gold} /></Pressable>} />
      <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "900", fontSize: 17 }}>نص القرآن الكريم</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 23 }}>
          Tanzil Quran Text. Copyright (C) 2007-2026 Tanzil Project. License: Creative Commons Attribution 3.0.
          {"\n"}هذا النص مضبوط ومراجع بعناية ويُراقَب باستمرار من مشروع Tanzil.
          {"\n"}يُسمح بتوزيع نسخ مطابقة، ولا يُسمح بتغيير نص القرآن. يُستخدم النص في التطبيق مع الإشارة إلى مصدره.
        </Text>
        <Pressable onPress={() => open("https://tanzil.net/")} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7, paddingVertical: 7 }}>
          <MaterialCommunityIcons name="open-in-new" size={17} color={colors.gold} />
          <Text style={{ color: colors.gold, fontWeight: "700" }}>موقع مشروع Tanzil</Text>
        </Pressable>
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>الرخصة: Creative Commons Attribution 3.0</Text>
        <Pressable onPress={() => open("https://creativecommons.org/licenses/by/3.0/")} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7, paddingVertical: 7 }}>
          <MaterialCommunityIcons name="open-in-new" size={17} color={colors.gold} />
          <Text style={{ color: colors.gold, fontWeight: "700" }}>شروط الرخصة</Text>
        </Pressable>
      </SulyCard>
      <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "900", fontSize: 17 }}>التفسير الميسّر</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 23 }}>
          التفسير الميسّر صادر عن مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة، ويُعرض عبر خدمات QuranEnc.
        </Text>
        <Pressable onPress={() => open("https://quranenc.com/en/browse/arabic_moyassar")} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7, paddingVertical: 7 }}>
          <MaterialCommunityIcons name="open-in-new" size={17} color={colors.gold} />
          <Text style={{ color: colors.gold, fontWeight: "700" }}>معلومات التفسير</Text>
        </Pressable>
      </SulyCard>
    </AppScreen>
  );
}

import { Text } from "react-native";
import { AppScreen, ScreenHeading, SulyCard, useSulyTheme } from "@/components/suly-ui";

export default function AdminUnavailableOnAndroid() {
  const { colors } = useSulyTheme();

  return (
    <AppScreen noBottomSpace>
      <ScreenHeading title="لوحة الإدارة" subtitle="واجهة المتصفح فقط" />
      <SulyCard>
        <Text style={{ color: colors.text, textAlign: "right", lineHeight: 24 }}>
          لوحة إدارة المحتوى منفصلة عن تطبيق Suly ولا تعمل من ملف Android. استخدم صفحة الإدارة في متصفح الويب وسجّل الدخول بحساب Manus المصرّح له.
        </Text>
      </SulyCard>
    </AppScreen>
  );
}

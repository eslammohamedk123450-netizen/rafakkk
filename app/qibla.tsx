import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyCard, SulyButton, useSulyTheme } from "@/components/suly-ui";
import { useAppStore } from "@/lib/app-store";

const KAABA_LAT = 21.422487;
const KAABA_LON = 39.826206;

function bearingToKaaba(lat: number, lon: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLon = rad(KAABA_LON - lon);
  const y = Math.sin(dLon) * Math.cos(rad(KAABA_LAT));
  const x = Math.cos(rad(lat)) * Math.sin(rad(KAABA_LAT)) - Math.sin(rad(lat)) * Math.cos(rad(KAABA_LAT)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function normalize(value: number) { return (value + 360) % 360; }

export default function QiblaScreen() {
  const router = useRouter();
  const { store } = useAppStore();
  const { colors } = useSulyTheme();
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorError, setSensorError] = useState("");
  const qibla = store.location ? bearingToKaaba(store.location.latitude, store.location.longitude) : null;
  const relative = heading !== null && qibla !== null ? normalize(qibla - heading) : 0;

  useEffect(() => {
    if (Platform.OS === "web") { setSensorError("البوصلة الحقيقية تحتاج حساسات الهاتف، وهي غير متاحة في معاينة الويب."); return; }
    let subscription: Location.LocationSubscription | null = null;
    let active = true;
    Location.watchHeadingAsync((data) => {
      if (!active) return;
      const usable = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
      if (Number.isFinite(usable)) setHeading(usable);
    }).then((sub) => { if (active) subscription = sub; else sub.remove(); })
      .catch(() => setSensorError("تعذر قراءة حساس الاتجاه. تأكد أن جهازك يحتوي على بوصلة."));
    return () => { active = false; subscription?.remove(); };
  }, []);

  return <AppScreen>
    <ScreenHeading title="بوصلة القبلة" subtitle="اتبع اتجاه المؤشر الذهبي نحو الكعبة المشرفة" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold, fontWeight: "700" }}>رجوع</Text></Pressable>} />
    <SulyCard style={{ alignItems: "center", gap: 12 }}>
      <View style={{ width: 284, height: 284, borderRadius: 142, borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 254, height: 254, borderRadius: 127, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
          {["N","E","S","W"].map((label, i) => <Text key={label} style={{ position: "absolute", color: label === "N" ? colors.gold : colors.muted, fontWeight: "800", top: i === 0 ? 10 : undefined, bottom: i === 2 ? 10 : undefined, left: i === 3 ? 10 : undefined, right: i === 1 ? 10 : undefined }}>{label}</Text>)}
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.gold }} />
        </View>
        <View style={{ alignItems: "center", justifyContent: "center", transform: [{ rotate: relative + "deg" }] }}>
          <MaterialCommunityIcons name="navigation" size={142} color={colors.gold} />
        </View>
        <MaterialCommunityIcons name="cube-outline" size={32} color={colors.text} style={{ position: "absolute", bottom: 110 }} />
      </View>
      {heading === null ? <Text style={{ color: colors.muted, textAlign: "center" }}>جارٍ قراءة اتجاه الهاتف…</Text> : <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>اتجاه الهاتف: {Math.round(heading)}° · اتجاه القبلة: {Math.round(qibla ?? 0)}°</Text>}
      {qibla !== null ? <Text style={{ color: colors.gold, fontSize: 15, fontWeight: "700" }}>القبلة بالنسبة لاتجاهك: {Math.round(relative)}°</Text> : <Text style={{ color: colors.muted, textAlign: "center" }}>حدد موقعك من إعدادات التطبيق لحساب اتجاه القبلة بدقة.</Text>}
      <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 23 }}>ضع الهاتف أفقيًا، وأبعده عن المعادن والمغناطيس. حرّكه ببطء على شكل رقم 8 إذا احتاج الحساس إلى معايرة.</Text>
      {sensorError ? <Text style={{ color: colors.gold, textAlign: "center", lineHeight: 22 }}>{sensorError}</Text> : null}
    </SulyCard>
    {!store.location ? <SulyCard><SulyButton title="إعداد الموقع" onPress={() => router.push("/settings")} /></SulyCard> : null}
  </AppScreen>;
}

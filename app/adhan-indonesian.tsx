import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyCard, SulyButton, useSulyTheme } from "@/components/suly-ui";
import { useAppStore } from "@/lib/app-store";

const INDONESIAN_ADHAN_URL = "https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Indonesia_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A5%D9%86%D8%AF%D9%88%D9%86%D9%8A%D8%B3%D9%8A%D8%A7).mp3";
const SOURCE_PAGE = "https://github.com/Kiwifu/adhan-mp3";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function IndonesianAdhanScreen() {
  const router = useRouter();
  const { colors } = useSulyTheme();
  const { store, updateStore } = useAppStore();
  const player = useAudioPlayer(INDONESIAN_ADHAN_URL, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => setError("تعذر تهيئة مشغل الصوت على هذا الجهاز."));
    return () => {
      player.pause();
    };
  }, [player]);

  useEffect(() => {
    if (status.playing) setLoading(false);
  }, [status.playing]);

  const play = async () => {
    setError("");
    setLoading(true);
    try {
      await player.seekTo(0);
      player.play();
    } catch {
      setLoading(false);
      setError("تعذر تشغيل التسجيل. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.");
    }
  };

  const selectIndonesian = () => updateStore((current) => ({
    ...current,
    adhanPrefs: { ...current.adhanPrefs, region: "indonesian", voiceId: "indo-regional", mode: "full" },
  }));

  return (
    <AppScreen>
      <ScreenHeading title="الأذان الإندونيسي" subtitle="استمع للتسجيل واختره لصوت الأذان" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold, fontSize: 16 }}>رجوع</Text></Pressable>} />
      <SulyCard>
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}>
          <Text style={{ fontSize: 48 }}>🇮🇩</Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>أذان إندونيسيا</Text>
          <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 22 }}>تسجيل أذان من إندونيسيا. اضغط استمع للتجربة قبل اعتماده في إعداداتك.</Text>
          <Text style={{ color: colors.gold, fontSize: 17, fontWeight: "700" }}>{formatTime(status.currentTime)} / {formatTime(status.duration)}</Text>
          <View style={{ height: 5, width: "100%", backgroundColor: colors.border, borderRadius: 5, overflow: "hidden" }}>
            <View style={{ height: 5, width: `${status.duration > 0 ? Math.min(100, status.currentTime / status.duration * 100) : 0}%`, backgroundColor: colors.gold }} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <View style={{ flex: 1 }}><SulyButton title={status.playing ? "إيقاف مؤقت" : loading ? "جارٍ التحميل..." : "استمع للأذان"} onPress={() => status.playing ? player.pause() : void play()} disabled={loading} /></View>
            <View style={{ flex: 1 }}><SulyButton title="إيقاف" secondary onPress={() => { player.pause(); void player.seekTo(0); setLoading(false); }} /></View>
          </View>
          {loading ? <ActivityIndicator color={colors.gold} /> : null}
          {error ? <Text style={{ color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
        </View>
      </SulyCard>
      <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17, textAlign: "right" }}>اعتماد هذا الصوت</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>سيُحفظ كاختيارك الإندونيسي للأذان الكامل. التشغيل التلقائي عند الصلاة وربطه بإشعارات أندرويد خطوة منفصلة قيد التنفيذ.</Text>
        <SulyButton title={store.adhanPrefs.region === "indonesian" && store.adhanPrefs.voiceId === "indo-regional" ? "الصوت الإندونيسي محدد بالفعل" : "اختيار الأذان الإندونيسي"} onPress={selectIndonesian} />
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>المصدر: مجموعة Kiwifu Adhan MP3. يُعرض التسجيل عبر البث المباشر ولا يُضمّن داخل التطبيق حاليًا. راجع صفحة المصدر وشروط استخدام التسجيل قبل إعادة توزيعه ضمن نسخة منشورة.</Text>
        <SulyButton title="عرض مصدر التسجيل" secondary onPress={() => { if (Platform.OS === "web") window.open(SOURCE_PAGE, "_blank"); }} />
      </SulyCard>
    </AppScreen>
  );
}

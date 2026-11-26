import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyCard, SulyButton, TinyTag, useSulyTheme } from "@/components/suly-ui";
import { useAppStore } from "@/lib/app-store";

const ADHAN_OPTIONS = [
  { id: "adhan-1", label: "الأذان 1" },
  { id: "adhan-2", label: "الأذان 2" },
  { id: "adhan-3", label: "الأذان 3" },
] as const;

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
  const player1 = useAudioPlayer(require("../assets/adhan/adhan-1.mp3"), { updateInterval: 500 });
  const player2 = useAudioPlayer(require("../assets/adhan/adhan-2.mp3"), { updateInterval: 500 });
  const player3 = useAudioPlayer(require("../assets/adhan/adhan-3.mp3"), { updateInterval: 500 });
  const status1 = useAudioPlayerStatus(player1);
  const status2 = useAudioPlayerStatus(player2);
  const status3 = useAudioPlayerStatus(player3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
    }).catch(() => setError("تعذر تهيئة مشغل الصوت على هذا الجهاز."));
    return () => {
      player1.pause();
      player2.pause();
      player3.pause();
    };
  }, [player1, player2, player3]);

  useEffect(() => {
    if (status1.playing || status2.playing || status3.playing) setLoading(false);
  }, [status1.playing, status2.playing, status3.playing]);

  const preview = async (id: (typeof ADHAN_OPTIONS)[number]["id"]) => {
    setError("");
    setLoading(true);
    player1.pause();
    player2.pause();
    player3.pause();
    updateStore((current) => ({
      ...current,
      adhanPrefs: { ...current.adhanPrefs, region: "indonesian", voiceId: id, mode: "full" },
    }));
    const selectedPlayer = id === "adhan-3" ? player3 : id === "adhan-2" ? player2 : player1;
    try {
      await selectedPlayer.seekTo(0);
      selectedPlayer.play();
    } catch {
      setLoading(false);
      setError("تعذر تشغيل التسجيل. حاول مرة أخرى.");
    }
  };

  const selectVoice = (id: (typeof ADHAN_OPTIONS)[number]["id"]) => {
    player1.pause();
    player2.pause();
    player3.pause();
    setLoading(false);
    setError("");
    updateStore((current) => ({
      ...current,
      adhanPrefs: { ...current.adhanPrefs, region: "indonesian", voiceId: id, mode: "full" },
    }));
  };

  const stop = () => {
    player1.pause();
    player2.pause();
    player3.pause();
    void player1.seekTo(0);
    void player2.seekTo(0);
    void player3.seekTo(0);
    setLoading(false);
  };

  return (
    <AppScreen>
      <ScreenHeading title="اختيار صوت الأذان" subtitle="استمع للتسجيلات الثلاثة واختر الصوت المناسب لك" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold, fontSize: 16 }}>رجوع</Text></Pressable>} />
      {ADHAN_OPTIONS.map((option) => {
        const isSelected = store.adhanPrefs.voiceId === option.id;
        const optionStatus = option.id === "adhan-3" ? status3 : option.id === "adhan-2" ? status2 : status1;
        return (
          <SulyCard key={option.id}>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{option.label}</Text>
                <TinyTag title={isSelected ? "محدد" : "اختيار"} selected={isSelected} onPress={() => selectVoice(option.id)} />
              </View>
              <Text style={{ color: colors.gold, fontSize: 16, fontWeight: "700", textAlign: "center" }}>
                {formatTime(optionStatus.currentTime)} / {formatTime(optionStatus.duration)}
              </Text>
              <View style={{ height: 5, width: "100%", backgroundColor: colors.border, borderRadius: 5, overflow: "hidden" }}>
                <View style={{ height: 5, width: `${optionStatus.duration > 0 ? Math.min(100, optionStatus.currentTime / optionStatus.duration * 100) : 0}%`, backgroundColor: colors.gold }} />
              </View>
              <SulyButton title={optionStatus.playing ? "إيقاف مؤقت" : loading && isSelected ? "جارٍ التحميل..." : `استمع إلى ${option.label}`} onPress={() => optionStatus.playing ? (option.id === "adhan-3" ? player3 : option.id === "adhan-2" ? player2 : player1).pause() : void preview(option.id)} disabled={loading && !optionStatus.playing} />
              <SulyButton title={isSelected ? "الصوت المعتمد حاليًا" : `اعتماد ${option.label}`} secondary onPress={() => selectVoice(option.id)} />
            </View>
          </SulyCard>
        );
      })}
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      {error ? <Text style={{ color: colors.gold, textAlign: "center" }}>{error}</Text> : null}
      <SulyCard>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>
          التسجيلات الثلاثة محفوظة داخل ملفات التطبيق، ويمكن تشغيلهما دون اتصال بالإنترنت. تظهر التسجيلات بأرقام فقط دون أسماء المؤذنين أو البلدان.
        </Text>
        <SulyButton title="إيقاف جميع التسجيلات" secondary onPress={stop} />
        <SulyButton title="العودة إلى الإعدادات" onPress={() => router.back()} />
      </SulyCard>
    </AppScreen>
  );
}

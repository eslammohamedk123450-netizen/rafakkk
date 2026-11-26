import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { AppScreen, ScreenHeading, SulyCard, SulyButton, TinyTag, useSulyTheme } from "@/components/suly-ui";
import { QURAN_SURAHS } from "@/lib/quran";

type Moshaf = { id: number; name: string; server: string; surah_total: number; surah_list?: string };
type Reciter = { id: number; name: string; moshaf?: Moshaf[] };
type RadioStation = { id: number; name?: string; url?: string };

const API = "https://mp3quran.net/api/v3";
const SURAH_NAMES = QURAN_SURAHS.map((surah) => surah.name);

export default function AudioScreen() {
  const router = useRouter();
  const { colors } = useSulyTheme();
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [section, setSection] = useState<"reciters" | "radio">("reciters");
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReciter, setSelectedReciter] = useState<number | null>(null);
  const [selectedMoshaf, setSelectedMoshaf] = useState<number | null>(null);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [notice, setNotice] = useState("");
  const [trackTitle, setTrackTitle] = useState("اختر قارئًا أو إذاعة");
  const [trackArtist, setTrackArtist] = useState("رفيقك نحو الالتزام");
  const [isLive, setIsLive] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => setNotice("تعذر تهيئة الصوت على هذا الجهاز."));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`${API}/reciters?language=ar`).then((r) => { if (!r.ok) throw new Error("reciters"); return r.json(); }),
      fetch(`${API}/radios?language=ar`).then((r) => { if (!r.ok) throw new Error("radios"); return r.json(); }),
    ]).then(([reciterData, radioData]) => {
      if (!active) return;
      const list: Reciter[] = Array.isArray(reciterData?.reciters) ? reciterData.reciters : [];
      const radioList: RadioStation[] = Array.isArray(radioData?.radios) ? radioData.radios : Array.isArray(radioData?.radio) ? radioData.radio : [];
      setReciters(list);
      setStations(radioList);
      if (list[0]) {
        setSelectedReciter(list[0].id);
        setSelectedMoshaf(list[0].moshaf?.[0]?.id ?? null);
      }
    }).catch(() => {
      if (active) setError("تعذر تحميل المكتبة الصوتية. تحقق من الإنترنت وحاول مرة أخرى.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (status.playing) {
      rotation.setValue(0);
      const loop = Animated.loop(Animated.timing(rotation, {
        toValue: 1,
        duration: 9000,
        useNativeDriver: true,
      }));
      loop.start();
      return () => loop.stop();
    }
    rotation.stopAnimation();
  }, [status.playing, rotation]);

  const reciter = reciters.find((item) => item.id === selectedReciter) ?? reciters[0];
  const moshaf = reciter?.moshaf?.find((item) => item.id === selectedMoshaf) ?? reciter?.moshaf?.[0];
  const availableSurahs = useMemo(() => {
    const ids = moshaf?.surah_list?.split(",").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 114);
    return ids?.length ? ids : Array.from({ length: Math.min(114, moshaf?.surah_total ?? 114) }, (_, index) => index + 1);
  }, [moshaf]);

  const playUrl = async (url: string | undefined, title: string, artist: string, live: boolean) => {
    if (!url || !/^https:\/\//i.test(url)) {
      setNotice("رابط الصوت غير متاح أو غير آمن.");
      return;
    }
    try {
      setNotice("جارٍ تجهيز الصوت...");
      setTrackTitle(title);
      setTrackArtist(artist);
      setIsLive(live);
      player.pause();
      player.replace(url);
      player.setActiveForLockScreen(true, { title, artist, albumTitle: "رفيقك نحو الالتزام" }, { isLiveStream: live });
      player.play();
      setNotice("");
    } catch {
      setNotice("تعذر تشغيل هذا المصدر. جرّب مصدرًا آخر.");
    }
  };

  const playSurah = (surahId = selectedSurah, selected = reciter, edition = moshaf) => {
    if (!selected || !edition?.server) {
      setNotice("اختر قارئًا ومصحفًا صوتيًا أولًا.");
      return;
    }
    const url = `${edition.server.replace(/\/$/, "")}/${surahId.toString().padStart(3, "0")}.mp3`;
    setSelectedSurah(surahId);
    void playUrl(url, `سورة ${SURAH_NAMES[surahId - 1] ?? surahId}`, selected.name, false);
  };

  const stopAudio = () => {
    player.pause();
    void player.seekTo(0).catch(() => undefined);
    player.clearLockScreenControls();
    setNotice("تم إيقاف التشغيل.");
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
  };
  const rotationStyle = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <AppScreen>
      <ScreenHeading title="التلاوات والإذاعة" subtitle="استمع إلى القرآن الكريم" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold }}>رجوع</Text></Pressable>} />
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <View style={{ flex: 1 }}><SulyButton title="القراء والتلاوات" secondary={section !== "reciters"} onPress={() => setSection("reciters")} /></View>
        <View style={{ flex: 1 }}><SulyButton title="إذاعة القرآن" secondary={section !== "radio"} onPress={() => setSection("radio")} /></View>
      </View>

      <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17, textAlign: "center" }}>مشغل رفيقك الصوتي</Text>
        <View style={{ alignItems: "center", paddingVertical: 14 }}>
          <View style={{ width: 244, height: 244, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={{ width: 224, height: 224, borderRadius: 112, backgroundColor: "#101114", borderWidth: 7, borderColor: "#292A2E", alignItems: "center", justifyContent: "center", transform: [{ rotate: rotationStyle }] }}>
              {[190, 166, 142, 118, 94].map((size) => <View key={size} style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: "#414247" }} />)}
              <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: colors.gold, borderWidth: 5, borderColor: "#E8D18A", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#151515", fontSize: 25, fontWeight: "900" }}>ر</Text>
                <Text style={{ color: "#272014", fontSize: 8, fontWeight: "800" }}>SULY AUDIO</Text>
              </View>
            </Animated.View>
            <View style={{ position: "absolute", right: 1, top: 4, width: 88, height: 10, borderRadius: 6, backgroundColor: "#B7B7B7", transform: [{ rotate: "43deg" }], borderWidth: 1, borderColor: "#555" }}>
              <View style={{ position: "absolute", right: -3, top: -4, width: 17, height: 17, borderRadius: 9, backgroundColor: "#D4AF37" }} />
            </View>
          </View>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16, textAlign: "center" }}>{trackTitle}</Text>
          <Text style={{ color: colors.muted, marginTop: 4, textAlign: "center" }}>{trackArtist}</Text>
          <Text style={{ color: status.playing ? colors.gold : colors.muted, marginTop: 7, fontSize: 12 }}>{status.isBuffering ? "جارٍ التحميل..." : status.playing ? "يعمل الآن • القرص يدور" : "متوقف مؤقتًا"}</Text>
          {!isLive && status.duration > 0 ? <View style={{ width: "100%", marginTop: 10, gap: 5 }}>
            <View style={{ height: 4, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" }}>
              <View style={{ height: 4, width: `${Math.min(100, (status.currentTime / status.duration) * 100)}%`, backgroundColor: colors.gold }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 11 }}>{formatTime(status.currentTime)}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{formatTime(status.duration)}</Text></View>
          </View> : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <SulyButton title={status.playing ? "إيقاف مؤقت" : "استكمال"} secondary onPress={() => status.playing ? player.pause() : player.play()} disabled={!trackTitle || trackTitle === "اختر قارئًا أو إذاعة"} />
            <SulyButton title="إيقاف" secondary onPress={stopAudio} disabled={trackTitle === "اختر قارئًا أو إذاعة"} />
          </View>
        </View>
        {notice ? <Text style={{ color: colors.gold, textAlign: "center", fontSize: 12 }}>{notice}</Text> : null}
      </SulyCard>

      {loading ? <SulyCard><ActivityIndicator color={colors.gold} /><Text style={{ color: colors.muted, textAlign: "center" }}>تحميل مكتبة الصوت...</Text></SulyCard> : null}
      {error ? <SulyCard><Text style={{ color: colors.text, textAlign: "right" }}>{error}</Text><SulyButton title="إعادة المحاولة" secondary onPress={() => router.replace("/audio")} /></SulyCard> : null}

      {!loading && !error && section === "reciters" ? (
        <>
          <SulyCard>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>اختيار القارئ — اضغط على الاسم للتشغيل</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>
              {reciters.map((item) => <Pressable key={item.id} onPress={() => {
                const edition = item.moshaf?.[0];
                setSelectedReciter(item.id);
                setSelectedMoshaf(edition?.id ?? null);
                if (edition) playSurah(selectedSurah, item, edition);
              }} style={{ borderWidth: 1, borderColor: selectedReciter === item.id ? colors.gold : colors.border, backgroundColor: selectedReciter === item.id ? colors.gold + "22" : "transparent", paddingHorizontal: 11, paddingVertical: 9, borderRadius: 18 }}>
                <Text style={{ color: selectedReciter === item.id ? colors.gold : colors.text, fontSize: 12, fontWeight: "700" }}>{item.name}</Text>
              </Pressable>)}
            </View>
          </SulyCard>
          {reciter?.moshaf?.length ? <SulyCard>
            <Text style={{ color: colors.text, fontWeight: "700", textAlign: "right" }}>الرواية / المصحف الصوتي</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{reciter.moshaf.map((edition) => <TinyTag key={edition.id} title={edition.name} selected={selectedMoshaf === edition.id} onPress={() => { setSelectedMoshaf(edition.id); playSurah(selectedSurah, reciter, edition); }} />)}</View>
          </SulyCard> : null}
          <SulyCard>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>السور — اضغط على السورة لتبدأ فورًا</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{availableSurahs.map((id) => <TinyTag key={id} title={SURAH_NAMES[id - 1] ?? `سورة ${id}`} selected={selectedSurah === id} onPress={() => playSurah(id)} />)}</View>
          </SulyCard>
        </>
      ) : null}

      {!loading && !error && section === "radio" ? <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>إذاعات القرآن الكريم المباشرة</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>اضغط على اسم الإذاعة وسيبدأ البث داخل التطبيق.</Text>
        {stations.length ? stations.map((station) => {
          const title = station.name || `إذاعة ${station.id}`;
          const selected = trackTitle === title;
          return <Pressable key={station.id} onPress={() => void playUrl(station.url, title, "إذاعة القرآن الكريم", true)} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 13, paddingHorizontal: 8, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: selected ? colors.gold : colors.text, textAlign: "right", fontWeight: "700", flex: 1 }}>{title}</Text>
            <Text style={{ color: selected ? colors.gold : colors.muted, fontSize: 12 }}>{selected && status.playing ? "يعمل الآن ◉" : "▶ استمع"}</Text>
          </Pressable>;
        }) : <Text style={{ color: colors.muted, textAlign: "right" }}>لم تصل قائمة الإذاعات من المصدر.</Text>}
      </SulyCard> : null}
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>التشغيل داخل التطبيق عبر MP3Quran.net. قد يتطلب البث اتصال إنترنت مستقرًا.</Text>
    </AppScreen>
  );
}

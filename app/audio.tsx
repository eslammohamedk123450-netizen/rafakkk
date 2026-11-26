import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
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
  const [section, setSection] = useState<"reciters" | "radio">("reciters");
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReciter, setSelectedReciter] = useState<number | null>(null);
  const [selectedMoshaf, setSelectedMoshaf] = useState<number | null>(null);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [notice, setNotice] = useState("");

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

  const reciter = reciters.find((item) => item.id === selectedReciter) ?? reciters[0];
  const moshaf = reciter?.moshaf?.find((item) => item.id === selectedMoshaf) ?? reciter?.moshaf?.[0];
  const availableSurahs = useMemo(() => {
    const ids = moshaf?.surah_list?.split(",").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 114);
    return ids?.length ? ids : Array.from({ length: Math.min(114, moshaf?.surah_total ?? 114) }, (_, index) => index + 1);
  }, [moshaf]);

  const openAudio = async (url: string | undefined) => {
    if (!url || !/^https:\/\//i.test(url)) {
      setNotice("رابط الصوت غير متاح أو غير آمن.");
      return;
    }
    try {
      await Linking.openURL(url);
      setNotice("تم فتح رابط الصوت في مشغل الهاتف/المتصفح.");
    } catch {
      setNotice("تعذر فتح رابط الصوت.");
    }
  };

  const playSurah = () => {
    if (!moshaf?.server) return;
    const surah = selectedSurah.toString().padStart(3, "0");
    void openAudio(`${moshaf.server.replace(/\/$/, "")}/${surah}.mp3`);
  };

  return (
    <AppScreen>
      <ScreenHeading title="التلاوات والإذاعة" subtitle="استمع إلى القرآن الكريم" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold }}>رجوع</Text></Pressable>} />
      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
        <View style={{ flex: 1 }}><SulyButton title="القراء والتلاوات" secondary={section !== "reciters"} onPress={() => setSection("reciters")} /></View>
        <View style={{ flex: 1 }}><SulyButton title="إذاعة القرآن" secondary={section !== "radio"} onPress={() => setSection("radio")} /></View>
      </View>
      {loading ? <SulyCard><ActivityIndicator color={colors.gold} /><Text style={{ color: colors.muted, textAlign: "center" }}>تحميل مكتبة الصوت...</Text></SulyCard> : null}
      {error ? <SulyCard><Text style={{ color: colors.text, textAlign: "right" }}>{error}</Text><SulyButton title="إعادة المحاولة" secondary onPress={() => router.replace("/audio")} /></SulyCard> : null}
      {notice ? <SulyCard><Text style={{ color: colors.gold, textAlign: "right" }}>{notice}</Text></SulyCard> : null}
      {!loading && !error && section === "reciters" ? (
        <>
          <SulyCard>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>اختيار القارئ</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>
              {reciters.map((item) => <TinyTag key={item.id} title={item.name} selected={selectedReciter === item.id} onPress={() => { setSelectedReciter(item.id); setSelectedMoshaf(item.moshaf?.[0]?.id ?? null); }} />)}
            </View>
          </SulyCard>
          {reciter?.moshaf?.length ? <SulyCard>
            <Text style={{ color: colors.text, fontWeight: "700", textAlign: "right" }}>الرواية / المصحف الصوتي</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{reciter.moshaf.map((edition) => <TinyTag key={edition.id} title={edition.name} selected={selectedMoshaf === edition.id} onPress={() => setSelectedMoshaf(edition.id)} />)}</View>
          </SulyCard> : null}
          <SulyCard>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>اختر سورة</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{availableSurahs.map((id) => <TinyTag key={id} title={SURAH_NAMES[id - 1] ?? `سورة ${id}`} selected={selectedSurah === id} onPress={() => setSelectedSurah(id)} />)}</View>
            <SulyButton title={`فتح تلاوة ${SURAH_NAMES[selectedSurah - 1]}`} onPress={playSurah} disabled={!moshaf?.server} />
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>التلاوة تُفتح حاليًا عبر مشغل الهاتف أو المتصفح. التشغيل الداخلي والخلفي سيتم إضافته بعد اعتماد مكتبة الصوت الخاصة بالتطبيق.</Text>
          </SulyCard>
        </>
      ) : null}
      {!loading && !error && section === "radio" ? <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>إذاعات القرآن الكريم المباشرة</Text>
        {stations.length ? stations.map((station) => {
          const title = station.name || `إذاعة ${station.id}`;
          return <View key={station.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 }}>
            <Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>{title}</Text>
            <SulyButton title="استمع إلى الإذاعة" secondary onPress={() => openAudio(station.url)} />
          </View>;
        }) : <Text style={{ color: colors.muted, textAlign: "right" }}>لم تصل قائمة الإذاعات من المصدر.</Text>}
      </SulyCard> : null}
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>مكتبة الصوت تعتمد على MP3Quran.net، وقد يتطلب البث اتصال إنترنت مستقرًا.</Text>
    </AppScreen>
  );
}

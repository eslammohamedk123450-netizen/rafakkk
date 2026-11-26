import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Platform, Pressable, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { AppScreen, ScreenHeading, SulyCard, SulyButton, TinyTag, useSulyTheme } from "@/components/suly-ui";
import { QURAN_SURAHS } from "@/lib/quran";

type Moshaf = { id: number; name: string; server: string; surah_total: number; surah_list?: string };
type Reciter = { id: number; name: string; moshaf?: Moshaf[] };
type RadioStation = { id: string; name: string; country: string; flag: string; city: string; description: string; url: string; sourceLabel: string };
type SavedTrack = { key: string; reciterId: number; reciterName: string; surahId: number; surahName: string; uri: string; remoteUrl: string; savedAt: number };

const API = "https://mp3quran.net/api/v3";
const DOWNLOADS_KEY = "@rafik_audio_downloads_v1";
const OFFICIAL_RADIO_STATIONS: RadioStation[] = [
  { id: "egypt-cairo", name: "إذاعة القرآن الكريم من القاهرة", country: "جمهورية مصر العربية", flag: "🇪🇬", city: "القاهرة • ماسبيرو", description: "تلاوات كبار القراء المصريين، وبرامج التفسير والفتاوى والأسرة والمجتمع على مدار اليوم.", url: "https://stream.radiojar.com/8s5u5tpdtwzuv", sourceLabel: "بث إذاعة القاهرة" },
  { id: "saudi-mecca", name: "إذاعة القرآن الكريم السعودية", country: "المملكة العربية السعودية", flag: "🇸🇦", city: "مكة المكرمة", description: "بث إذاعي قرآني سعودي متواصل، مع تلاوات وبرامج دينية من الإذاعة السعودية.", url: "https://n12.radiojar.com/0tpy1h0kxtzuv", sourceLabel: "بث إذاعة السعودية" },
];
const SURAH_NAMES = QURAN_SURAHS.map((surah) => surah.name);
const RECITER_PHOTOS: Array<{ match: string[]; uri: string; credit: string }> = [
  { match: ["الحصري", "الحصرى", "Husary", "Hussary"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Hussary.jpg?width=480", credit: "Wikimedia Commons • Public domain" },
  { match: ["المنشاوي", "المنشاوى", "Minshawi", "Minshawy"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Elminshwey.jpg?width=480", credit: "Wikimedia Commons • Public domain" },
  { match: ["عبد الباسط", "عبدالباسط", "Abdul Basit", "Abdel Basit"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Abdul_Basit_Abd_us-Samad_in_South_Africa_in_1966_%283%29_%28cropped%29.jpg?width=480", credit: "Wikimedia Commons • Public domain" },
  { match: ["السديس", "Sudais"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg?width=480", credit: "الصورة: Prime Minister’s Office • ترخيص GODL-India" },
  { match: ["ماهر المعيقلي", "المعيقلي", "Mueaqly", "Muaiqly"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Maher_Al_Mueaqly.png?width=480", credit: "Wikimedia Commons • CC BY-SA 3.0" },
  { match: ["العفاسي", "Alafasy", "Afasy"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg?width=480", credit: "Wikimedia Commons" },
  { match: ["المطرود", "Matrood", "Matroud"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Abdullah_Al_Matroud.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["الجهني", "الجُهني", "Juhany"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Abdullah_Al_Juhany_%28Cropped%29.png?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["الكلباني", "Kalbani"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Kalbani.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 3.0" },
  { match: ["العجمي", "Al-Ajmi", "Ajmi"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Ahmad_bin_Ali_Al-Ajmi.png?width=480", credit: "Wikimedia Commons • CC BY-SA 3.0" },
  { match: ["الحذيفي", "Hudhaify", "Huthaify"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Huthaify.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["علي جابر", "Ali Jaber"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D8%B9%D9%84%D9%8A_%D8%AC%D8%A7%D8%A8%D8%B1.png?width=480", credit: "Wikimedia Commons • CC0" },
  { match: ["بندر بليلة", "Bandar Baleela"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Bandar_Baleela.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 3.0" },
  { match: ["محمد جبريل", "Muhammad Jibreel", "Jebril"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Qari_Muhammad_Jebril%2C_Ramadan_2019.png?width=480", credit: "Wikimedia Commons • CC BY 3.0" },
  { match: ["ناصر القطامي", "Nasser Al Qatami", "Al-Qatami"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D9%86%D8%A7%D8%B5%D8%B1_%D8%A7%D9%84%D9%82%D8%B7%D8%A7%D9%85%D9%8A.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["رعد الكردي", "Raad Al-Kurdi", "Raad Mohammad"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Raad_Mohammad_Al_Kurdi.png?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["سعد الغامدي", "Saad Al-Ghamdi", "Saad al Ghamdi"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Saad_al_Ghamdi.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["سعود الشريم", "Saud Ash-Shuraim", "Saud Shuraim"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Saud_Shuraim_doing_the_Khutbah.png?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["مصطفى إسماعيل", "مصطفى اسماعيل", "Mustafa Ismail", "Mostafa Ismaeel"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Mostafa_Ismaeel.jpg?width=480", credit: "Wikimedia Commons • Public domain" },
  { match: ["صالح البدير", "Salah Al-Budair"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Salah_Ibn_Mohammed_Al_Budair.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
  { match: ["ياسر الدوسري", "Yasser Al-Dossari", "Yasser Al-Dosari"], uri: "https://commons.wikimedia.org/wiki/Special:FilePath/Yasser_Al-Dosari_%28cropped%29.jpg?width=480", credit: "Wikimedia Commons • CC BY-SA 4.0" },
];

function getReciterPhoto(name: string) {
  const normalized = name.toLocaleLowerCase();
  return RECITER_PHOTOS.find((item) => item.match.some((part) => normalized.includes(part.toLocaleLowerCase())));
}

function normalizeArabicName(value: string) {
  return value.toLocaleLowerCase("ar")
    .normalize("NFD")
    .replace(/[\\u064B-\\u065F\\u0670\\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export default function AudioScreen() {
  const router = useRouter();
  const { colors } = useSulyTheme();
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [section, setSection] = useState<"reciters" | "radio" | "downloads">("reciters");
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [stations] = useState<RadioStation[]>(OFFICIAL_RADIO_STATIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReciter, setSelectedReciter] = useState<number | null>(null);
  const [selectedMoshaf, setSelectedMoshaf] = useState<number | null>(null);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [trackTitle, setTrackTitle] = useState("اختر قارئًا أو إذاعة");
  const [trackArtist, setTrackArtist] = useState("رفيقك نحو الالتزام");
  const [isLive, setIsLive] = useState(false);
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => setNotice("تعذر تهيئة الصوت على هذا الجهاز."));
    void AsyncStorage.getItem(DOWNLOADS_KEY).then((value) => {
      if (value) setSavedTracks(JSON.parse(value) as SavedTrack[]);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(`${API}/reciters?language=ar`).then((r) => { if (!r.ok) throw new Error("reciters"); return r.json(); })
      .then((reciterData) => {
        if (!active) return;
        const list: Reciter[] = Array.isArray(reciterData?.reciters) ? reciterData.reciters : [];
        setReciters(list);
      }).catch(() => { if (active) setError("تعذر تحميل مكتبة القراء. تحقق من الإنترنت وحاول مرة أخرى."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (status.playing) {
      rotation.setValue(0);
      const loop = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 9000, useNativeDriver: true }));
      loop.start();
      return () => loop.stop();
    }
    rotation.stopAnimation();
  }, [status.playing, rotation]);

  const reciter = reciters.find((item) => item.id === selectedReciter) ?? reciters[0];
  const moshaf = reciter?.moshaf?.find((item) => item.id === selectedMoshaf) ?? reciter?.moshaf?.[0];
  const availableSurahs = useMemo(() => {
    if (!moshaf) return [];
    const ids = moshaf?.surah_list?.split(",").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 114);
    return ids?.length ? ids : Array.from({ length: Math.min(114, moshaf?.surah_total ?? 114) }, (_, index) => index + 1);
  }, [moshaf]);
  const filteredReciters = useMemo(() => {
    const term = normalizeArabicName(search.trim());
    if (!term) return reciters;
    return reciters
      .filter((item) => normalizeArabicName(item.name).includes(term))
      .sort((a, b) => {
        const aName = normalizeArabicName(a.name);
        const bName = normalizeArabicName(b.name);
        const aPrefix = aName.startsWith(term) ? 0 : aName.split(/\\s+/).some((word) => word.startsWith(term)) ? 1 : 2;
        const bPrefix = bName.startsWith(term) ? 0 : bName.split(/\\s+/).some((word) => word.startsWith(term)) ? 1 : 2;
        return aPrefix - bPrefix || a.name.localeCompare(b.name, "ar");
      });
  }, [reciters, search]);

  const matchingLetters = useMemo(() => {
    const term = normalizeArabicName(search.trim());
    if (!term) return [];
    const letters = new Set<string>();
    filteredReciters.forEach((item) => normalizeArabicName(item.name).split(/\\s+/).forEach((word) => {
      if (word.includes(term) && word.length) letters.add(word.charAt(0));
    }));
    return [...letters].slice(0, 12);
  }, [filteredReciters, search]);

  const persistTracks = async (items: SavedTrack[]) => {
    setSavedTracks(items);
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(items));
  };

  const playUrl = async (url: string | undefined, title: string, artist: string, live: boolean) => {
    if (!url || !(/^(https:\/\/|file:\/\/)/i.test(url))) { setNotice("رابط الصوت غير متاح أو غير آمن."); return; }
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
    } catch { setNotice("تعذر تشغيل هذا المصدر. جرّب مصدرًا آخر."); }
  };

  const playSurah = (surahId = selectedSurah, selected = reciter, edition = moshaf, localUri?: string) => {
    if (!selected || !edition?.server) { setNotice("اختر قارئًا ومصحفًا صوتيًا أولًا."); return; }
    const remoteUrl = `${edition.server.replace(/\/$/, "")}/${surahId.toString().padStart(3, "0")}.mp3`;
    setSelectedSurah(surahId);
    void playUrl(localUri ?? remoteUrl, `سورة ${SURAH_NAMES[surahId - 1] ?? surahId}`, selected.name, false);
  };

  const playSaved = (track: SavedTrack) => {
    setTrackTitle(track.surahName);
    setTrackArtist(track.reciterName);
    setIsLive(false);
    try {
      player.pause();
      player.replace(track.uri);
      player.setActiveForLockScreen(true, { title: track.surahName, artist: track.reciterName, albumTitle: "رفيقك نحو الالتزام" });
      player.play();
      setNotice("");
    } catch { setNotice("تعذر تشغيل الملف المحفوظ."); }
  };

  const downloadSurah = async (surahId: number, selected = reciter, edition = moshaf) => {
    if (Platform.OS === "web") { setNotice("تنزيل الملفات للاستخدام دون إنترنت متاح في نسخة أندرويد حاليًا."); return; }
    if (!selected || !edition?.server || !FileSystem.documentDirectory) return;
    const key = `${selected.id}-${edition.id}-${surahId}`;
    if (savedTracks.some((track) => track.key === key)) { setNotice("السورة محفوظة بالفعل على جهازك."); return; }
    const remoteUrl = `${edition.server.replace(/\/$/, "")}/${surahId.toString().padStart(3, "0")}.mp3`;
    try {
      setDownloadingKey(key);
      setNotice("جارٍ تنزيل السورة وحفظها على الجهاز...");
      const folder = `${FileSystem.documentDirectory}recitations/`;
      const folderInfo = await FileSystem.getInfoAsync(folder);
      if (!folderInfo.exists) await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
      const localUri = `${folder}${key}.mp3`;
      const result = await FileSystem.downloadAsync(remoteUrl, localUri);
      const item: SavedTrack = {
        key, reciterId: selected.id, reciterName: selected.name, surahId,
        surahName: `سورة ${SURAH_NAMES[surahId - 1] ?? surahId}`,
        uri: result.uri, remoteUrl, savedAt: Date.now(),
      };
      await persistTracks([item, ...savedTracks]);
      setNotice("تم تنزيل السورة. تقدر تسمعها الآن من المحفوظات بدون إنترنت.");
    } catch {
      setNotice("فشل التنزيل. تأكد من الإنترنت ومساحة الجهاز وحاول مرة أخرى.");
    } finally { setDownloadingKey(null); }
  };

  const deleteSaved = async (track: SavedTrack) => {
    try { await FileSystem.deleteAsync(track.uri, { idempotent: true }); } catch { /* file may already be absent */ }
    await persistTracks(savedTracks.filter((item) => item.key !== track.key));
    setNotice("تم حذف النسخة المحفوظة من الجهاز.");
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
      <ScreenHeading title="التلاوات والإذاعة" subtitle="استمع إلى القرآن الكريم" action={<Pressable onPress={() => selectedReciter && section === "reciters" ? setSelectedReciter(null) : router.back()} style={{ padding: 8 }}><Text style={{ color: colors.gold }}>رجوع</Text></Pressable>} />
      <View style={{ flexDirection: "row-reverse", gap: 7 }}>
        <View style={{ flex: 1 }}><SulyButton title="القراء" secondary={section !== "reciters"} onPress={() => { setSection("reciters"); setSelectedReciter(null); }} /></View>
        <View style={{ flex: 1 }}><SulyButton title="الإذاعة" secondary={section !== "radio"} onPress={() => setSection("radio")} /></View>
        <View style={{ flex: 1 }}><SulyButton title={`المحفوظات ${savedTracks.length ? `(${savedTracks.length})` : ""}`} secondary={section !== "downloads"} onPress={() => setSection("downloads")} /></View>
      </View>

      <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17, textAlign: "center" }}>مشغل رفيقك الصوتي</Text>
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <View style={{ width: 224, height: 224, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={{ width: 208, height: 208, borderRadius: 104, backgroundColor: "#101114", borderWidth: 7, borderColor: "#292A2E", alignItems: "center", justifyContent: "center", transform: [{ rotate: rotationStyle }] }}>
              {[180, 156, 132, 108, 84].map((size) => <View key={size} style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: "#414247" }} />)}
              <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: colors.gold, borderWidth: 5, borderColor: "#E8D18A", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#151515", fontSize: 25, fontWeight: "900" }}>ر</Text><Text style={{ color: "#272014", fontSize: 8, fontWeight: "800" }}>SULY AUDIO</Text></View>
            </Animated.View>
            <View style={{ position: "absolute", right: 0, top: 2, width: 82, height: 10, borderRadius: 6, backgroundColor: "#B7B7B7", transform: [{ rotate: "43deg" }], borderWidth: 1, borderColor: "#555" }}><View style={{ position: "absolute", right: -3, top: -4, width: 17, height: 17, borderRadius: 9, backgroundColor: "#D4AF37" }} /></View>
          </View>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16, textAlign: "center" }}>{trackTitle}</Text>
          <Text style={{ color: colors.muted, marginTop: 4, textAlign: "center" }}>{trackArtist}</Text>
          <Text style={{ color: status.playing ? colors.gold : colors.muted, marginTop: 7, fontSize: 12 }}>{status.isBuffering ? "جارٍ التحميل..." : status.playing ? "يعمل الآن • القرص يدور" : "متوقف مؤقتًا"}</Text>
          {!isLive && status.duration > 0 ? <View style={{ width: "100%", marginTop: 10, gap: 5 }}>
            <View style={{ height: 4, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" }}><View style={{ height: 4, width: `${Math.min(100, (status.currentTime / status.duration) * 100)}%`, backgroundColor: colors.gold }} /></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 11 }}>{formatTime(status.currentTime)}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{formatTime(status.duration)}</Text></View>
          </View> : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <SulyButton title={status.playing ? "إيقاف مؤقت" : "استكمال"} secondary onPress={() => status.playing ? player.pause() : player.play()} disabled={trackTitle === "اختر قارئًا أو إذاعة"} />
            <SulyButton title="إيقاف" secondary onPress={stopAudio} disabled={trackTitle === "اختر قارئًا أو إذاعة"} />
          </View>
        </View>
        {notice ? <Text style={{ color: colors.gold, textAlign: "center", fontSize: 12 }}>{notice}</Text> : null}
      </SulyCard>

      {loading ? <SulyCard><ActivityIndicator color={colors.gold} /><Text style={{ color: colors.muted, textAlign: "center" }}>تحميل مكتبة الصوت...</Text></SulyCard> : null}
      {error ? <SulyCard><Text style={{ color: colors.text, textAlign: "right" }}>{error}</Text><SulyButton title="إعادة المحاولة" secondary onPress={() => router.replace("/audio")} /></SulyCard> : null}

      {!loading && !error && section === "reciters" && !selectedReciter ? <>
        <SulyCard>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, textAlign: "right" }}>اختر القارئ</Text>
          <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>صور متاحة لبعض القراء، وباقي القراء يظهر لهم رمز تعريفي بدل صورة غير مؤكدة.</Text>
          <TextInput value={search} onChangeText={setSearch} placeholder="اكتب أي جزء من اسم القارئ أو اسم عائلته..." placeholderTextColor={colors.muted} autoCorrect={false} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, textAlign: "right", marginTop: 10 }} />
          {matchingLetters.length ? <View style={{ gap: 7, marginTop: 10 }}>
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>حروف الأسماء المطابقة — اضغط لتصفية النتائج</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>
              {matchingLetters.map((letter) => <Pressable key={letter} onPress={() => setSearch(letter)} style={{ minWidth: 34, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.gold + "20", borderWidth: 1, borderColor: colors.gold + "66", alignItems: "center" }}><Text style={{ color: colors.gold, fontWeight: "900" }}>{letter}</Text></Pressable>)}
            </View>
          </View> : null}
          {search.trim() ? <Pressable onPress={() => setSearch("")} style={{ alignSelf: "flex-end", paddingVertical: 6 }}><Text style={{ color: colors.gold, fontSize: 12 }}>مسح البحث</Text></Pressable> : null}
        </SulyCard>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
          {filteredReciters.map((item) => {
            const photo = getReciterPhoto(item.name);
            const count = item.moshaf?.reduce((sum, edition) => sum + (edition.surah_total || 0), 0) ?? 0;
            return <Pressable key={item.id} onPress={() => { setSelectedReciter(item.id); setSelectedMoshaf(item.moshaf?.[0]?.id ?? null); setSelectedSurah(1); }} style={{ width: "48%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 9, alignItems: "center" }}>
              {photo ? <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ width: "100%", height: 128, borderRadius: 11, backgroundColor: colors.border }} /> : <View style={{ width: "100%", height: 128, borderRadius: 11, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.gold, fontSize: 42, fontWeight: "900" }}>{item.name.trim().charAt(0)}</Text><Text style={{ color: colors.muted, fontSize: 10 }}>القارئ</Text></View>}
              {photo ? <Text style={{ color: colors.muted, fontSize: 8, textAlign: "center", marginTop: 3 }}>{photo.credit}</Text> : null}
              <Text numberOfLines={2} style={{ color: colors.text, fontWeight: "800", textAlign: "center", marginTop: 9, minHeight: 38 }}>{item.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{item.moshaf?.length ?? 0} مصحف • {count} سورة متاحة</Text>
              <Text style={{ color: colors.gold, fontSize: 11, marginTop: 7 }}>عرض التلاوات ←</Text>
            </Pressable>;
          })}
        </View>
        {filteredReciters.length === 0 ? <SulyCard><Text style={{ color: colors.muted, textAlign: "center" }}>لا يوجد قارئ بهذا الاسم.</Text></SulyCard> : null}
      </> : null}

      {!loading && !error && section === "reciters" && selectedReciter && reciter ? <>
        <SulyCard>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
            {getReciterPhoto(reciter.name) ? <Image source={{ uri: getReciterPhoto(reciter.name)!.uri }} style={{ width: 88, height: 104, borderRadius: 12 }} resizeMode="cover" /> : <View style={{ width: 88, height: 104, borderRadius: 12, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.gold, fontSize: 34, fontWeight: "900" }}>{reciter.name.charAt(0)}</Text></View>}
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "right" }}>{reciter.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right", marginTop: 5 }}>{availableSurahs.length} سورة متاحة في المصحف المحدد</Text>
              <Pressable onPress={() => setSelectedReciter(null)} style={{ paddingVertical: 8 }}><Text style={{ color: colors.gold }}>← العودة لكل القراء</Text></Pressable>
            </View>
          </View>
          {getReciterPhoto(reciter.name) ? <Text style={{ color: colors.muted, fontSize: 9, textAlign: "center", marginTop: 8 }}>{getReciterPhoto(reciter.name)?.credit}</Text> : null}
        </SulyCard>
        {reciter.moshaf?.length ? <SulyCard>
          <Text style={{ color: colors.text, fontWeight: "800", textAlign: "right" }}>اختر الرواية أو المصحف الصوتي</Text>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginTop: 9 }}>{reciter.moshaf.map((edition) => <TinyTag key={edition.id} title={edition.name} selected={selectedMoshaf === edition.id} onPress={() => { setSelectedMoshaf(edition.id); setSelectedSurah(1); }} />)}</View>
        </SulyCard> : null}
        <SulyCard>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17, textAlign: "right" }}>سور القرآن المتاحة بصوت القارئ</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>اضغط تشغيل للاستماع، أو تنزيل لحفظ السورة على جهازك.</Text>
          {availableSurahs.length ? availableSurahs.map((id) => {
            const key = `${reciter.id}-${moshaf?.id ?? 0}-${id}`;
            const saved = savedTracks.find((track) => track.key === key);
            const title = SURAH_NAMES[id - 1] ?? `سورة ${id}`;
            return <View key={id} style={{ flexDirection: "row-reverse", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10, gap: 8 }}>
              <View style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: colors.gold + "20", alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.gold, fontSize: 11, fontWeight: "800" }}>{id}</Text></View>
              <View style={{ flex: 1 }}><Text style={{ color: colors.text, textAlign: "right", fontWeight: "700" }}>{title}</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 10 }}>{saved ? "محفوظة على الجهاز" : "متاحة للاستماع والتنزيل"}</Text></View>
              <Pressable onPress={() => saved ? playSurah(id, reciter, moshaf, saved.uri) : playSurah(id, reciter, moshaf)} style={{ backgroundColor: colors.gold + "20", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}><Text style={{ color: colors.gold, fontWeight: "800", fontSize: 11 }}>▶</Text></Pressable>
              <Pressable disabled={!!saved || downloadingKey === key} onPress={() => void downloadSurah(id, reciter, moshaf)} style={{ borderWidth: 1, borderColor: saved ? colors.gold : colors.border, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, opacity: saved || downloadingKey === key ? 0.65 : 1 }}><Text style={{ color: saved ? colors.gold : colors.text, fontSize: 11, fontWeight: "700" }}>{downloadingKey === key ? "..." : saved ? "✓ تم" : "↓ تنزيل"}</Text></Pressable>
            </View>;
          }) : <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 18 }}>لا توجد تسجيلات كاملة متاحة لهذا القارئ في المصدر حاليًا.</Text>}
        </SulyCard>
      </> : null}

      {!loading && !error && section === "downloads" ? <SulyCard>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18, textAlign: "right" }}>التلاوات المحفوظة على جهازك</Text>
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>تقدر تشغل الملفات دي بدون إنترنت. التنزيلات محفوظة داخل مساحة التطبيق.</Text>
        {savedTracks.length ? savedTracks.map((track) => <View key={track.key} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 11 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.text, textAlign: "right", fontWeight: "800" }}>{track.surahName}</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>{track.reciterName}</Text></View>
          <Pressable onPress={() => playSaved(track)} style={{ backgroundColor: colors.gold + "20", borderRadius: 10, padding: 9 }}><Text style={{ color: colors.gold }}>▶ تشغيل</Text></Pressable>
          <Pressable onPress={() => void deleteSaved(track)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 9 }}><Text style={{ color: colors.muted }}>حذف</Text></Pressable>
        </View>) : <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 20 }}>لسه مفيش سور محفوظة. افتح قارئ واضغط تنزيل بجانب السورة.</Text>}
      </SulyCard> : null}

      {!loading && !error && section === "radio" ? <>
        <SulyCard>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 19, textAlign: "right" }}>إذاعات القرآن الكريم الرسمية</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right", lineHeight: 20, marginTop: 5 }}>هنا هتسمع الإذاعة ببرامجها وفقراتها المباشرة، مش قناة قارئ واحد. اختار الدولة واضغط على الإذاعة للتشغيل داخل التطبيق.</Text>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7, marginTop: 12 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold }} />
            <Text style={{ color: colors.muted, fontSize: 11 }}>بث مباشر • يحتاج اتصال بالإنترنت</Text>
          </View>
        </SulyCard>
        {stations.map((station) => {
          const selected = trackTitle === station.name;
          return <Pressable key={station.id} onPress={() => void playUrl(station.url, station.name, station.country, true)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: selected ? colors.gold : colors.border, borderRadius: 18, padding: 15, marginBottom: 10 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
              <View style={{ width: 58, height: 58, borderRadius: 15, backgroundColor: colors.gold + "18", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.gold + "55" }}>
                <Text style={{ fontSize: 31 }}>{station.flag}</Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ color: selected ? colors.gold : colors.text, fontSize: 16, fontWeight: "900", textAlign: "right" }}>{station.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, textAlign: "right" }}>{station.country}</Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3, textAlign: "right" }}>{station.city}</Text>
              </View>
              <View style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: selected && status.playing ? colors.gold : colors.gold + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: selected && status.playing ? "#111111" : colors.gold, fontWeight: "900", fontSize: 15 }}>{selected && status.playing ? "Ⅱ" : "▶"}</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 19, marginTop: 12 }}>{station.description}</Text>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 10 }}>
              <Text style={{ color: selected ? colors.gold : colors.muted, fontSize: 11, fontWeight: "700" }}>{selected && status.playing ? "يُبث الآن على المشغل" : "اضغط للاستماع مباشرة"}</Text>
              <Text style={{ color: colors.muted, fontSize: 10 }}>{station.sourceLabel}</Text>
            </View>
          </Pressable>;
        })}
        <Text style={{ color: colors.muted, fontSize: 10, textAlign: "center", lineHeight: 17 }}>قد تتوقف روابط البث مؤقتًا إذا غيّر مزود الإذاعة عنوان البث. نعرض الإذاعات الوطنية فقط في هذا القسم، وتظل إذاعات القراء المنفردة خارج هذه القائمة.</Text>
      </> : null}
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>مصادر التلاوات: MP3Quran.net • صور القراء المتاحة من Wikimedia Commons. الملفات المحفوظة تبقى داخل التطبيق حتى تحذفها.</Text>
    </AppScreen>
  );
}

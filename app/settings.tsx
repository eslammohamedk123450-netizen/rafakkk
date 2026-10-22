import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, SulyInput, TinyTag, useSulyTheme } from "@/components/suly-ui";
import { useAppStore, type PrayerId } from "@/lib/app-store";
import { CALCULATION_METHODS, PRAYER_LABELS } from "@/lib/prayer/calculations";
import { requestNotificationPermission } from "@/lib/notifications";

const CITIES = [
  { name: "القاهرة", latitude: "30.0444", longitude: "31.2357", timeZone: "Africa/Cairo" },
  { name: "مكة المكرمة", latitude: "21.4225", longitude: "39.8262", timeZone: "Asia/Riyadh" },
  { name: "المدينة المنورة", latitude: "24.4672", longitude: "39.6100", timeZone: "Asia/Riyadh" },
  { name: "الرياض", latitude: "24.7136", longitude: "46.6753", timeZone: "Asia/Riyadh" },
  { name: "عمّان", latitude: "31.9454", longitude: "35.9284", timeZone: "Asia/Amman" },
  { name: "الدوحة", latitude: "25.2854", longitude: "51.5310", timeZone: "Asia/Qatar" },
  { name: "دبي", latitude: "25.2048", longitude: "55.2708", timeZone: "Asia/Dubai" },
  { name: "الكويت", latitude: "29.3759", longitude: "47.9775", timeZone: "Asia/Kuwait" },
  { name: "إسطنبول", latitude: "41.0082", longitude: "28.9784", timeZone: "Europe/Istanbul" },
  { name: "الدار البيضاء", latitude: "33.5731", longitude: "-7.5898", timeZone: "Africa/Casablanca" },
];
const MESSAGE_CATEGORIES = [
  { id: "prayer", label: "الصلاة" },
  { id: "repentance", label: "التوبة" },
  { id: "istighfar", label: "الاستغفار" },
  { id: "quran", label: "القرآن" },
  { id: "dhikr", label: "الأذكار" },
  { id: "encouragement", label: "التشجيع" },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { store, updateStore } = useAppStore();
  const { colors } = useSulyTheme();
  const [cityName, setCityName] = useState(store.location?.name ?? "");
  const [latitude, setLatitude] = useState(store.location ? `${store.location.latitude}` : "");
  const [longitude, setLongitude] = useState(store.location ? `${store.location.longitude}` : "");
  const [timeZone, setTimeZone] = useState(store.location?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  const [timesDraft, setTimesDraft] = useState(store.notificationPrefs.messageTimes.join("، "));
  const [dailyLimitDraft, setDailyLimitDraft] = useState(`${store.notificationPrefs.dailyLimit}`);
  const [quietStartDraft, setQuietStartDraft] = useState(store.notificationPrefs.quietStart);
  const [quietEndDraft, setQuietEndDraft] = useState(store.notificationPrefs.quietEnd);
  const [notice, setNotice] = useState("");

  const saveLocation = () => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!cityName.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setNotice("أدخل اسمًا للموقع وخط عرض بين -90 و90 وخط طول بين -180 و180.");
      return;
    }
    try {
      new Intl.DateTimeFormat("ar", { timeZone }).format(new Date());
    } catch {
      setNotice("تحقق من معرّف المنطقة الزمنية، مثل Asia/Riyadh.");
      return;
    }
    updateStore({ location: { name: cityName.trim(), latitude: lat, longitude: lon, timeZone, source: "manual" } });
    setNotice("حُفظ الموقع على هذا الجهاز. ستُعاد حساب المواقيت محليًا.");
  };

  const chooseCity = (city: (typeof CITIES)[number]) => {
    setCityName(city.name);
    setLatitude(city.latitude);
    setLongitude(city.longitude);
    setTimeZone(city.timeZone);
    updateStore({ location: { name: city.name, latitude: Number(city.latitude), longitude: Number(city.longitude), timeZone: city.timeZone, source: "manual" } });
    setNotice(`تم اختيار ${city.name}. يمكنك مراجعة طريقة الحساب أدناه.`);
  };

  const useCurrentLocation = async () => {
    setNotice("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNotice("لم يُمنح إذن الموقع. يمكنك اختيار مدينة يدويًا أدناه؛ لن يتوقف استخدام التطبيق.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const name = store.location?.name || "موقعي الحالي";
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setCityName(name);
      setLatitude(`${current.coords.latitude}`);
      setLongitude(`${current.coords.longitude}`);
      setTimeZone(zone);
      updateStore({ location: { name, latitude: current.coords.latitude, longitude: current.coords.longitude, timeZone: zone, source: "device" } });
      setNotice("تم حفظ موقعك الحالي لحساب المواقيت على الجهاز. المنطقة الزمنية مأخوذة من إعدادات الهاتف.");
    } catch {
      setNotice("تعذر قراءة الموقع. تحقق من إعدادات الجهاز أو اختر مدينتك يدويًا.");
    }
  };

  const setPrayerPreference = (id: PrayerId, field: "enabled" | "atTime" | "silent" | "beforeMinutes" | "followupMinutes", value: boolean | number) => {
    updateStore((current) => ({ ...current, notificationPrefs: { ...current.notificationPrefs, prayers: { ...current.notificationPrefs.prayers, [id]: { ...current.notificationPrefs.prayers[id], [field]: value } } } }));
  };

  const toggleMasterNotifications = async () => {
    const enabling = !store.notificationPrefs.enabled;
    if (enabling && !store.location) {
      setNotice("اختر موقعًا أولًا حتى يمكن جدولة مواقيت الصلاة.");
      return;
    }
    if (enabling) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotice("أذونات الإشعارات غير مفعلة. يمكنك تفعيلها من إعدادات الهاتف.");
        return;
      }
    }
    updateStore((current) => ({ ...current, notificationPrefs: { ...current.notificationPrefs, enabled: enabling } }));
  };

  const toggleGentleMessages = async () => {
    const enabling = !store.notificationPrefs.gentleMessages;
    if (enabling) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotice("أذونات الإشعارات غير مفعلة. يمكنك تفعيلها من إعدادات الهاتف.");
        return;
      }
    }
    updateStore((current) => ({ ...current, notificationPrefs: { ...current.notificationPrefs, gentleMessages: enabling } }));
  };

  const saveMessageSettings = () => {
    const parsedLimit = Math.max(1, Math.min(8, Number.parseInt(dailyLimitDraft, 10) || 1));
    const enteredTimes = timesDraft.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
    const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const validTimes = [...new Set(enteredTimes.filter((item) => clockPattern.test(item)))].sort();
    if (validTimes.length !== enteredTimes.length) {
      setNotice("اكتب الأوقات بصيغة HH:MM بنظام 24 ساعة، مثل 09:00.");
      return;
    }
    if (validTimes.length > parsedLimit) {
      setNotice("عدد أوقات الرسائل أكبر من الحد اليومي. احذف وقتًا أو ارفع الحد.");
      return;
    }
    if (!clockPattern.test(quietStartDraft) || !clockPattern.test(quietEndDraft)) {
      setNotice("أدخل بداية الهدوء ونهايته بصيغة HH:MM صحيحة.");
      return;
    }
    updateStore((current) => ({ ...current, notificationPrefs: { ...current.notificationPrefs, dailyLimit: parsedLimit, messageTimes: validTimes, quietStart: quietStartDraft, quietEnd: quietEndDraft } }));
    setDailyLimitDraft(`${parsedLimit}`);
    setNotice("حُفظت تفضيلات الرسائل على هذا الجهاز.");
  };

  const toggleMessageCategory = (id: (typeof MESSAGE_CATEGORIES)[number]["id"]) => {
    updateStore((current) => ({ ...current, notificationPrefs: { ...current.notificationPrefs, messageCategories: { ...current.notificationPrefs.messageCategories, [id]: !current.notificationPrefs.messageCategories[id] } } }));
  };

  return (
    <AppScreen noBottomSpace>
      <ScreenHeading title="الإعدادات" subtitle="تحكم في بياناتك ومواقيتك وتنبيهاتك" action={<Pressable onPress={() => router.back()} style={{ padding: 8 }}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.gold} /></Pressable>} />
      {notice ? <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 12 }}><Text style={{ color: colors.text, textAlign: "right", lineHeight: 21 }}>{notice}</Text></View> : null}

      <SulyCard>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "right" }}>الموقع ومواقيت الصلاة</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>الحساب يتم على الجهاز دون API. اسمح بالموقع أثناء الاستخدام فقط أو اختر مدينة يدويًا إذا لم ترغب بمنح الإذن.</Text>
        <SulyButton title="استخدام موقعي الحالي" secondary onPress={useCurrentLocation} />
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: "right", marginTop: 4 }}>مدن شائعة</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{CITIES.map((city) => <TinyTag key={city.name} title={city.name} selected={store.location?.name === city.name} onPress={() => chooseCity(city)} />)}</View>
        <SulyInput label="اسم المدينة أو الموقع" value={cityName} onChangeText={setCityName} placeholder="مدينتي" />
        <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><SulyInput label="خط العرض" value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" placeholder="30.0444" /></View><View style={{ flex: 1 }}><SulyInput label="خط الطول" value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" placeholder="31.2357" /></View></View>
        <SulyInput label="المنطقة الزمنية (IANA)" value={timeZone} onChangeText={setTimeZone} placeholder="Asia/Riyadh" />
        <SulyButton title="حفظ الموقع يدويًا" onPress={saveLocation} />
        <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>تتبع المنطقة الزمنية قواعد التوقيت الصيفي الخاصة بالمدينة. إذا كنت تستخدم إحداثيات يدوية في مدينة أخرى، أدخل معرّفها الزمني هنا.</Text>
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "right" }}>طريقة الحساب</Text>
        <Text style={{ color: colors.muted, textAlign: "right" }}>قد تختلف المواقيت قليلًا بين الطرق المعتمدة؛ راجع الجهة المناسبة لمدينتك عند الحاجة.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>{CALCULATION_METHODS.map((method) => <TinyTag key={method.id} title={method.label} selected={store.calculationMethod === method.id} onPress={() => updateStore({ calculationMethod: method.id })} />)}</ScrollView>
        <Text style={{ color: colors.text, textAlign: "right", fontWeight: "600" }}>طريقة حساب العصر</Text>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}><TinyTag title="الشافعي / المالكي / الحنبلي" selected={store.asrSchool === "shafi"} onPress={() => updateStore({ asrSchool: "shafi" })} /><TinyTag title="الحنفي" selected={store.asrSchool === "hanafi"} onPress={() => updateStore({ asrSchool: "hanafi" })} /></View>
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "right" }}>المظهر</Text>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}><TinyTag title="حسب الجهاز" selected={store.theme === "system"} onPress={() => updateStore({ theme: "system" })} /><TinyTag title="فاتح" selected={store.theme === "light"} onPress={() => updateStore({ theme: "light" })} /><TinyTag title="داكن" selected={store.theme === "dark"} onPress={() => updateStore({ theme: "dark" })} /></View>
      </SulyCard>

      <SulyCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Pressable onPress={toggleMasterNotifications}><Text style={{ color: store.notificationPrefs.enabled ? colors.gold : colors.muted, fontWeight: "700" }}>{store.notificationPrefs.enabled ? "مفعّلة" : "متوقفة"}</Text></Pressable><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>تنبيهات الصلاة</Text></View>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>تُجدول التنبيهات محليًا على الهاتف. قد يؤخر Android بعضها بسبب أذونات النظام أو توفير البطارية؛ لا نضمن توقيتًا دقيقًا دائمًا.</Text>
        {!store.location ? <Text style={{ color: colors.gold, textAlign: "right" }}>اختر موقعًا لتفعيل الجدولة.</Text> : null}
        {(Object.keys(PRAYER_LABELS) as PrayerId[]).map((id) => {
          const prefs = store.notificationPrefs.prayers[id];
          return <View key={id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Pressable onPress={() => setPrayerPreference(id, "enabled", !prefs.enabled)}><Text style={{ color: prefs.enabled ? colors.gold : colors.muted, fontWeight: "700" }}>{prefs.enabled ? "مفعّل" : "متوقف"}</Text></Pressable><Text style={{ color: colors.text, fontWeight: "700" }}>{PRAYER_LABELS[id]}</Text></View>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}><TinyTag title="عند الوقت" selected={prefs.atTime} onPress={() => setPrayerPreference(id, "atTime", !prefs.atTime)} /><TinyTag title={`قبل ${prefs.beforeMinutes || 0} د`} selected={prefs.beforeMinutes > 0} onPress={() => setPrayerPreference(id, "beforeMinutes", prefs.beforeMinutes ? 0 : 10)} /><TinyTag title={`تذكير بعد ${prefs.followupMinutes || 0} د`} selected={prefs.followupMinutes > 0} onPress={() => setPrayerPreference(id, "followupMinutes", prefs.followupMinutes ? 0 : 30)} /><TinyTag title={prefs.silent ? "صامت" : "صوت"} selected={prefs.silent} onPress={() => setPrayerPreference(id, "silent", !prefs.silent)} /></View>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>التذكير اللاحق اختياري، ويُلغى عند تسجيل الصلاة مكتملة. عدم التسجيل ليس حكمًا على أدائها.</Text>
          </View>;
        })}
      </SulyCard>

      <SulyCard>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Pressable onPress={toggleGentleMessages}><Text style={{ color: store.notificationPrefs.gentleMessages ? colors.gold : colors.muted, fontWeight: "700" }}>{store.notificationPrefs.gentleMessages ? "مفعّلة" : "متوقفة"}</Text></Pressable><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>رسائل لطيفة</Text></View>
        <Text style={{ color: colors.muted, textAlign: "right" }}>رسائل عربية محلية من التطبيق، وليست أحاديث أو آيات. يمكنك اختيار تصنيفاتها والحد الأقصى وأوقات الهدوء.</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{MESSAGE_CATEGORIES.map((item) => <TinyTag key={item.id} title={item.label} selected={store.notificationPrefs.messageCategories[item.id]} onPress={() => toggleMessageCategory(item.id)} />)}</View>
        <SulyInput label="أوقات الرسائل (HH:MM، افصل بفاصلة)" value={timesDraft} onChangeText={setTimesDraft} placeholder="09:00، 14:00، 19:00" />
        <SulyInput label="الحد الأقصى يوميًا (1–8)" value={dailyLimitDraft} onChangeText={setDailyLimitDraft} keyboardType="number-pad" />
        <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><SulyInput label="بداية الهدوء" value={quietStartDraft} onChangeText={setQuietStartDraft} placeholder="22:00" /></View><View style={{ flex: 1 }}><SulyInput label="نهاية الهدوء" value={quietEndDraft} onChangeText={setQuietEndDraft} placeholder="07:00" /></View></View>
        <SulyButton title="حفظ تفضيلات الرسائل" onPress={saveMessageSettings} />
      </SulyCard>

      <SulyCard style={{ backgroundColor: colors.card }}><Text style={{ color: colors.text, fontWeight: "700", textAlign: "right" }}>الأذونات والخصوصية</Text><Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>لا نرفع سجلات الصلاة أو الورد أو الأذكار إلى خادم. الموقع يُستخدم محليًا لحساب المواقيت. يمكنك تغيير أذونات الموقع والإشعارات من إعدادات هاتفك.</Text><SulyButton title="فتح إعدادات الهاتف" secondary onPress={() => Linking.openSettings()} /></SulyCard>
      <SulyCard><Text style={{ color: colors.text, fontWeight: "700", textAlign: "right" }}>إدارة مكتبة التطبيق</Text><Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>هذه الواجهة للمشرف فقط؛ يحدد الخادم صلاحية الدخول والنشر. التحديثات المنشورة لا تغيّر سجلاتك الشخصية على الجهاز.</Text><SulyButton title="فتح لوحة الإدارة" secondary onPress={() => router.push("/admin")} /></SulyCard>
    </AppScreen>
  );
}

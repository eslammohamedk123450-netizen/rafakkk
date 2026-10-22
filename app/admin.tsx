import { useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppScreen, ScreenHeading, SulyButton, SulyCard, SulyInput, TinyTag, useSulyTheme } from "@/components/suly-ui";
import { CONTENT_CATEGORIES } from "@/lib/content/categories";
import { getApiBaseUrl, startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";

type CategoryId = (typeof CONTENT_CATEGORIES)[number]["id"];
type DraftForm = { id?: string; category: CategoryId; title: string; body: string; repetition: string; sourceName: string; sourceReference: string; sourceUrl: string; authenticity: string };
const EMPTY_FORM: DraftForm = { category: "morning", title: "", body: "", repetition: "", sourceName: "", sourceReference: "", sourceUrl: "", authenticity: "" };

export default function AdminScreen() {
  const router = useRouter();
  const { colors } = useSulyTheme();
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [publishMessage, setPublishMessage] = useState("");
  const [notice, setNotice] = useState("");
  const utils = trpc.useUtils();
  const userQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const user = userQuery.data;
  const listQuery = trpc.content.adminList.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const latestQuery = trpc.content.latestPack.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const saveDraft = trpc.content.saveDraft.useMutation({ onSuccess: async () => { setNotice("حُفظت المسودة. يلزم مراجعة المصدر قبل النشر."); setForm(EMPTY_FORM); await utils.content.adminList.invalidate(); } });
  const review = trpc.content.markReviewed.useMutation({ onSuccess: async () => { setNotice("تم تسجيل المراجعة. يمكنك النشر عند اكتمال المواد المعتمدة."); await utils.content.adminList.invalidate(); } });
  const archive = trpc.content.archive.useMutation({ onSuccess: async () => { setNotice("أُضيف طلب الإخفاء إلى مسودة الإصدار؛ سيبقى المحتوى المنشور كما هو حتى النشر."); await utils.content.adminList.invalidate(); } });
  const publish = trpc.content.publish.useMutation({ onSuccess: async (result) => { setNotice(`نُشر الإصدار ${result.version} ويضم ${result.entryCount} مادة معتمدة.`); setForm(EMPTY_FORM); await Promise.all([utils.content.adminList.invalidate(), utils.content.latestPack.invalidate()]); } });

  const beginLogin = async () => {
    setNotice("");
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(`${getApiBaseUrl()}/api/oauth/start`);
      return;
    }
    try {
      await startOAuthLogin();
    } catch {
      setNotice("تعذر بدء تسجيل الدخول. تحقق من إعدادات Manus OAuth.");
    }
  };

  const setField = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submitDraft = () => {
    if (!form.title.trim() || !form.body.trim()) { setNotice("أدخل عنوان المادة ونصها أولًا."); return; }
    if (form.category !== "encouragement" && (!form.sourceName.trim() || !form.sourceReference.trim() || !/^https?:\/\//i.test(form.sourceUrl))) {
      setNotice("أضف اسم المصدر والمرجع ورابط http(s) قبل حفظ مادة دينية للمراجعة.");
      return;
    }
    saveDraft.mutate(form);
  };

  const openSource = (value: string) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported protocol");
      void Linking.openURL(url.toString()).catch(() => setNotice("تعذر فتح رابط المصدر على هذا الجهاز."));
    } catch {
      setNotice("رابط المصدر غير صالح؛ استخدم رابط HTTP أو HTTPS.");
    }
  };

  if (userQuery.isLoading) {
    return <AppScreen noBottomSpace><ScreenHeading title="لوحة الإدارة" subtitle="التحقق من جلسة المشرف" /><SulyCard><Text style={{ color: colors.muted, textAlign: "right" }}>جارٍ التحقق من تسجيل الدخول…</Text></SulyCard></AppScreen>;
  }

  if (!user) {
    return <AppScreen noBottomSpace><ScreenHeading title="لوحة الإدارة" subtitle="دخول محمي بحساب Manus" action={<Pressable onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.gold} /></Pressable>} /><SulyCard><Text style={{ color: colors.text, textAlign: "right", lineHeight: 23 }}>سجّل الدخول بحساب Manus المرتبط بمالك المشروع. لا تمنح الواجهة نفسها صلاحية المشرف؛ يتحقق الخادم من الدور عند كل عملية إدارة.</Text><SulyButton title="تسجيل الدخول للمشرف" onPress={beginLogin} /></SulyCard>{notice ? <Text style={{ color: colors.gold, textAlign: "right" }}>{notice}</Text> : null}</AppScreen>;
  }

  if (user.role !== "admin") {
    return <AppScreen noBottomSpace><ScreenHeading title="لوحة الإدارة" subtitle="صلاحيات محدودة" action={<Pressable onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.gold} /></Pressable>} /><SulyCard><Text style={{ color: colors.text, textAlign: "right" }}>الحساب الحالي ليس لديه دور مشرف. إدارة المحتوى مقصورة على مالك المشروع المصرح به.</Text><Text style={{ color: colors.muted, textAlign: "right" }}>{user.name || user.email || "حساب Manus"}</Text></SulyCard></AppScreen>;
  }

  const entries = listQuery.data ?? [];
  const isBusy = saveDraft.isPending || review.isPending || archive.isPending || publish.isPending;
  return (
    <AppScreen noBottomSpace>
      <ScreenHeading title="إدارة المحتوى" subtitle={`المشرف: ${user.name || "مالك المشروع"}`} action={<Pressable onPress={() => router.back()} style={{ padding: 6 }}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.gold} /></Pressable>} />
      {notice ? <SulyCard style={{ backgroundColor: colors.card }}><Text style={{ color: colors.text, textAlign: "right" }}>{notice}</Text></SulyCard> : null}
      {listQuery.error ? <SulyCard><Text style={{ color: colors.gold, textAlign: "right" }}>{listQuery.error.message}</Text><SulyButton title="إعادة تحميل" secondary onPress={() => listQuery.refetch()} /></SulyCard> : null}
      <SulyCard style={{ backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "right" }}>إصدار المحتوى المنشور</Text>
        <Text style={{ color: colors.muted, textAlign: "right" }}>الحالي: {latestQuery.data?.version ?? "—"} · المواد المنشورة: {latestQuery.data?.entries.length ?? "—"}</Text>
        <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>المواد الدينية تُحفظ كمسودات حتى مراجعة المصدر. تعديل المسودة لا يغيّر ما وصل للمستخدمين، ولا يتغير المحتوى المنشور إلا بعد ضغط «نشر إصدار».</Text>
        <SulyInput label="ملاحظة الإصدار (اختياري)" value={publishMessage} onChangeText={setPublishMessage} placeholder="تحسينات على مكتبة الأذكار" />
        <SulyButton title="نشر المواد المعتمدة" disabled={isBusy} onPress={() => publish.mutate({ message: publishMessage.trim() })} />
        {publish.error ? <Text style={{ color: colors.gold, textAlign: "right" }}>{publish.error.message}</Text> : null}
      </SulyCard>

      <SulyCard>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "right" }}>{form.id ? "تعديل مسودة" : "إضافة محتوى"}</Text>
        <Text style={{ color: colors.muted, textAlign: "right" }}>المحتوى المنشور لا يتغير عند الحفظ؛ يحتاج كل تعديل إلى مراجعة ثم نشر.</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }}>{CONTENT_CATEGORIES.map((category) => <TinyTag key={category.id} title={category.label} selected={form.category === category.id} onPress={() => setField("category", category.id)} />)}</View>
        <SulyInput label="العنوان" value={form.title} onChangeText={(value) => setField("title", value)} placeholder="عنوان الذكر أو الرسالة" />
        <SulyInput label="النص" value={form.body} onChangeText={(value) => setField("body", value)} placeholder="اكتب النص كاملًا" multiline numberOfLines={5} />
        <SulyInput label="التكرار أو العدد (اختياري)" value={form.repetition} onChangeText={(value) => setField("repetition", value)} placeholder="ثلاث مرات" />
        {form.category !== "encouragement" ? <>
          <SulyInput label="اسم المصدر" value={form.sourceName} onChangeText={(value) => setField("sourceName", value)} placeholder="اسم الكتاب أو الجهة" />
          <SulyInput label="المرجع أو رقم الحديث/الآية" value={form.sourceReference} onChangeText={(value) => setField("sourceReference", value)} placeholder="رقم الحديث أو السورة والآية" />
          <SulyInput label="رابط المصدر" value={form.sourceUrl} onChangeText={(value) => setField("sourceUrl", value)} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
          <SulyInput label="درجة الصحة أو ملاحظة التوثيق" value={form.authenticity} onChangeText={(value) => setField("authenticity", value)} placeholder="مثل: صحيح — بعد المراجعة" />
        </> : <Text style={{ color: colors.muted, textAlign: "right" }}>رسالة التشجيع ليست آية أو حديثًا. لا تنسب لها مصدرًا دينيًا.</Text>}
        <View style={{ flexDirection: "row", gap: 9 }}><SulyButton title="حفظ كمسودة" onPress={submitDraft} disabled={isBusy} /><SulyButton title="مسح الحقول" secondary onPress={() => setForm(EMPTY_FORM)} /></View>
        {saveDraft.error ? <Text style={{ color: colors.gold, textAlign: "right" }}>{saveDraft.error.message}</Text> : null}
      </SulyCard>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Pressable onPress={() => listQuery.refetch()}><Text style={{ color: colors.gold }}>تحديث</Text></Pressable><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>مسودات ومراجعات ({entries.length})</Text></View>
      {entries.map((entry) => (
        <SulyCard key={entry.id} style={{ backgroundColor: entry.isArchived ? colors.card : colors.surface }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><TinyTag title={entry.isArchived ? "مطلوب إخفاؤه عند النشر" : entry.reviewStatus === "reviewed" ? "مراجع" : "بانتظار المراجعة"} selected={entry.reviewStatus === "reviewed"} /><Text style={{ flex: 1, color: colors.text, fontWeight: "700", textAlign: "right", marginRight: 8 }}>{entry.title}</Text></View>
          <Text numberOfLines={4} style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>{entry.body}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>{entry.sourceName || "رسالة تشجيع"} {entry.sourceReference ? `· ${entry.sourceReference}` : ""}</Text>
          {entry.sourceUrl ? <Pressable onPress={() => openSource(entry.sourceUrl)}><Text style={{ color: colors.accent, textAlign: "right", textDecorationLine: "underline" }}>مراجعة المصدر في المتصفح</Text></Pressable> : null}
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
            <Pressable onPress={() => setForm({ id: entry.id, category: entry.category as CategoryId, title: entry.title, body: entry.body, repetition: entry.repetition ?? "", sourceName: entry.sourceName, sourceReference: entry.sourceReference, sourceUrl: entry.sourceUrl, authenticity: entry.authenticity ?? "" })}><Text style={{ color: colors.gold, padding: 8 }}>تعديل</Text></Pressable>
            {!entry.isArchived && entry.reviewStatus !== "reviewed" ? <Pressable onPress={() => review.mutate({ id: entry.id })}><Text style={{ color: colors.accent, padding: 8 }}>اعتماد بعد المراجعة</Text></Pressable> : null}
            {!entry.isArchived ? <Pressable onPress={() => archive.mutate({ id: entry.id })}><Text style={{ color: colors.muted, padding: 8 }}>إخفاء في الإصدار التالي</Text></Pressable> : null}
          </View>
        </SulyCard>
      ))}
      {!entries.length && !listQuery.isLoading ? <SulyCard><Text style={{ color: colors.muted, textAlign: "right" }}>لا توجد مسودات بعد. أضف مادة واحفظها للمراجعة.</Text></SulyCard> : null}
    </AppScreen>
  );
}

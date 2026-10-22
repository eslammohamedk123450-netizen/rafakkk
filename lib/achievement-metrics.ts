export type MetricPrayerStatus = "completed" | "noted";
export type MetricPrayerLogs = Record<string, Partial<Record<string, MetricPrayerStatus>>>;

export function calculateAchievementSummary(input: {
  days: string[];
  prayerLogs: MetricPrayerLogs;
  quranHistory: Record<string, number>;
  tasbeehCounts: Record<string, number>;
  dhikrCounts: Record<string, Record<string, number>>;
  quranTarget: number;
  dhikrGoal: number | null;
  tasbeehGoal: number | null;
}) {
  let prayerComplete = 0;
  let prayerRecorded = 0;
  let quranComplete = 0;
  let quranDaysRecorded = 0;
  let tasbeeh = 0;
  let tasbeehDaysRecorded = 0;
  let dhikr = 0;
  let dhikrDaysRecorded = 0;

  for (const key of input.days) {
    const prayerEntries = Object.values(input.prayerLogs[key] ?? {}).filter(
      (status): status is MetricPrayerStatus => status === "completed" || status === "noted",
    );
    prayerRecorded += prayerEntries.length;
    prayerComplete += prayerEntries.filter((status) => status === "completed").length;

    const quranAmount = input.quranHistory[key] ?? 0;
    quranComplete += quranAmount;
    if (quranAmount > 0) quranDaysRecorded += 1;

    const tasbeehAmount = input.tasbeehCounts[key] ?? 0;
    tasbeeh += tasbeehAmount;
    if (tasbeehAmount > 0) tasbeehDaysRecorded += 1;

    const dayDhikrCounts = Object.values(input.dhikrCounts[key] ?? {});
    const dayDhikr = dayDhikrCounts.reduce((sum, count) => sum + count, 0);
    dhikr += dayDhikr;
    if (dayDhikr > 0) dhikrDaysRecorded += 1;
  }

  const capPercent = (value: number) => Math.min(100, Math.max(0, value));
  const prayerRate = prayerRecorded > 0 ? capPercent(Math.round((prayerComplete / prayerRecorded) * 100)) : null;
  const quranRate = quranDaysRecorded > 0 && input.quranTarget > 0
    ? capPercent(Math.round((quranComplete / (quranDaysRecorded * input.quranTarget)) * 100))
    : null;
  const dhikrRate = input.dhikrGoal && dhikrDaysRecorded > 0
    ? capPercent(Math.round((dhikr / (dhikrDaysRecorded * input.dhikrGoal)) * 100))
    : null;
  const tasbeehRate = input.tasbeehGoal && tasbeehDaysRecorded > 0
    ? capPercent(Math.round((tasbeeh / (tasbeehDaysRecorded * input.tasbeehGoal)) * 100))
    : null;

  const availableRates = [prayerRate, quranRate, dhikrRate, tasbeehRate].filter(
    (value): value is number => value !== null,
  );
  const score = availableRates.length
    ? Math.min(10, Math.round(availableRates.reduce((sum, value) => sum + value, 0) / availableRates.length / 10))
    : null;

  return {
    prayerComplete,
    prayerRecorded,
    prayerRate,
    quranComplete,
    quranRate,
    quranDaysRecorded,
    tasbeeh,
    tasbeehRate,
    tasbeehDaysRecorded,
    dhikr,
    dhikrRate,
    dhikrDaysRecorded,
    score,
  };
}

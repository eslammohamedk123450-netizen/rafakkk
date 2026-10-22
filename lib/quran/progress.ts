export type QuranPlanMode = "pages" | "juz" | "minutes" | "surah";

export function calculateQuranDayProgress(input: {
  mode: QuranPlanMode;
  savedProgress: number | undefined;
  savedMode: QuranPlanMode | undefined;
  pagesReadToday?: number;
}) {
  const compatibleSavedProgress = input.savedMode === input.mode
    ? Math.max(0, input.savedProgress ?? 0)
    : 0;
  if (input.mode !== "pages") return compatibleSavedProgress;
  return Math.max(compatibleSavedProgress, Math.max(0, input.pagesReadToday ?? 0));
}

export function getQuranProgressHistory(
  mode: QuranPlanMode,
  history: Record<string, number>,
  historyModes: Record<string, QuranPlanMode>,
  pagesReadByDate: Record<string, number[]>,
): Record<string, number> {
  const dates = new Set([...Object.keys(history), ...Object.keys(pagesReadByDate)]);
  const result: Record<string, number> = {};
  for (const date of dates) {
    const progress = calculateQuranDayProgress({
      mode,
      savedProgress: history[date],
      savedMode: historyModes[date],
      pagesReadToday: new Set(pagesReadByDate[date] ?? []).size,
    });
    if (progress > 0) result[date] = progress;
  }
  return result;
}

import { useLocalSearchParams, useRouter } from "expo-router";
import { StoryReaderContent } from "./story/[id]";

// A dedicated static web route avoids the dynamic /story/[id] export fallback.
export default function ReadStoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <StoryReaderContent
      storyId={String(id ?? "")}
      onBack={() => router.back()}
      onOpenQuran={(surahId, ayah) => router.push(`/quran-reader?surah=${surahId}&ayah=${ayah}` as any)}
    />
  );
}

import { useLocalSearchParams, useRouter } from "expo-router";
import { StoryReaderContent } from "@/components/stories/StoryReaderContent";

export default function StoryReaderRoute() {
  const routeParams = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const storyId = String(routeParams.id ?? "");
  return (
    <StoryReaderContent
      storyId={storyId}
      onBack={() => router.back()}
      onOpenQuran={(surahId, ayah) => router.push(`/quran-reader?surah=${surahId}&ayah=${ayah}` as any)}
    />
  );
}

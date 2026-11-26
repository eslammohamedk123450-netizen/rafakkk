import { useLocalSearchParams } from "expo-router";
import StoryReaderScreen from "./story/[id]";

// A dedicated static web route avoids the dynamic /story/[id] export fallback.
export default function ReadStoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StoryReaderScreen storyId={String(id ?? "")} />;
}

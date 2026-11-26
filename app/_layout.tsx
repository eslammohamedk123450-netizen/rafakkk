import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { AppStoreProvider } from "@/lib/app-store";
import { NotificationReconciler } from "@/lib/notifications/reconciler";
import { AutomaticLocationSetup } from "@/lib/location/auto-location";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    if (Platform.OS !== "web") return;
    initManusRuntime();
  }, []);

  // Explain Android battery restrictions once. Scheduled notification alarms do not
  // require a persistent JS service; the user can optionally allow unrestricted battery use.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let active = true;
    AsyncStorage.getItem("suly.battery-guidance.v2")
      .then(async (shown) => {
        if (!active || shown) return;
        await AsyncStorage.setItem("suly.battery-guidance.v1", "shown");
        if (!active) return;
        Alert.alert(
          "إعداد الإشعارات والأذان",
          "للحفاظ على البطارية، اترك تحسين البطارية على الإعداد الافتراضي في البداية، واسمح بإشعارات التطبيق وبإذن «المنبهات والتذكيرات» إذا ظهر. إذا لاحظت تأخر الأذان رغم السماح بالأذونات، يمكنك تجربة خيار «غير مقيّد» كحل اختياري؛ قد يزيد استهلاك البطارية قليلًا. التطبيق لا يشغّل خدمة دائمة ولا يظل مستيقظًا؛ أندرويد هو الذي ينفذ التنبيهات المجدولة.",
          [
            { text: "ليس الآن", style: "cancel" },
            { text: "فتح إعدادات التطبيق", onPress: () => { void Linking.openSettings(); } },
          ],
        );
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => Platform.OS === "web" ? createTRPCClient() : null);

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const appContent = (
    <>
      <AppStoreProvider>
        <AutomaticLocationSetup />
        <NotificationReconciler />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="quran-reader" />
          <Stack.Screen name="qibla" />
          <Stack.Screen name="story/[id]" />
          <Stack.Screen name="audio" />
          <Stack.Screen name="admin" />
        </Stack>
      </AppStoreProvider>
      <StatusBar style="auto" />
    </>
  );

  // Android runs locally; API clients are created only for the optional web admin preview.
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {Platform.OS === "web" ? (
        <trpc.Provider client={trpcClient!} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>{appContent}</QueryClientProvider>
        </trpc.Provider>
      ) : appContent}
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

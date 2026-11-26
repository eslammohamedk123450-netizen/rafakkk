import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { useAppStore } from "@/lib/app-store";

/** Quietly refresh a previously granted device location, or ask once on first setup. */
export function AutomaticLocationSetup() {
  const { store, hydrated, updateStore } = useAppStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (!hydrated || Platform.OS === "web" || attempted.current) return;
    // Preserve manually selected locations; automatic GPS must not override them.
    if (store.location?.source === "manual") {
      attempted.current = true;
      return;
    }

    attempted.current = true;
    let cancelled = false;

    const detectLocation = async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && !store.location) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (!permission.granted) return;

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        let name = store.location?.name || "موقعي الحالي";
        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
          const place = places[0];
          if (place) {
            name = place.city || place.district || place.region || place.country || name;
          }
        } catch {
          // Reverse geocoding is optional; prayer calculations only need coordinates.
        }

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        updateStore({
          location: {
            name,
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            timeZone,
            source: "device",
          },
        });
      } catch (error) {
        console.warn("Automatic prayer location detection failed", error);
      }
    };

    void detectLocation();
    return () => {
      cancelled = true;
    };
  }, [hydrated, store.location, updateStore]);

  return null;
}

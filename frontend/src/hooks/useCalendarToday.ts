import { useCallback, useEffect, useState } from "react";
import { getTodayCalendarTitle } from "../api/calendar";

interface UseCalendarTodayState {
  title: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseCalendarTodayResult extends UseCalendarTodayState {
  refetch: () => void;
}

interface UseCalendarTodayOptions {
  enabled?: boolean;
}

export const useCalendarToday = ({ enabled = true }: UseCalendarTodayOptions = {}): UseCalendarTodayResult => {
  const [state, setState] = useState<UseCalendarTodayState>({ title: null, isLoading: false, error: null });
  const [developerDate, setDeveloperDate] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    if (!enabled) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await getTodayCalendarTitle();
      const normalized = response.trim();
      setState({ title: normalized.length > 0 ? normalized : null, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się pobrać dzisiejszego wydarzenia.";
      setState({ title: null, isLoading: false, error: message });
    }
  }, [enabled]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "developerDate") {
        setDeveloperDate(event.newValue);
      }
    };

    const handleCustomChange = (event: CustomEvent<string>) => {
      setDeveloperDate(event.detail);
    };

    const currentDate = localStorage.getItem("developerDate");
    setDeveloperDate(currentDate);

    globalThis.addEventListener("storage", handleStorageChange);
    globalThis.addEventListener("developerDateChanged", handleCustomChange as EventListener);

    return () => {
      globalThis.removeEventListener("storage", handleStorageChange);
      globalThis.removeEventListener("developerDateChanged", handleCustomChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ title: null, isLoading: false, error: null });
      return;
    }
    void fetchToday();
  }, [fetchToday, developerDate, enabled]);

  const refetch = useCallback(() => {
    if (!enabled) {
      return;
    }
    void fetchToday();
  }, [fetchToday, enabled]);

  return { ...state, refetch };
};

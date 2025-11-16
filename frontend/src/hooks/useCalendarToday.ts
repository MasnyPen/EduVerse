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

export const useCalendarToday = (): UseCalendarTodayResult => {
  const [state, setState] = useState<UseCalendarTodayState>({ title: null, isLoading: false, error: null });

  const fetchToday = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await getTodayCalendarTitle();
      const normalized = response.trim();
      setState({ title: normalized.length > 0 ? normalized : null, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się pobrać dzisiejszego wydarzenia.";
      setState({ title: null, isLoading: false, error: message });
    }
  }, []);

  useEffect(() => {
    void fetchToday();
  }, [fetchToday]);

  const refetch = useCallback(() => {
    void fetchToday();
  }, [fetchToday]);

  return { ...state, refetch };
};

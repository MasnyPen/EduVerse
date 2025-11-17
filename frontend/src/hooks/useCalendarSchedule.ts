import { useCallback, useEffect, useMemo, useState } from "react";
import { getCalendarByYear } from "../api/calendar";
import type { CalendarDaySchedule } from "../types";
import { buildCalendarDaySchedules, filterUpcomingSchedules, getAcademicYear } from "../utils/calendar";

interface UseCalendarScheduleOptions {
  locale?: string;
}

interface UseCalendarScheduleResult {
  days: CalendarDaySchedule[];
  upcomingDays: CalendarDaySchedule[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCalendarSchedule = (options: UseCalendarScheduleOptions = {}): UseCalendarScheduleResult => {
  const { locale = "pl-PL" } = options;
  const [days, setDays] = useState<CalendarDaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [developerDate, setDeveloperDate] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const customDate = developerDate ? new Date(developerDate) : new Date();
      const year = getAcademicYear(customDate);
      const response = await getCalendarByYear(year);
      const customNow = developerDate ? new Date(developerDate) : undefined;
      const schedules = buildCalendarDaySchedules(response, { locale, customNow });
      setDays(schedules);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się wczytać kalendarza.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [locale, developerDate]);

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
    void fetchCalendar();
  }, [fetchCalendar, developerDate]);

  const upcomingDays = useMemo(() => {
    const customNow = developerDate ? new Date(developerDate) : new Date();
    return filterUpcomingSchedules(days, customNow);
  }, [days, developerDate]);

  const refetch = useCallback(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  return {
    days,
    upcomingDays,
    isLoading,
    error,
    refetch,
  };
};

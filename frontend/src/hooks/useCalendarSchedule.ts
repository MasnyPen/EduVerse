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
  upcomingDay: CalendarDaySchedule | null;
  activeYear: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCalendarSchedule = (options: UseCalendarScheduleOptions = {}): UseCalendarScheduleResult => {
  const { locale = "pl-PL" } = options;
  const [days, setDays] = useState<CalendarDaySchedule[]>([]);
  const [activeYear, setActiveYear] = useState<number>(() => getAcademicYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [developerDate, setDeveloperDate] = useState<string | null>(null);

  const effectiveNow = useMemo(() => {
    if (!developerDate) {
      return new Date();
    }
    const parsed = new Date(developerDate);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }, [developerDate]);

  const fetchCalendar = useCallback(
    async (yearToLoad?: number) => {
      setIsLoading(true);
      setError(null);
      const targetYear = typeof yearToLoad === "number" ? yearToLoad : getAcademicYear(effectiveNow);
      setActiveYear(targetYear);
      try {
        const response = await getCalendarByYear(targetYear);
        const schedules = buildCalendarDaySchedules(response, { locale, customNow: effectiveNow });
        setDays(schedules);
        const resolvedYear = typeof response.year === "number" ? response.year : targetYear;
        setActiveYear(resolvedYear);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się wczytać kalendarza.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveNow, locale]
  );

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
  }, [fetchCalendar, effectiveNow]);

  const upcomingDays = useMemo(() => filterUpcomingSchedules(days, effectiveNow), [days, effectiveNow]);
  const upcomingDay = useMemo(() => (upcomingDays.length > 0 ? upcomingDays[0] : null), [upcomingDays]);

  const refetch = useCallback(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  return {
    days,
    upcomingDays,
    upcomingDay,
    activeYear,
    isLoading,
    error,
    refetch,
  };
};

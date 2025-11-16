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

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const year = getAcademicYear();
      const response = await getCalendarByYear(year);
      const schedules = buildCalendarDaySchedules(response, { locale });
      setDays(schedules);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się wczytać kalendarza.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  const upcomingDays = useMemo(() => filterUpcomingSchedules(days), [days]);

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

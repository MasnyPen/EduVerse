import type { Calendar, CalendarDaySchedule, CalendarDate, CalendarTimeSlot } from "../types";

const DEFAULT_LOCALE = "pl-PL";

const normalizeIsoDate = (input: string): string | null => {
  if (!input) {
    return null;
  }
  const [yearRaw, monthRaw, dayRaw] = input.split("-").map((token) => token.trim());
  if (!yearRaw || !monthRaw || !dayRaw) {
    return null;
  }
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const monthPart = String(month).padStart(2, "0");
  const dayPart = String(day).padStart(2, "0");
  return `${year}-${monthPart}-${dayPart}`;
};

const normalizeTime = (token: string | undefined | null): string | undefined => {
  if (!token) {
    return undefined;
  }
  const sanitized = token.replace(/\./g, ":").trim();
  const [hourRaw, minuteRaw] = sanitized.split(":");
  const hour = Number.parseInt(hourRaw ?? "", 10);
  const minute = Number.parseInt(minuteRaw ?? "", 10);
  if (!Number.isFinite(hour)) {
    return undefined;
  }
  const boundedHour = Math.min(Math.max(hour, 0), 23);
  const boundedMinute = Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0;
  return `${String(boundedHour).padStart(2, "0")}:${String(boundedMinute).padStart(2, "0")}`;
};

const buildSlotId = (isoDate: string, index: number, raw: string): string => {
  const alphanumeric = raw.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  const suffix = alphanumeric.length > 0 ? alphanumeric.slice(0, 8) : "slot";
  return `${isoDate}-${index}-${suffix}`;
};

const parseSlotForDate = (raw: string, isoDate: string, index: number): CalendarTimeSlot => {
  const trimmed = raw.trim();
  const timeTokens = trimmed.match(/\b\d{1,2}[:.]\d{2}\b/g) ?? [];
  const [startToken, endToken] = timeTokens;
  const start = normalizeTime(startToken);
  const end = normalizeTime(endToken);
  let label = trimmed;
  timeTokens.slice(0, 2).forEach((token) => {
    label = label.replace(token, "");
  });
  label = label
    .replace(/[\u2013\u2014-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (label.length === 0) {
    label = trimmed;
  }

  const startIso = start ? `${isoDate}T${start}:00` : undefined;
  const endIso = end ? `${isoDate}T${end}:00` : undefined;

  let durationMinutes: number | null = null;
  if (startIso && endIso) {
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);
    const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    if (Number.isFinite(diffMinutes) && diffMinutes > 0) {
      durationMinutes = diffMinutes;
    }
  }

  return {
    id: buildSlotId(isoDate, index, trimmed),
    raw: trimmed,
    label,
    start,
    end,
    startIso,
    endIso,
    durationMinutes,
  };
};

const ensureSlots = (entry: CalendarDate, isoDate: string): CalendarTimeSlot[] => {
  if (Array.isArray(entry.perms) && entry.perms.length > 0) {
    return entry.perms.map((perm, index) => parseSlotForDate(String(perm ?? ""), isoDate, index));
  }
  return [
    {
      id: buildSlotId(isoDate, 0, entry.title),
      raw: entry.title,
      label: entry.title,
    },
  ];
};

const startOfDayTimestamp = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const getAcademicYear = (inputDate: Date = new Date()): number => {
  const month = inputDate.getMonth();
  const year = inputDate.getFullYear();
  return month <= 8 ? year - 1 : year;
};

export const buildCalendarDaySchedules = (
  calendar: Calendar,
  options: { locale?: string; customNow?: Date } = {}
): CalendarDaySchedule[] => {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const now = options.customNow ?? new Date();
  const todayStart = startOfDayTimestamp(now);
  const todayIso = normalizeIsoDate(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
  });

  const schedules: CalendarDaySchedule[] = [];
  const sourceDates = Array.isArray(calendar.dates) ? calendar.dates : [];

  sourceDates.forEach((entry) => {
    const uniqueDates = Array.from(new Set(entry.dates ?? [])).map((dateValue) => normalizeIsoDate(String(dateValue)));
    uniqueDates
      .filter((isoDate): isoDate is string => Boolean(isoDate))
      .forEach((isoDate) => {
        const dateObj = new Date(`${isoDate}T00:00:00`);
        const timestamp = startOfDayTimestamp(dateObj);
        schedules.push({
          isoDate,
          title: entry.title,
          displayDate: formatter.format(dateObj),
          timestamp,
          isToday: isoDate === todayIso,
          isPast: timestamp < todayStart,
          slots: ensureSlots(entry, isoDate),
        });
      });
  });

  schedules.sort((a, b) => a.timestamp - b.timestamp);
  return schedules;
};

export const filterUpcomingSchedules = (days: CalendarDaySchedule[], now: Date = new Date()): CalendarDaySchedule[] => {
  const todayStart = startOfDayTimestamp(now);
  return days.filter((day) => day.timestamp >= todayStart || day.isToday);
};

export const formatDuration = (minutes: number | null | undefined): string | null => {
  if (!minutes || minutes <= 0) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours > 0 && remaining > 0) {
    return `${hours}h ${remaining}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remaining}m`;
};

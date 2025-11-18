import type { Calendar, CalendarDaySchedule, CalendarDate, CalendarTimeSlot, Coordinates } from "../types";

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

const VOIVODESHIP_FULL_NAMES: readonly string[] = [
  "dolnośląskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "łódzkie",
  "małopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "śląskie",
  "świętokrzyskie",
  "warmińsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
];

const VOIVODESHIP_ALIAS_MAP: Record<string, string> = {
  all: "__ALL__",
  wszystkie: "__ALL__",
  calapolska: "__ALL__",
  calakraj: "__ALL__",
  ds: "dolnośląskie",
  dolnoslaskie: "dolnośląskie",
  dol: "dolnośląskie",
  kp: "kujawsko-pomorskie",
  kujawskopomorskie: "kujawsko-pomorskie",
  kuj: "kujawsko-pomorskie",
  lu: "lubelskie",
  lubelskie: "lubelskie",
  lb: "lubuskie",
  lubuskie: "lubuskie",
  ld: "łódzkie",
  lodzkie: "łódzkie",
  lod: "łódzkie",
  ma: "małopolskie",
  malopolskie: "małopolskie",
  mal: "małopolskie",
  mz: "mazowieckie",
  mazowieckie: "mazowieckie",
  maz: "mazowieckie",
  op: "opolskie",
  opolskie: "opolskie",
  opol: "opolskie",
  pk: "podkarpackie",
  podkarpackie: "podkarpackie",
  pdk: "podkarpackie",
  pd: "podlaskie",
  podlaskie: "podlaskie",
  pom: "pomorskie",
  pm: "pomorskie",
  pomorskie: "pomorskie",
  sl: "śląskie",
  slaskie: "śląskie",
  sk: "świętokrzyskie",
  sw: "świętokrzyskie",
  swietokrzyskie: "świętokrzyskie",
  wm: "warmińsko-mazurskie",
  wn: "warmińsko-mazurskie",
  warminskomazurskie: "warmińsko-mazurskie",
  warm: "warmińsko-mazurskie",
  wp: "wielkopolskie",
  wielkopolskie: "wielkopolskie",
  wielk: "wielkopolskie",
  zp: "zachodniopomorskie",
  zachodniopomorskie: "zachodniopomorskie",
  zach: "zachodniopomorskie",
};

const CONNECTOR_SLUGS = new Set(["", "i", "oraz"]);

interface VoivodeshipBounds {
  name: string;
  latRange: [number, number];
  lonRange: [number, number];
}

const VOIVODESHIP_BOUNDS: readonly VoivodeshipBounds[] = [
  { name: "dolnośląskie", latRange: [50.1, 51.8], lonRange: [14.9, 17.9] },
  { name: "kujawsko-pomorskie", latRange: [52.4, 53.9], lonRange: [17.2, 19.9] },
  { name: "lubelskie", latRange: [50.1, 51.9], lonRange: [22.0, 24.3] },
  { name: "lubuskie", latRange: [51.3, 52.9], lonRange: [14.8, 16.3] },
  { name: "łódzkie", latRange: [51.0, 52.3], lonRange: [18.0, 20.5] },
  { name: "małopolskie", latRange: [49.0, 50.6], lonRange: [19.0, 21.6] },
  { name: "mazowieckie", latRange: [51.8, 53.6], lonRange: [19.0, 22.7] },
  { name: "opolskie", latRange: [50.2, 51.4], lonRange: [17.2, 18.9] },
  { name: "podkarpackie", latRange: [49.0, 50.6], lonRange: [21.0, 23.6] },
  { name: "podlaskie", latRange: [52.5, 54.5], lonRange: [21.0, 23.5] },
  { name: "pomorskie", latRange: [53.3, 54.9], lonRange: [16.8, 19.9] },
  { name: "śląskie", latRange: [49.5, 51.1], lonRange: [18.0, 19.9] },
  { name: "świętokrzyskie", latRange: [50.3, 51.3], lonRange: [19.8, 21.6] },
  { name: "warmińsko-mazurskie", latRange: [53.3, 54.4], lonRange: [19.0, 22.9] },
  { name: "wielkopolskie", latRange: [51.6, 53.6], lonRange: [16.5, 19.2] },
  { name: "zachodniopomorskie", latRange: [53.0, 54.5], lonRange: [14.1, 16.9] },
];

const stripDiacritics = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeVoivodeshipToken = (token: string): string =>
  stripDiacritics(token)
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const resolveVoivodeshipNames = (token: string): string[] | null => {
  const slug = normalizeVoivodeshipToken(token);
  if (!slug || CONNECTOR_SLUGS.has(slug)) {
    return null;
  }
  const mapping = VOIVODESHIP_ALIAS_MAP[slug];
  if (!mapping) {
    return null;
  }
  if (mapping === "__ALL__") {
    return [...VOIVODESHIP_FULL_NAMES];
  }
  return [mapping];
};

interface VoivodeshipFormattingResult {
  label: string;
  voivodeships: string[] | null;
  hasAllVoivodeships: boolean;
}

const capitalizeVoivodeshipName = (name: string): string => {
  if (!name) {
    return name;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const formatVoivodeshipsLabel = (input: string): VoivodeshipFormattingResult => {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { label: trimmed, voivodeships: null, hasAllVoivodeships: false };
  }

  const prefixMatch = trimmed.match(/^dla\s+wojew(?:o|ó)dztw[:\s-]*/i);
  const afterPrefix = prefixMatch ? trimmed.slice(prefixMatch[0].length).trim() : trimmed;
  if (afterPrefix.length === 0) {
    return { label: trimmed, voivodeships: null, hasAllVoivodeships: false };
  }

  const normalized = afterPrefix.replace(/\b(i|oraz)\b/gi, ",");
  const segments = normalized
    .split(/[,;/]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return { label: trimmed, voivodeships: null, hasAllVoivodeships: false };
  }

  const resolved = new Set<string>();
  let recognizedTokens = 0;
  let unrecognizedTokens = 0;

  segments.forEach((segment) => {
    const words = segment.split(/\s+/).filter((word) => word.length > 0);
    if (words.length > 1 && !words.every((word) => normalizeVoivodeshipToken(word).length <= 3)) {
      const names = resolveVoivodeshipNames(segment);
      if (names) {
        names.forEach((name) => resolved.add(name));
        recognizedTokens += 1;
      } else {
        unrecognizedTokens += 1;
      }
      return;
    }

    words.forEach((word) => {
      const slug = normalizeVoivodeshipToken(word);
      if (CONNECTOR_SLUGS.has(slug)) {
        return;
      }
      const names = resolveVoivodeshipNames(word);
      if (names) {
        names.forEach((name) => resolved.add(name));
        recognizedTokens += 1;
      } else {
        unrecognizedTokens += 1;
      }
    });
  });

  if (recognizedTokens === 0 || unrecognizedTokens > 0) {
    return { label: trimmed, voivodeships: null, hasAllVoivodeships: false };
  }

  const orderedNames: string[] = [];
  VOIVODESHIP_FULL_NAMES.forEach((name) => {
    if (resolved.has(name)) {
      orderedNames.push(name);
    }
  });
  resolved.forEach((name) => {
    if (!orderedNames.includes(name)) {
      orderedNames.push(name);
    }
  });

  if (orderedNames.length === VOIVODESHIP_FULL_NAMES.length) {
    return {
      label: "Dla województw: Wszystkie",
      voivodeships: [...VOIVODESHIP_FULL_NAMES],
      hasAllVoivodeships: true,
    };
  }

  return {
    label: `Dla województw: ${orderedNames.map(capitalizeVoivodeshipName).join(", ")}`,
    voivodeships: orderedNames,
    hasAllVoivodeships: false,
  };
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

  const voivodeshipFormatting = formatVoivodeshipsLabel(label);
  label = voivodeshipFormatting.label;

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
    voivodeships: voivodeshipFormatting.voivodeships,
    hasAllVoivodeships: voivodeshipFormatting.hasAllVoivodeships,
  };
};

const ensureSlots = (entry: CalendarDate, isoDate: string): CalendarTimeSlot[] => {
  if (Array.isArray(entry.perms) && entry.perms.length > 0) {
    return entry.perms.map((perm, index) => parseSlotForDate(String(perm ?? ""), isoDate, index));
  }
  const titleFormatting = formatVoivodeshipsLabel(entry.title);
  return [
    {
      id: buildSlotId(isoDate, 0, entry.title),
      raw: entry.title,
      label: titleFormatting.label,
      voivodeships: titleFormatting.voivodeships,
      hasAllVoivodeships: titleFormatting.hasAllVoivodeships,
    },
  ];
};

const startOfDayTimestamp = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const formatAcademicYearLabel = (year: number): string => `${year}/${year + 1}`;

export const getAcademicYear = (inputDate: Date = new Date()): number => {
  const month = inputDate.getMonth();
  const year = inputDate.getFullYear();
  return month <= 8 ? year - 1 : year;
};

export const getAcademicYearFromIsoDate = (isoDate: string): number => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return getAcademicYear();
  }
  return getAcademicYear(parsed);
};

export const buildCalendarDaySchedules = (
  calendar: Calendar,
  options: { locale?: string; customNow?: Date } = {}
): CalendarDaySchedule[] => {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const referenceNow = options.customNow && !Number.isNaN(options.customNow.getTime()) ? options.customNow : new Date();
  const todayStart = startOfDayTimestamp(referenceNow);
  const todayIso = normalizeIsoDate(
    `${referenceNow.getFullYear()}-${referenceNow.getMonth() + 1}-${referenceNow.getDate()}`
  );
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
  const referenceNow = !Number.isNaN(now.getTime()) ? now : new Date();
  const todayStart = startOfDayTimestamp(referenceNow);
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

export const getVoivodeshipFromCoordinates = (coords: Coordinates | null | undefined): string | null => {
  if (!coords) {
    return null;
  }
  const { latitude, longitude } = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  for (const bounds of VOIVODESHIP_BOUNDS) {
    const [latMin, latMax] = bounds.latRange;
    const [lonMin, lonMax] = bounds.lonRange;
    if (latitude >= latMin && latitude <= latMax && longitude >= lonMin && longitude <= lonMax) {
      return bounds.name;
    }
  }
  return null;
};

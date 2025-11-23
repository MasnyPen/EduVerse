import { type MouseEventHandler } from "react";
import { CalendarDays, ChevronRight, Globe2, Loader2, MapPin, RefreshCcw } from "lucide-react";
import type { CalendarDaySchedule } from "../types";
import { formatAcademicYearLabel, getAcademicYearFromIsoDate } from "../utils/calendar";

interface CalendarWidgetProps {
  upcomingDay: CalendarDaySchedule | null;
  activeYear: number;
  todayTitle: string | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  userVoivodeship?: string | null;
}

const CalendarWidget = ({
  upcomingDay,
  activeYear,
  todayTitle,
  isLoading,
  error,
  onRetry,
  onOpen,
  className,
  userVoivodeship = null,
}: CalendarWidgetProps) => {
  const fallbackDate = new Date();
  const eventDate = upcomingDay ? new Date(`${upcomingDay.isoDate}T00:00:00`) : fallbackDate;
  const dayName = new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(eventDate).replace(/\.$/, "");
  const dayNumber = new Intl.DateTimeFormat("pl-PL", { day: "2-digit" }).format(eventDate);
  const formattedDate = upcomingDay
    ? `${upcomingDay.displayDate.charAt(0).toUpperCase()}${upcomingDay.displayDate.slice(1)}`
    : `Brak zaplanowanych wydarzeń w roku szkolnym ${formatAcademicYearLabel(activeYear)}.`;
  const academicYearLabel = upcomingDay
    ? formatAcademicYearLabel(getAcademicYearFromIsoDate(upcomingDay.isoDate))
    : formatAcademicYearLabel(activeYear);
  const mainTitle = upcomingDay ? upcomingDay.title : "Brak nadchodzących wydarzeń";
  const relevantSlot = upcomingDay?.slots.find((slot) => slot.hasAllVoivodeships || slot.voivodeships?.length);
  const coversAllVoivodeships = Boolean(relevantSlot?.hasAllVoivodeships);
  const coversUserVoivodeship = Boolean(
    userVoivodeship &&
      (relevantSlot?.hasAllVoivodeships ||
        relevantSlot?.voivodeships?.some((name) => name.toLowerCase() === userVoivodeship.toLowerCase()))
  );

  const baseClass =
    "group relative flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";

  return (
    <button type="button" onClick={onOpen} className={className ? `${baseClass} ${className}` : baseClass}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-linear-to-r from-sky-200 to-sky-100 px-3 py-2 text-gray-900">
          <span className="text-xs font-semibold uppercase tracking-wide">{dayName}</span>
          <span className="text-2xl font-bold leading-none">{dayNumber}</span>
        </div>
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-800">
            <CalendarDays className="size-3" />
            <span>Nadchodzące wydarzenie</span>
          </div>
          {isLoading ? (
            <div className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              <span>Wczytywanie...</span>
            </div>
          ) : error ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-rose-500">
              <span>{error}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                onClick={(event) => {
                  event.stopPropagation();
                  onRetry();
                }}
              >
                <RefreshCcw className="size-3" />
                Spróbuj ponownie
              </button>
            </div>
          ) : (
            <div className="mt-1 flex flex-col gap-1">
              <p className="text-sm font-semibold text-slate-800">{mainTitle}</p>
              <p className="text-xs text-slate-500">{formattedDate}</p>
              {academicYearLabel ? (
                <p className="text-[11px] font-semibold tracking-wide text-slate-800">
                  Rok szkolny {academicYearLabel}
                </p>
              ) : null}
              {coversAllVoivodeships ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-sky-200 to-sky-100 px-1 py-0.5 text-[10px] font-semibold tracking-wide text-gray-900">
                  <Globe2 className="size-2.5" />
                  <span>Wszystkie województwa</span>
                </span>
              ) : coversUserVoivodeship ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-sky-200 to-sky-100 px-1 py-0.5 text-[10px] font-semibold tracking-wide text-gray-900">
                  <MapPin className="size-2.5" />
                  <span>Dotyczy Twojego województwa</span>
                </span>
              ) : null}
              {todayTitle && !upcomingDay?.isToday ? (
                <p className="text-[11px] text-slate-800">Dzisiejsze wydarzenie: {todayTitle}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <ChevronRight className="size-4 text-slate-800 transition group-hover:text-sky-500" />
    </button>
  );
};

export default CalendarWidget;

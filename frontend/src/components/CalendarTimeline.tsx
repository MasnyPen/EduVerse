import { Clock3, Loader2, RefreshCcw, TriangleAlert } from "lucide-react";
import type { CalendarDaySchedule, CalendarTimeSlot } from "../types";
import { formatDuration } from "../utils/calendar";

interface CalendarTimelineProps {
  days: CalendarDaySchedule[];
  isLoading?: boolean;
  error?: string | null;
  maxItems?: number;
  variant?: "default" | "compact";
  onRefresh?: () => void;
}

const renderSlotTime = (slot: CalendarTimeSlot): string => {
  if (slot.start && slot.end) {
    return `${slot.start} - ${slot.end}`;
  }
  if (slot.start) {
    return slot.start;
  }
  if (slot.end) {
    return slot.end;
  }
  return "Bez godzin";
};

const CalendarTimeline = ({
  days,
  isLoading = false,
  error = null,
  maxItems = 5,
  variant = "default",
  onRefresh,
}: CalendarTimelineProps) => {
  const items = days.slice(0, Math.max(maxItems, 1));
  const listSpacing = variant === "compact" ? "space-y-2" : "space-y-3";
  const slotsMargin = variant === "compact" ? "mt-2" : "mt-3";

  const getItemClass = (isPast: boolean): string => {
    const base =
      variant === "compact"
        ? "rounded-xl bg-slate-100 px-3 py-2 transition"
        : "rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition";
    return `${base}${isPast ? " opacity-60" : ""}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-8 text-slate-400">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Wczytywanie harmonogramu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4" />
          <span>{error}</span>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
          >
            <RefreshCcw className="size-3" />
            Odśwież
          </button>
        ) : null}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Brak zaplanowanych wydarzeń w kalendarzu.
      </div>
    );
  }

  return (
    <ul className={listSpacing}>
      {items.map((day) => (
        <li key={day.isoDate + day.title} className={getItemClass(day.isPast)}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">{day.displayDate}</p>
              <p className="text-xs text-slate-500">{day.title}</p>
            </div>
            {day.isToday ? (
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-600">Dzisiaj</span>
            ) : null}
          </div>
          <ul className={`${slotsMargin} space-y-2 text-sm text-slate-600`}>
            {day.slots.map((slot) => {
              const duration = formatDuration(slot.durationMinutes);
              return (
                <li key={slot.id} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 size-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-700">{renderSlotTime(slot)}</div>
                      {slot.label ? (
                        <div className={`text-xs ${variant === "compact" ? "text-slate-500" : "text-slate-500"}`}>
                          {slot.label}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {duration ? <span className="text-xs text-slate-400">{duration}</span> : null}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
};

export default CalendarTimeline;

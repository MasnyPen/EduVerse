import { Globe2, Loader2, MapPin, RefreshCcw, TriangleAlert } from "lucide-react";
import type { CalendarDaySchedule, CalendarTimeSlot } from "../types";

interface CalendarTimelineProps {
  days: CalendarDaySchedule[];
  isLoading?: boolean;
  error?: string | null;
  maxItems?: number;
  variant?: "default" | "compact";
  onRefresh?: () => void;
  highlightVoivodeship?: string | null;
}

const CalendarTimeline = ({
  days,
  isLoading = false,
  error = null,
  maxItems = 5,
  variant = "default",
  onRefresh,
  highlightVoivodeship = null,
}: CalendarTimelineProps) => {
  const items = days.slice(0, Math.max(maxItems, 1));
  const listSpacing = variant === "compact" ? "space-y-2" : "space-y-3";
  const slotsMargin = variant === "compact" ? "mt-2" : "mt-3";
  const normalizedHighlight = highlightVoivodeship?.toLowerCase() ?? null;

  const matchesHighlightedVoivodeship = (slot: CalendarTimeSlot): boolean =>
    normalizedHighlight
      ? slot.voivodeships?.some((name) => name.toLowerCase() === normalizedHighlight) ?? false
      : false;

  const isSlotHighlighted = (slot: CalendarTimeSlot): boolean =>
    slot.hasAllVoivodeships || matchesHighlightedVoivodeship(slot);

  const formatVoivodeshipName = (name: string): string => (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);

  const getSlotDisplayLabel = (slot: CalendarTimeSlot): string | null => {
    const label = slot.label?.trim();
    if (!label) {
      return null;
    }
    if (/^dla\s+wojew/i.test(label)) {
      return null;
    }
    return label;
  };

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
            {[...day.slots]
              .map((slot, index) => ({ slot, index }))
              .sort((a, b) => {
                const aHighlighted = isSlotHighlighted(a.slot) ? 1 : 0;
                const bHighlighted = isSlotHighlighted(b.slot) ? 1 : 0;
                if (aHighlighted !== bHighlighted) {
                  return bHighlighted - aHighlighted;
                }
                const aAll = a.slot.hasAllVoivodeships ? 1 : 0;
                const bAll = b.slot.hasAllVoivodeships ? 1 : 0;
                if (aAll !== bAll) {
                  return bAll - aAll;
                }
                return a.index - b.index;
              })
              .map(({ slot }) => (
                <li
                  key={slot.id}
                  className={`flex flex-col gap-2 rounded-xl px-3 py-2 shadow-sm transition ${
                    isSlotHighlighted(slot)
                      ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex w-full flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
                    {(() => {
                      const displayLabel = getSlotDisplayLabel(slot);
                      return displayLabel ? (
                        <span className="text-sm font-semibold text-slate-800">{displayLabel}</span>
                      ) : null;
                    })()}
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {slot.hasAllVoivodeships ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-sky-600">
                          <Globe2 className="size-3" />
                          Wszystkie
                        </span>
                      ) : matchesHighlightedVoivodeship(slot) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-600">
                          <MapPin className="size-3" />
                          Twoje województwo
                        </span>
                      ) : null}
                      {slot.voivodeships && slot.voivodeships.length > 0 ? (
                        slot.hasAllVoivodeships ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-sky-600">
                            <Globe2 className="size-3" />
                            Wszystkie województwa
                          </span>
                        ) : (
                          slot.voivodeships.map((name) => {
                            const isHighlightedVoivodeship =
                              matchesHighlightedVoivodeship(slot) && name.toLowerCase() === normalizedHighlight;
                            return (
                              <span
                                key={`${slot.id}-${name}`}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  isHighlightedVoivodeship
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-slate-200/60 text-slate-600"
                                }`}
                              >
                                <MapPin className="size-3" />
                                {formatVoivodeshipName(name)}
                              </span>
                            );
                          })
                        )
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

export default CalendarTimeline;

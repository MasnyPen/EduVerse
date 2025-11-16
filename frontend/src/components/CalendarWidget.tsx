import { type MouseEventHandler } from "react";
import { CalendarDays, ChevronRight, Loader2, RefreshCcw } from "lucide-react";

interface CalendarWidgetProps {
  dayName: string;
  dayNumber: string;
  eventTitle: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

const CalendarWidget = ({
  dayName,
  dayNumber,
  eventTitle,
  isLoading,
  error,
  onRetry,
  onOpen,
  className,
}: CalendarWidgetProps) => {
  const baseClass =
    "group relative flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";

  return (
    <button type="button" onClick={onOpen} className={className ? `${baseClass} ${className}` : baseClass}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center rounded-xl bg-sky-500 px-3 py-2 text-white">
          <span className="text-xs font-semibold uppercase tracking-wide">{dayName}</span>
          <span className="text-2xl font-bold leading-none">{dayNumber}</span>
        </div>
        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CalendarDays className="size-3" />
            <span>Dzisiejsze wydarzenie</span>
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
            <p className="mt-1 text-sm font-medium text-slate-700">{eventTitle}</p>
          )}
        </div>
      </div>
      <ChevronRight className="size-4 text-slate-400 transition group-hover:text-sky-500" />
    </button>
  );
};

export default CalendarWidget;

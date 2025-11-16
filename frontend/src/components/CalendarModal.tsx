import { CalendarDays, RefreshCcw, X } from "lucide-react";
import type { CalendarDaySchedule } from "../types";
import CalendarTimeline from "./CalendarTimeline";

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
  days: CalendarDaySchedule[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const CalendarModal = ({ open, onClose, days, isLoading, error, onRefresh }: CalendarModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="flex items-center justify-center rounded-full bg-sky-500/10 p-2 text-sky-600">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Kalendarz szkolny</h2>
              <p className="text-xs text-slate-400">Przegląd wydarzeń w roku szkolnym.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-600"
            >
              <RefreshCcw className="size-3" />
              Odśwież
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Zamknij kalendarz"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <CalendarTimeline
            days={days}
            isLoading={isLoading}
            error={error}
            onRefresh={onRefresh}
            maxItems={Math.max(days.length, 10)}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;

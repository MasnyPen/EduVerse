import type { FormEvent } from "react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  X,
  CheckCircle2,
  HelpCircle,
  ClipboardList,
  Calculator,
  Languages,
  Trophy,
  ArrowRight,
} from "lucide-react";

import MarkdownContent from "../MarkdownContent";
import EdustopTaskQuestion from "./EdustopTaskQuestion";
import { reverseGeocode } from "../../utils/geocoding";
import type { EduStopTaskQuestion, EduStopSummary } from "../../types";

interface TaskHeroSectionProps {
  edustopName: string;
  locationLabel: string | null;
  isResolvingAddress: boolean;
  onClose: () => void;
}

interface TaskOverviewSectionProps {
  subject: string | undefined;
  title: string | undefined;
  description: string;
}

interface FeedbackBannerProps {
  feedback: {
    type: "success" | "error";
    message: string;
    correctAnswers?: Record<string, string[]>;
    userAnswers?: Record<string, string[]>;
  } | null;
}

interface SubmissionActionsProps {
  isSubmitReady: boolean;
  isSubmitting: boolean;
  feedback: {
    type: "success" | "error";
    message: string;
    correctAnswers?: Record<string, string[]>;
    userAnswers?: Record<string, string[]>;
  } | null;
  onLoadNextTask: () => void;
}

interface EdustopTaskModalProps {
  open: boolean;
  edustop: EduStopSummary | null;
  task: {
    taskId?: string;
    content?: { questions?: EduStopTaskQuestion[]; description?: string; title?: string; subject?: string };
  } | null;
  isLoadingTask: boolean;
  isSubmitting: boolean;
  error: string | null;
  feedback: {
    type: "success" | "error";
    message: string;
    correctAnswers?: Record<string, string[]>;
    userAnswers?: Record<string, string[]>;
  } | null;
  onSubmit: (payload: { questionId: string; answers: string[] }[]) => void;
  onClose: () => void;
  onRetry: () => void;
  onLoadNextTask: () => void;
}

const renderMath = (text: string) => {
  // Convert to LaTeX for KaTeX rendering, wrapping in $ for inline math
  text = text.replaceAll(/\(([^)]+)\)\^(\d+)/g, (_, base, exp) => `$(${base})^{${exp}}$`);
  text = text.replaceAll(/([a-zA-Z\d]+)\^(\d+)/g, (_, base, exp) => `$${base}^{${exp}}$`);

  text = text.replaceAll(/(\d+)\s+do\s+potęgi\s+(\d+)/gi, (_, base, exp) => `$${base}^{${exp}}$`);

  text = text.replaceAll(/([a-zA-Z]+)(\d+)/g, (_, base, exp) => `$${base}^{${exp}}$`);

  text = text.replaceAll(
    /(\([^)]+\)|[a-zA-Z\d]+)\s*\/\s*(\([^)]+\)|[a-zA-Z\d]+)/g,
    (_, num, den) => `$\\frac{${num}}{${den}}$`
  );

  text = text.replaceAll(/(?<=[\w)])\s*\*\s*(?=[(\w])/g, String.raw` $\times$ `);

  text = text.replaceAll(/√(\([^)]+\)|[a-zA-Z\d]+)/g, (_, arg) => `$\\sqrt{${arg}}$`);

  return text;
};

const TaskLoadingState = () => (
  <div className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl border bg-white/80 px-4 md:px-6 py-8 md:py-12 text-center shadow-sm">
    <Loader2 className="size-10 animate-spin text-sky-500" />
    <p className="text-lg font-semibold text-slate-700">Ładujemy zadanie...</p>
  </div>
);

const TaskErrorState = ({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) => {
  const isLimit = /limit|Limit|osiągnięto|Osiągnięto|zadania|zadanie/.test(message);
  const isProximityError = message === "Jesteś zbyt daleko od EduStopa. Podejdź bliżej (mniej niż 100m).";
  const Icon = isLimit ? Trophy : AlertTriangle;
  const bgClass = isLimit ? "bg-yellow-50" : "bg-rose-50";
  const textClass = isLimit ? "text-yellow-600" : "text-rose-600";
  const buttonBg = isLimit ? "bg-yellow-600 hover:bg-yellow-500" : "bg-rose-600 hover:bg-rose-500";
  const buttonText = isLimit ? "Znajdź kolejny EduStop" : "Spróbuj ponownie";
  const onAction = isLimit ? onClose : onRetry;
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-4 rounded-3xl border ${bgClass} px-4 md:px-6 py-6 md:py-10 text-center shadow-inner`}
    >
      <Icon className={`size-10 ${isLimit ? "text-yellow-500" : "text-rose-500"}`} />
      <p className={`text-lg font-semibold ${textClass}`}>
        {isLimit ? "Gratulacje! Jesteś mistrzem tego EduStopa! Czas na nowe wyzwania." : message}
      </p>
      {!isProximityError && (
        <button
          type="button"
          onClick={onAction}
          className={`rounded-full ${buttonBg} px-5 py-2 text-sm font-semibold text-white shadow`}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
};

const TaskHeroSection: React.FC<TaskHeroSectionProps> = ({
  edustopName,
  locationLabel,
  isResolvingAddress,
  onClose,
}) => (
  <div className="relative bg-slate-900 px-4 md:px-8 pb-4 md:pb-8 pt-4 md:pt-6 text-white shadow-inner">
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2 wrap-break-word">
          <ClipboardList className="size-6 text-sky-300" /> {edustopName}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2 md:gap-3 text-sm wrap-break-word">
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1 backdrop-blur">
            <MapPin className="size-4" />
            {isResolvingAddress ? "Pobieramy adres..." : locationLabel || "Brak danych"}
          </div>
        </div>
      </div>

      <button type="button" onClick={onClose} className="rounded-full border border-white/20 p-2 hover:bg-white/10">
        <X className="size-5" />
      </button>
    </div>
  </div>
);

const getSubjectIcon = (subject: string | undefined): React.ReactElement => {
  const iconClass = "size-3";
  switch (subject?.toUpperCase()) {
    case "MATH":
      return <Calculator className={iconClass} />;
    case "ENGLISH":
      return <Languages className={iconClass} />;
    case "POLISH":
      return <Languages className={iconClass} />;
    default:
      return <HelpCircle className={iconClass} />;
  }
};

const TaskOverviewSection: React.FC<TaskOverviewSectionProps> = ({ subject, title, description }) => (
  <section className="rounded-3xl border border-slate-100 bg-slate-50/70 px-4 md:px-6 py-3 md:py-5 shadow-inner">
    <div className="flex flex-wrap items-center gap-3">
      {subject ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow">
          {getSubjectIcon(subject)} {subject}
        </span>
      ) : null}
    </div>

    <h3 className="mt-3 text-lg md:text-xl font-semibold text-slate-800 leading-snug flex items-center gap-2 wrap-break-word">
      <ClipboardList className="size-5 text-sky-500" />
      {title || "Zadanie specjalne"}
    </h3>

    {description ? (
      <div className="mt-3 text-sm text-slate-600">
        <MarkdownContent content={renderMath(description)} />
      </div>
    ) : null}
  </section>
);

const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ feedback }) => {
  if (!feedback || feedback.correctAnswers) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 md:px-4 py-2 md:py-3 text-sm font-medium shadow-sm backdrop-blur ${
        feedback.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-600"
      }`}
    >
      {feedback.type === "success" ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
      <span>{feedback.message}</span>
    </div>
  );
};

const SubmissionActions: React.FC<SubmissionActionsProps> = ({
  isSubmitReady,
  isSubmitting,
  feedback,
  onLoadNextTask,
}) => (
  <div className="flex flex-col gap-3 pt-4">
    <div className="flex w-full justify-center">
      {feedback ? (
        <button
          type="button"
          onClick={onLoadNextTask}
          className="rounded-2xl px-4 md:px-5 py-2 md:py-3 text-sm font-semibold text-white shadow-lg bg-green-600 hover:bg-green-500 flex items-center justify-center gap-2"
        >
          <ArrowRight className="size-4" /> Następne zadanie
        </button>
      ) : (
        <button
          type="submit"
          disabled={!isSubmitReady || isSubmitting}
          className={`rounded-2xl px-4 md:px-5 py-2 md:py-3 text-sm font-semibold text-white shadow-lg transition flex items-center justify-center gap-2 ${
            isSubmitReady ? "bg-sky-600 hover:bg-sky-500" : "bg-slate-300"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Weryfikacja...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" /> Sprawdź odpowiedź
            </>
          )}
        </button>
      )}
    </div>
  </div>
);

const EdustopTaskModal: React.FC<EdustopTaskModalProps> = ({
  open,
  edustop,
  task,
  isLoadingTask,
  isSubmitting,
  error,
  feedback,
  onSubmit,
  onClose,
  onRetry,
  onLoadNextTask,
}) => {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [address, setAddress] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const questions = useMemo(() => task?.content?.questions ?? [], [task]);
  const description = task?.content?.description ?? "";
  const taskTitle = task?.content?.title;
  const taskSubject = task?.content?.subject;
  const taskId = task?.taskId ?? null;

  useEffect(() => {
    if (!taskId) {
      setAnswers({});
      return;
    }
    const init = questions.reduce((acc: Record<string, string[]>, q: EduStopTaskQuestion) => {
      acc[q.questionId] = [];
      return acc;
    }, {});
    setAnswers(init);
  }, [questions, taskId]);

  useEffect(() => {
    const lat = edustop?.coordinates?.latitude;
    const lon = edustop?.coordinates?.longitude;

    if (lat == null || lon == null) {
      setAddress("Brak danych o lokalizacji");
      return;
    }

    const controller = new AbortController();

    const loadAddress = async () => {
      try {
        setIsResolvingAddress(true);
        const result = await reverseGeocode({ latitude: lat, longitude: lon }, { signal: controller.signal });
        setAddress(result.short ?? result.full ?? "Brak danych");
      } catch {
        setAddress("Nie udało się pobrać adresu");
      } finally {
        setIsResolvingAddress(false);
      }
    };

    loadAddress();
    return () => controller.abort();
  }, [edustop]);

  const isSubmitReady =
    questions.length > 0 &&
    questions.every((q: EduStopTaskQuestion) =>
      (answers[q.questionId] ?? []).some((val: string) => val.trim().length > 0)
    ) &&
    feedback?.type !== "error";

  const handleAnswerChange = useCallback((id: string, val: string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!isSubmitReady || !task || isSubmitting) return;

      const payload = questions.map((q: EduStopTaskQuestion) => {
        const normalized = (answers[q.questionId] ?? [])
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);
        return { questionId: q.questionId, answers: normalized };
      });

      onSubmit(payload);
    },
    [answers, isSubmitting, isSubmitReady, onSubmit, questions, task]
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm transition ${
        open ? "" : "hidden"
      }`}
    >
      <div className="flex h-auto max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in">
        <TaskHeroSection
          edustopName={edustop?.name ?? "Brak nazwy"}
          locationLabel={address}
          isResolvingAddress={isResolvingAddress}
          onClose={onClose}
        />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 md:gap-6 overflow-y-auto px-4 md:px-6 py-4 md:py-6"
        >
          {task ? <TaskOverviewSection subject={taskSubject} title={taskTitle} description={description} /> : null}

          <FeedbackBanner feedback={feedback} />

          {isLoadingTask ? (
            <TaskLoadingState />
          ) : error ? (
            <TaskErrorState message={error} onRetry={onRetry} onClose={onClose} />
          ) : (
            <div className="space-y-3 md:space-y-4">
              {questions.map((question: EduStopTaskQuestion, index: number) => (
                <EdustopTaskQuestion
                  key={question.questionId}
                  question={question}
                  index={index}
                  value={answers[question.questionId] ?? []}
                  onChange={(v) => handleAnswerChange(question.questionId, v)}
                  disabled={isSubmitting || feedback?.type === "error"}
                  correctAnswers={feedback?.correctAnswers?.[question.questionId] || []}
                  userAnswers={feedback?.userAnswers?.[question.questionId] || []}
                />
              ))}
            </div>
          )}

          {edustop?._id !== "proximity" && (
            <SubmissionActions
              isSubmitReady={isSubmitReady}
              isSubmitting={isSubmitting}
              feedback={feedback}
              onLoadNextTask={onLoadNextTask}
            />
          )}
        </form>
      </div>
    </div>
  );
};

export default EdustopTaskModal;

import type { EduStopTaskQuestion } from "../../types";
import MarkdownContent from "../MarkdownContent";
import { CheckCircle2 } from "lucide-react";

const renderMath = (text: string) => {
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

interface EdustopTaskQuestionProps {
  question: EduStopTaskQuestion;
  index: number;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  correctAnswers?: string[];
  userAnswers?: string[];
}

type CanonicalQuestionType = "OPEN" | "MULTIPLE_CHOICE" | "TRUE_FALSE";

const TYPE_LABELS: Record<CanonicalQuestionType, string> = {
  OPEN: "Odpowiedź otwarta",
  MULTIPLE_CHOICE: "Wielokrotnego wyboru",
  TRUE_FALSE: "Jednokrotnego wyboru",
};

const normalizeQuestionType = (rawType?: string): CanonicalQuestionType => {
  if (!rawType) {
    return "OPEN";
  }
  const token = rawType
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
  if (token.includes("TRUEFALSE") || token.includes("TRUE_FALSE")) {
    return "TRUE_FALSE";
  }
  if (token.includes("MULTIPLECHOICE") || token.includes("MULTIPLE_CHOICE")) {
    return "MULTIPLE_CHOICE";
  }
  if (token.includes("OPEN")) {
    return "OPEN";
  }
  return "OPEN";
};

const EdustopTaskQuestion = ({
  question,
  index,
  value,
  onChange,
  disabled = false,
  correctAnswers = [],
  userAnswers = [],
}: EdustopTaskQuestionProps) => {
  const normalizedType = normalizeQuestionType(question._class || question.type);
  const hasOptions = Boolean(question.options && question.options.length > 0);
  const effectiveType: CanonicalQuestionType =
    normalizedType === "OPEN" && hasOptions ? "MULTIPLE_CHOICE" : normalizedType;
  const label = TYPE_LABELS[effectiveType];

  const handleOpenAnswerChange = (next: string) => {
    onChange([next]);
  };

  const toggleOption = (key: string) => {
    const isRadio = effectiveType === "TRUE_FALSE";
    if (isRadio) {
      onChange([key]);
      return;
    }
    const existing = new Set(value);
    if (existing.has(key)) {
      existing.delete(key);
    } else {
      existing.add(key);
    }
    onChange(Array.from(existing));
  };

  const renderOptions = () => {
    const options = question.options ?? [];
    if (options.length === 0) {
      return null;
    }

    const isRadio = effectiveType === "TRUE_FALSE";
    const correctSet = new Set(correctAnswers);
    const userSet = new Set(userAnswers);
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const key = option.key ?? option.text;
          const checked = value.includes(key);
          const isCorrect = correctSet.has(key);
          const isUserSelected = userSet.has(key);
          let bgClass = "bg-white";
          let borderClass = "border-slate-200";
          let textClass = "text-slate-600";
          if (correctAnswers.length > 0) {
            if (isCorrect) {
              bgClass = "bg-green-50";
              borderClass = "border-green-400";
              textClass = "text-green-900";
            } else if (isUserSelected) {
              bgClass = "bg-blue-50";
              borderClass = "border-blue-400";
              textClass = "text-blue-900";
            }
          } else if (checked) {
            bgClass = "bg-sky-50";
            borderClass = "border-sky-400";
            textClass = "text-sky-900";
          }
          return (
            <label
              key={`${question.questionId}-${key}`}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${bgClass} ${borderClass} ${textClass} ${
                disabled ? "opacity-70" : "cursor-pointer hover:border-sky-200"
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <input
                  type={isRadio ? "radio" : "checkbox"}
                  name={`question-${question.questionId}`}
                  value={key}
                  checked={checked}
                  onChange={() => toggleOption(key)}
                  disabled={disabled}
                  className="size-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                />
              )}
              <MarkdownContent content={renderMath(option.text ?? "")} inline />
            </label>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    switch (effectiveType) {
      case "OPEN": {
        const hasFeedback = correctAnswers.length > 0 || userAnswers.length > 0;
        const isCorrect = hasFeedback && correctAnswers.length === 0;
        let textareaClass =
          "mt-4 block w-full rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:bg-white focus:outline-none";
        if (isCorrect) {
          textareaClass += " bg-gradient-to-r from-green-100 to-green-50 border-green-300";
        } else if (hasFeedback && !isCorrect) {
          textareaClass += " bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300";
        } else {
          textareaClass += " border-slate-200";
        }
        return (
          <>
            <textarea
              value={value[0] ?? ""}
              onChange={(event) => handleOpenAnswerChange(event.target.value)}
              disabled={disabled}
              className={textareaClass}
              rows={4}
              placeholder="Wpisz swoją odpowiedź"
            />
            {!isCorrect && hasFeedback && correctAnswers.length > 0 && (
              <div className="mt-4 rounded-2xl bg-green-50 border border-green-200 px-4 py-3">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                  <CheckCircle2 className="size-4" /> Poprawna odpowiedź
                </div>
                <div className="mt-2 text-green-900">
                  <MarkdownContent content={renderMath(correctAnswers[0])} />
                </div>
              </div>
            )}
          </>
        );
      }
      case "MULTIPLE_CHOICE":
      case "TRUE_FALSE":
        return renderOptions();
    }
  };

  return (
    <section className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zadanie {index + 1}</p>
          {question.content ? (
            <MarkdownContent
              content={renderMath(question.content)}
              className="mt-1 text-base font-semibold text-slate-800"
            />
          ) : null}
          {label ? <p className="mt-1 text-xs font-medium text-slate-500">{label}</p> : null}
        </div>
        {question.answers && question.answers.length > 1 ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Do wyboru: {question.answers.length}
          </span>
        ) : null}
      </div>
      {renderContent()}
      {question.options?.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">Brak sugerowanych opcji — odpowiedz własnymi słowami.</p>
      ) : null}
    </section>
  );
};

export default EdustopTaskQuestion;

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Fingerprint, Lock, Map, Navigation, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore, type UserStoreState } from "../store/userStore";

type AuthMode = "login" | "register";

const Login = () => {
  const navigate = useNavigate();
  const { login, register, isAuthLoading, authError, token } = useUserStore((state: UserStoreState) => ({
    login: state.login,
    register: state.register,
    isAuthLoading: state.isAuthLoading,
    authError: state.authError,
    token: state.token,
  }));

  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    setLocalError(null);
  }, [mode]);

  const features = useMemo(
    () => [
      {
        icon: Sparkles,
        title: "Odblokuj szkoły w 3D",
        description: "Zbliż się do szkoły i zobacz jak mapa reaguje w czasie rzeczywistym.",
      },
      {
        icon: Map,
        title: "Interaktywne filtry",
        description: "Wyszukuj placówki według profilu, wyników i opinii innych uczniów.",
      },
      {
        icon: Navigation,
        title: "Śledzenie postępów",
        description: "Zapisuj odwiedzone szkoły i buduj własną historię edukacyjną.",
      },
      {
        icon: Trophy,
        title: "Wyzwania i rankingi",
        description: "Zdobywaj odznaki za odkrycia i rywalizuj ze znajomymi na tablicach wyników.",
      },
    ],
    []
  );

  const handleFieldChange = (field: "username" | "password") => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (localError) {
      setLocalError(null);
    }
  };

  const canSubmit = useMemo(() => {
    const username = form.username.trim();
    const password = form.password.trim();
    if (username.length < 3 || password.length < 6) {
      return false;
    }
    return true;
  }, [form.username, form.password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const payload = {
      username: form.username.trim(),
      password: form.password.trim(),
    };

    try {
      if (mode === "login") {
        await login(payload);
      } else {
        await register(payload);
      }
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Auth attempt failed", error);
      setLocalError(authError ?? "Coś poszło nie tak. Spróbuj ponownie.");
    }
  };

  const activeError = localError ?? authError;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-[-120px] h-[420px] w-[420px] rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0ea5e930,transparent_60%)]" />
      </div>

      <main className="relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between gap-12 px-8 py-10 text-white md:px-14 lg:px-20">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg shadow-sky-900/40">
              <Compass className="size-6" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-white/70">EduVerse</p>
              <p className="text-lg font-semibold text-white">Twoja mapa szkół</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100/80">
                <Lock className="size-3.5" /> Bezpieczne konto
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
                Dołącz do EduVerse i poznaj szkoły w immersyjnym świecie 3D.
              </h1>
              <p className="max-w-xl text-base text-slate-200/80">
                Odkrywaj szkoły w swojej okolicy, blok po bloku. Śledź postępy, zbieraj punkty i buduj własną ścieżkę
                edukacyjną z wykorzystaniem mapy 3D MapLibre.
              </p>
            </div>

            <ul className="grid gap-5 text-sm text-slate-100/85 md:grid-cols-2">
              {features.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-white/25 hover:bg-white/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15 text-white">
                      <Icon className="size-5" />
                    </span>
                    <p className="text-sm font-semibold text-white">{title}</p>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-white/70">{description}</p>
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="flex flex-col gap-2 text-xs text-slate-200/60">
            <p>© {new Date().getFullYear()} EduVerse. Wszystkie prawa zastrzeżone.</p>
            <p>Szkoły w Twojej okolicy są pobierane w czasie rzeczywistym na podstawie geolokalizacji.</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-16 sm:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="w-full max-w-md rounded-4xl border border-slate-200/70 bg-white/95 p-10 shadow-2xl shadow-slate-900/20 backdrop-blur"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <Fingerprint className="size-6" />
              </span>
              <h2 className="text-2xl font-semibold text-slate-900">
                {mode === "login" ? "Zaloguj się do EduVerse" : "Załóż darmowe konto"}
              </h2>
              <p className="text-sm text-slate-500">
                {mode === "login"
                  ? "Podaj swoją nazwę użytkownika, aby kontynuować i wrócić na mapę 3D."
                  : "Utwórz konto, wybierając unikalną nazwę użytkownika i hasło."}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-500">
              {[
                { key: "login" as AuthMode, label: "Logowanie" },
                { key: "register" as AuthMode, label: "Rejestracja" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMode(option.key)}
                  className={`w-full rounded-full px-4 py-2 transition ${
                    mode === option.key ? "bg-white text-sky-600 shadow" : "hover:bg-white/70 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nazwa użytkownika
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleFieldChange("username")}
                  autoComplete="username"
                  placeholder="np. eduverse_fan"
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hasło
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFieldChange("password")}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Minimum 6 znaków"
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {activeError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {activeError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit || isAuthLoading}
                className={`w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/40 transition hover:bg-sky-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:shadow-none`}
              >
                {isAuthLoading ? "Trwa przetwarzanie..." : mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
              </button>

              <p className="text-center text-xs text-slate-500">
                {mode === "login" ? "Nie masz jeszcze konta? " : "Masz już konto EduVerse? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="font-semibold text-sky-600 underline-offset-4 hover:underline"
                >
                  {mode === "login" ? "Zarejestruj się" : "Zaloguj się"}
                </button>
              </p>
            </form>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default Login;

import { isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BarChart3, Heart, Info, LogIn, School, Sparkles, X } from "lucide-react";
import AppShell from "../components/AppShell";
import CalendarModal from "../components/CalendarModal";
import CalendarWidget from "../components/CalendarWidget";
import Loader from "../components/Loader";
import Map3DScene from "../components/Map3DScene";
import SchoolModal from "../components/SchoolModal";
import EdustopTaskModal from "../components/edustops/EdustopTaskModal";
import { getSchoolsWithinRadius } from "../api/schools";
import { requestEduStopTask, searchEduStopsWithinRadius, verifyEduStopTask } from "../api/edustops";
import type {
  Coordinates,
  EduStopSummary,
  EduStopTaskAnswerPayload,
  EduStopTaskPayload,
  SchoolSummary,
} from "../types";
import { MAP_DEFAULT_RADIUS_METERS } from "../utils/constants";
import { annotateDistances, haversine } from "../utils/distance";
import { getCurrentPosition, watchUserPosition } from "../utils/geolocation";
import { getVoivodeshipFromCoordinates } from "../utils/calendar";
import { useCalendarSchedule } from "../hooks/useCalendarSchedule";
import { useCalendarToday } from "../hooks/useCalendarToday";
import { useUserStore, type UserStoreState } from "../store/userStore";

const MAX_LISTED_SCHOOLS = 5;
type MobilePanel = "greeting" | "schools" | "stats";
type TaskFeedback = {
  type: "success" | "error";
  message: string;
  correctAnswers?: Record<string, string[]>;
  userAnswers?: Record<string, string[]>;
};

interface MapErrorOverlaysProps {
  geoError: string | null;
  schoolsError: string | null;
  edustopError: string | null;
}

const MapErrorOverlays = ({ geoError, schoolsError, edustopError }: MapErrorOverlaysProps) => (
  <>
    {geoError ? (
      <div className="absolute bottom-40 left-4 z-20 max-w-xs rounded-2xl bg-rose-100/90 px-4 py-3 text-sm font-semibold text-rose-700 shadow-lg sm:left-6 lg:bottom-12">
        <span className="flex items-center gap-2">
          <AlertCircle className="size-4" />
          {geoError}
        </span>
      </div>
    ) : null}
    {schoolsError ? (
      <div className="absolute bottom-40 right-4 z-20 max-w-xs rounded-2xl bg-amber-100/90 px-4 py-3 text-sm font-semibold text-amber-700 shadow-lg sm:right-6 lg:bottom-12">
        <span className="flex items-center gap-2">
          <AlertCircle className="size-4" />
          {schoolsError}
        </span>
      </div>
    ) : null}
    {edustopError ? (
      <div className="absolute bottom-24 right-4 z-20 max-w-xs rounded-2xl bg-indigo-100/90 px-4 py-3 text-sm font-semibold text-indigo-800 shadow-lg sm:right-6 lg:bottom-16">
        <span className="flex items-center gap-2">
          <AlertCircle className="size-4" />
          {edustopError}
        </span>
      </div>
    ) : null}
  </>
);

const resolveTaskError = (error: unknown): string => {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const payload = error.response?.data;
    if (Array.isArray(payload?.message) && payload?.message.length > 0) {
      return payload.message[0];
    }
    if (typeof payload?.message === "string") {
      return payload.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Nie udało się pobrać zadania. Spróbuj ponownie.";
};

const Dashboard = () => {
  const { token, user, hydrateUser, likedSchools, unlockedSchools, like, unlike, unlock } = useUserStore(
    (state: UserStoreState) => ({
      token: state.token,
      user: state.user,
      hydrateUser: state.hydrateUser,
      likedSchools: state.likedSchools,
      unlockedSchools: state.unlockedSchools,
      like: state.like,
      unlike: state.unlike,
      unlock: state.unlock,
    })
  );
  const isAuthenticated = Boolean(token);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [edustops, setEdustops] = useState<EduStopSummary[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(true);
  const [isFetchingSchools, setIsFetchingSchools] = useState(false);
  const [isFetchingEdustops, setIsFetchingEdustops] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [edustopError, setEdustopError] = useState<string | null>(null);
  const [selectedEduStopId, setSelectedEduStopId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<EduStopTaskPayload | null>(null);
  const [isRequestingTask, setIsRequestingTask] = useState(false);
  const [isVerifyingTask, setIsVerifyingTask] = useState(false);
  const [taskRequestError, setTaskRequestError] = useState<string | null>(null);
  const [taskFeedback, setTaskFeedback] = useState<TaskFeedback | null>(null);
  const [proximityEduStop, setProximityEduStop] = useState<EduStopSummary | null>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel | null>(null);
  const {
    title: todayTitle,
    error: todayError,
    refetch: refetchToday,
  } = useCalendarToday({ enabled: isAuthenticated });
  const {
    upcomingDays,
    upcomingDay,
    activeYear,
    isLoading: isCalendarLoading,
    error: calendarError,
    refetch: refetchCalendar,
  } = useCalendarSchedule({ locale: "pl-PL", enabled: isAuthenticated });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;

    if (!isMobile) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const bootstrappedUser = useRef(false);
  const latestPositionRef = useRef<Coordinates | null>(null);
  const isFetchingSchoolsRef = useRef(false);
  const isFetchingEdustopsRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const win = globalThis.window as (Window & typeof globalThis) | undefined;
    const doc = globalThis.document as Document | undefined;
    if (!win || !doc) {
      return;
    }

    const root = doc.documentElement;

    const updateViewportVars = () => {
      const viewport = win.visualViewport;
      const height = Math.round((viewport?.height ?? win.innerHeight) || 0);
      if (height <= 0) {
        return;
      }
      root.style.setProperty("--app-viewport-height", `${height}px`);
      setViewportHeight(height);
    };

    updateViewportVars();

    const resizeHandler = () => {
      updateViewportVars();
    };

    win.addEventListener("resize", resizeHandler);
    win.addEventListener("orientationchange", resizeHandler);
    const viewport = win.visualViewport;
    viewport?.addEventListener("resize", resizeHandler);

    return () => {
      win.removeEventListener("resize", resizeHandler);
      win.removeEventListener("orientationchange", resizeHandler);
      viewport?.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    const win = globalThis.window as (Window & typeof globalThis) | undefined;
    if (!win || typeof win.matchMedia !== "function") {
      return;
    }

    const mediaQuery = win.matchMedia("(min-width: 1024px)");
    const updateViewportState = (event?: MediaQueryListEvent) => {
      setIsDesktopViewport(event ? event.matches : mediaQuery.matches);
    };

    updateViewportState();
    mediaQuery.addEventListener("change", updateViewportState);

    return () => {
      mediaQuery.removeEventListener("change", updateViewportState);
    };
  }, []);

  useEffect(() => {
    if (!token || bootstrappedUser.current) {
      return;
    }
    bootstrappedUser.current = true;
    void hydrateUser();
  }, [token, hydrateUser]);

  const fetchSchools = useCallback(async (coords: Coordinates): Promise<boolean> => {
    if (isFetchingSchoolsRef.current) {
      return false;
    }

    isFetchingSchoolsRef.current = true;
    setIsFetchingSchools(true);

    try {
      const nearby = await getSchoolsWithinRadius({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius: MAP_DEFAULT_RADIUS_METERS,
      });
      setSchools(annotateDistances(coords, nearby));
      setSchoolsError(null);
    } catch (error) {
      console.error("Nie udało się pobrać szkół", error);
      setSchoolsError("Nie udało się pobrać szkół w Twojej okolicy.");
    } finally {
      isFetchingSchoolsRef.current = false;
      setIsFetchingSchools(false);
    }

    return true;
  }, []);

  const fetchEduStops = useCallback(async (coords: Coordinates): Promise<boolean> => {
    if (isFetchingEdustopsRef.current) {
      return false;
    }

    isFetchingEdustopsRef.current = true;
    setIsFetchingEdustops(true);

    try {
      const stops = await searchEduStopsWithinRadius({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusKm: Math.max(MAP_DEFAULT_RADIUS_METERS / 1000, 1),
      });
      setEdustops(stops);
      setEdustopError(null);
    } catch (error) {
      console.error("Nie udało się pobrać Edustopów", error);
      setEdustopError("Nie udało się pobrać Edustopów w Twojej okolicy.");
    } finally {
      isFetchingEdustopsRef.current = false;
      setIsFetchingEdustops(false);
    }

    return true;
  }, []);

  useEffect(() => {
    let mounted = true;

    getCurrentPosition()
      .then((coords) => {
        if (!mounted) return;
        setUserPosition(coords);
        setGeoError(null);
        setIsLoadingPosition(false);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Geolokalizacja nie powiodła się", error);
        setGeoError(error.message ?? "Nie udało się ustalić lokalizacji użytkownika.");
        setIsLoadingPosition(false);
      });

    const stopWatching = watchUserPosition(
      (coords) => {
        setUserPosition(coords);
        setGeoError(null);
        setIsLoadingPosition(false);
      },
      (error) => {
        console.error("Błąd nasłuchiwania geolokalizacji", error);
        setGeoError(error.message ?? "Nie udało się śledzić lokalizacji użytkownika.");
        setIsLoadingPosition(false);
      }
    );

    return () => {
      mounted = false;
      stopWatching();
    };
  }, []);

  useEffect(() => {
    if (!userPosition || initialFetchDoneRef.current) {
      return;
    }

    initialFetchDoneRef.current = true;
    void fetchSchools(userPosition);
    void fetchEduStops(userPosition);
  }, [userPosition, fetchSchools, fetchEduStops]);

  useEffect(() => {
    latestPositionRef.current = userPosition;
  }, [userPosition]);

  useEffect(() => {
    if (!geoError) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setGeoError(null);
    }, 15000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [geoError]);

  const selectedSchool = useMemo(
    () => (selectedSchoolId ? schools.find((school) => school._id === selectedSchoolId) ?? null : null),
    [schools, selectedSchoolId]
  );
  const selectedEduStop = useMemo(
    () => (selectedEduStopId ? edustops.find((stop) => stop._id === selectedEduStopId) ?? null : null),
    [edustops, selectedEduStopId]
  );

  const likedSchoolIds = useMemo(() => new Set(likedSchools), [likedSchools]);
  const unlockedSchoolIds = useMemo(() => new Set(unlockedSchools), [unlockedSchools]);

  const nearestSchools = useMemo(() => {
    if (schools.length === 0) return [] as SchoolSummary[];
    return [...schools]
      .sort((a, b) => (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY))
      .slice(0, MAX_LISTED_SCHOOLS);
  }, [schools]);

  const handleManualUnlock = useCallback(
    async (schoolId: string) => {
      if (!token) {
        return;
      }
      try {
        await unlock(schoolId);
        setSchools((prev) => prev.map((item) => (item._id === schoolId ? { ...item, unlocked: true } : item)));
      } catch (error) {
        console.error("Odblokowanie szkoły nie powiodło się", error);
        throw error;
      }
    },
    [token, unlock]
  );

  const handleLike = useCallback(
    async (schoolId: string) => {
      await like(schoolId);
    },
    [like]
  );

  const handleUnlike = useCallback(
    async (schoolId: string) => {
      await unlike(schoolId);
    },
    [unlike]
  );

  const handleManualScan = useCallback(async () => {
    const coords = latestPositionRef.current ?? userPosition;
    if (!coords) {
      return false;
    }
    const [schoolsRefreshed, edustopsRefreshed] = await Promise.all([fetchSchools(coords), fetchEduStops(coords)]);
    return schoolsRefreshed || edustopsRefreshed;
  }, [fetchEduStops, fetchSchools, userPosition]);

  const loadEduStopTask = useCallback(async (stopId: string) => {
    setIsRequestingTask(true);
    setTaskRequestError(null);
    setTaskFeedback(null);
    try {
      const taskPayload = await requestEduStopTask(stopId);
      setActiveTask(taskPayload);
    } catch (error) {
      setActiveTask(null);
      setTaskRequestError(resolveTaskError(error));
    } finally {
      setIsRequestingTask(false);
    }
  }, []);

  const handleSelectEduStop = useCallback(
    (stop: EduStopSummary) => {
      if (!userPosition) {
        setTaskRequestError("Nie udało się ustalić Twojej lokalizacji.");
        setIsTaskModalOpen(true);
        return;
      }
      const distance = haversine(userPosition, stop.coordinates);
      if (distance > 100) {
        setProximityEduStop({ _id: "proximity", name: "Nie tak prędko!", coordinates: userPosition });
        setTaskRequestError("Jesteś zbyt daleko od EduStopa. Podejdź bliżej (mniej niż 100m).");
        setIsTaskModalOpen(true);
        setActiveTask(null);
        setTaskFeedback(null);
        setSelectedEduStopId(null);
        return;
      }
      setSelectedEduStopId(stop._id);
      setIsTaskModalOpen(true);
      setActiveTask(null);
      setTaskFeedback(null);
      setTaskRequestError(null);
      void loadEduStopTask(stop._id);
    },
    [loadEduStopTask, userPosition]
  );

  const handleRetryTaskRequest = useCallback(() => {
    if (!selectedEduStopId) {
      return;
    }
    const stop = edustops.find((s) => s._id === selectedEduStopId);
    if (!stop) {
      return;
    }
    if (!userPosition) {
      setTaskRequestError("Nie udało się ustalić Twojej lokalizacji.");
      return;
    }
    const distance = haversine(userPosition, stop.coordinates);
    if (distance > 100) {
      setTaskRequestError("Jesteś zbyt daleko od EduStopa. Podejdź bliżej (mniej niż 100m).");
      return;
    }
    setTaskRequestError(null);
    void loadEduStopTask(selectedEduStopId);
  }, [loadEduStopTask, selectedEduStopId, edustops, userPosition]);

  const handleLoadNextTask = useCallback(() => {
    if (!selectedEduStopId) {
      return;
    }
    setTaskFeedback(null);
    setTaskRequestError(null);
    setActiveTask(null); // Clear old task immediately
    void loadEduStopTask(selectedEduStopId);
  }, [loadEduStopTask, selectedEduStopId]);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedEduStopId(null);
    setProximityEduStop(null);
    setActiveTask(null);
    setTaskRequestError(null);
    setTaskFeedback(null);
  }, []);

  const handleSubmitTaskAnswers = useCallback(
    async (answers: EduStopTaskAnswerPayload[]) => {
      if (!activeTask) {
        return;
      }
      if (!user || !token) {
        setTaskFeedback({
          type: "error",
          message: "Musisz być zalogowany, aby zweryfikować odpowiedzi na zadanie.",
        });
        return;
      }
      if (taskFeedback) {
        // Already submitted, ignore
        return;
      }
      setIsVerifyingTask(true);
      setTaskFeedback(null);
      try {
        const result = await verifyEduStopTask(activeTask.accessToken, answers);
        if (result.verified) {
          setTaskFeedback({
            type: "success",
            message:
              "Świetna robota! Zadanie zostało zaliczone (+2 punkty do rankingu), a Edustop wkrótce się zaktualizuje.",
          });
          void handleManualScan();
          void hydrateUser(); // Refresh user data to update ranking
        } else {
          const correctAnswers: Record<string, string[]> = {};
          const userAnswers: Record<string, string[]> = {};
          for (const q of activeTask.content.questions) {
            correctAnswers[q.questionId] = q.answers || [];
          }
          for (const ans of answers) {
            userAnswers[ans.questionId] = ans.answers;
          }
          setTaskFeedback({
            type: "error",
            message: "To nie ta odpowiedź. Sprawdź zadanie i spróbuj ponownie.",
            correctAnswers,
            userAnswers,
          });
        }
      } catch (error) {
        setTaskFeedback({ type: "error", message: resolveTaskError(error) });
      } finally {
        setIsVerifyingTask(false);
      }
    },
    [activeTask, handleManualScan, token, user, taskFeedback, hydrateUser]
  );

  const displayName = (user?.displayName ?? user?.username ?? "Gościu").trim() || "Gościu";
  const greetingMessage = user ? `Witaj ${displayName}!` : `Witaj, ${displayName}!`;
  const isGuest = !user;
  const widgetError = calendarError ?? (upcomingDay ? null : todayError ?? null);
  const isWidgetLoading = Boolean(isCalendarLoading && !upcomingDay && !widgetError);
  const modalDays = upcomingDays;
  const userVoivodeship = useMemo(() => getVoivodeshipFromCoordinates(userPosition), [userPosition]);
  const closeMobilePanel = useCallback(() => {
    setActiveMobilePanel(null);
  }, []);
  const openMobilePanel = useCallback((panel: MobilePanel) => {
    setActiveMobilePanel((current) => (current === panel ? null : panel));
  }, []);
  const handleMobileSelectSchool = useCallback(
    (schoolId: string) => {
      setSelectedSchoolId(schoolId);
      closeMobilePanel();
    },
    [closeMobilePanel]
  );
  const handleOpenCalendar = useCallback(() => {
    setIsCalendarOpen(true);
    refetchCalendar();
  }, [refetchCalendar]);
  const handleCloseCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);
  const handleRefreshCalendar = useCallback(() => {
    refetchCalendar();
    refetchToday();
  }, [refetchCalendar, refetchToday]);
  const mobilePanelTitles: Record<MobilePanel, string> = {
    greeting: isGuest ? "Witaj w EduVerse" : "Twój profil",
    schools: "Najbliższe szkoły",
    stats: "Twoje statystyki",
  };
  const mapContainerClasses =
    "relative flex flex-1 min-h-[calc(100vh-5.5rem)] overflow-hidden bg-white sm:min-h-[calc(100vh-8rem)] sm:rounded-3xl sm:shadow-xl sm:ring-1 sm:ring-black/5 lg:min-h-[520px]";
  const mapContainerStyle = useMemo(() => {
    if (isDesktopViewport) {
      return undefined;
    }
    if (viewportHeight && Number.isFinite(viewportHeight)) {
      const adjusted = Math.max(viewportHeight - 88, 360);
      const size = `${Math.round(adjusted)}px`;
      return { minHeight: size, height: size } as const;
    }
    const fallback = "calc(var(--app-viewport-height, 100vh) - 5.5rem)";
    return { minHeight: fallback, height: fallback } as const;
  }, [isDesktopViewport, viewportHeight]);

  const mobilePanelContent =
    activeMobilePanel === null
      ? null
      : (() => {
          switch (activeMobilePanel) {
            case "greeting":
              return (
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="space-y-3">
                    <p className="text-base font-semibold text-slate-700">{greetingMessage}</p>
                    {isGuest ? (
                      <p>
                        Zaloguj się, aby odkrywać i odblokowywać szkoły w swojej okolicy oraz zapisywać ulubione
                        miejsca.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p>Miło Cię widzieć, {displayName}. Kontynuuj eksplorację EduVerse!</p>
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                            <span className="text-slate-500">Szkoły w pobliżu</span>
                            <span className="flex items-center gap-2 font-semibold text-slate-800">
                              <School className="size-4 text-emerald-600" />
                              {schools.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl bg-purple-50 px-4 py-3">
                            <span className="text-slate-500">Miejsce w rankingu</span>
                            <span className="flex items-center gap-2 font-semibold text-slate-800">
                              <BarChart3 className="size-4 text-purple-600" />
                              {user?.rankingPosition ?? "?"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <CalendarWidget
                    upcomingDay={upcomingDay}
                    activeYear={activeYear}
                    todayTitle={todayTitle}
                    isLoading={isWidgetLoading}
                    error={widgetError}
                    onRetry={handleRefreshCalendar}
                    onOpen={handleOpenCalendar}
                    className="w-full"
                    userVoivodeship={userVoivodeship}
                  />
                </div>
              );
            case "schools": {
              if (nearestSchools.length === 0) {
                return (
                  <p className="text-sm text-slate-600">
                    Brak szkół do wyświetlenia. Włącz lokalizację lub skorzystaj z przycisku „Skanuj okolice”.
                  </p>
                );
              }
              return (
                <ul className="space-y-3">
                  {nearestSchools.map((school, index) => {
                    const isUnlockedSchool = unlockedSchoolIds.has(school._id);
                    const isLikedSchool = likedSchoolIds.has(school._id);
                    return (
                      <li key={`${school._id}-${index}`}>
                        <button
                          type="button"
                          onClick={() => handleMobileSelectSchool(school._id)}
                          className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        >
                          <div>
                            <p className="font-semibold text-slate-700">{school.name}</p>
                            {typeof school.distanceMeters === "number" ? (
                              <p className="text-xs text-slate-500">{Math.round(school.distanceMeters)} m od Ciebie</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            {isLikedSchool ? <Heart className="size-4 text-rose-500" /> : null}
                            {isUnlockedSchool ? <Sparkles className="size-4 text-amber-500" /> : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              );
            }
            case "stats":
              return (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
                    <span className="text-sm font-semibold text-amber-600">Odblokowane szkoły</span>
                    <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <Sparkles className="size-4 text-amber-500" />
                      {unlockedSchoolIds.size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3">
                    <span className="text-sm font-semibold text-rose-600">Polubione szkoły</span>
                    <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <Heart className="size-4 text-rose-500" />
                      {likedSchools.length}
                    </span>
                  </div>
                </div>
              );
            default:
              return null;
          }
        })();

  return (
    <AppShell>
      <div className="relative flex flex-1 flex-col gap-4 p-0 pb-24 sm:p-4 sm:pb-6 md:p-8 lg:gap-6 lg:pb-8">
        <div className="flex flex-1 flex-col gap-4 h-full w-full lg:grid lg:grid-cols-[2.25fr_1fr] lg:gap-6">
          <div className={mapContainerClasses} style={mapContainerStyle}>
            <Map3DScene
              userPosition={userPosition}
              schools={schools}
              onSelectSchool={(school) => setSelectedSchoolId(school._id)}
              unlockedSchoolIds={unlockedSchoolIds}
              likedSchoolIds={likedSchoolIds}
              onScan={handleManualScan}
              isRefreshing={isFetchingSchools || isFetchingEdustops}
              edustops={edustops}
              onSelectEduStop={handleSelectEduStop}
            />
            {(isLoadingPosition || isFetchingSchools || isFetchingEdustops) && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur">
                <Loader />
              </div>
            )}
            <MapErrorOverlays geoError={geoError} schoolsError={schoolsError} edustopError={edustopError} />
          </div>
          <div className="hidden lg:flex flex-col gap-6">
            <div className="rounded-3xl bg-white p-6 shadow ring-1 ring-black/5">
              <h2 className="text-lg font-semibold text-slate-700">{greetingMessage}</h2>
              {user ? null : (
                <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-sm text-sky-700">
                  <LogIn className="size-4" />
                  <span>Zaloguj się, aby odkrywać i odblokowywać szkoły w swojej okolicy.</span>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-4">
                <CalendarWidget
                  upcomingDay={upcomingDay}
                  activeYear={activeYear}
                  todayTitle={todayTitle}
                  isLoading={isWidgetLoading}
                  error={widgetError}
                  onRetry={handleRefreshCalendar}
                  onOpen={handleOpenCalendar}
                  className="w-full"
                  userVoivodeship={userVoivodeship}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-500">Polubione szkoły</span>
                    <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <Heart className="size-4 text-rose-500" />
                      {likedSchools.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-500">Odblokowane szkoły</span>
                    <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <Sparkles className="size-4 text-amber-500" />
                      {unlockedSchools.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-500">Miejsce w rankingu</span>
                    <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <BarChart3 className="size-4 text-sky-500" />
                      {user?.ranking ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-500">Szkoły w pobliżu</span>
                    <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <School className="size-4 text-emerald-500" />
                      {schools.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow ring-1 ring-black/5">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-700">Najbliższe szkoły</h2>
                <p className="text-sm text-slate-500">Kliknij, aby zobaczyć profil szkoły.</p>
              </div>
              {nearestSchools.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Brak szkół do wyświetlenia. Włącz lokalizację lub odśwież mapę.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {nearestSchools.map((school, index) => {
                    const isUnlocked = unlockedSchoolIds.has(school._id);
                    const isLiked = likedSchoolIds.has(school._id);
                    return (
                      <li key={`${school._id}-${index}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedSchoolId(school._id)}
                          className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-100"
                        >
                          <div>
                            <p className="font-semibold text-slate-700">{school.name}</p>
                            {typeof school.distanceMeters === "number" && (
                              <p className="text-xs text-slate-500">
                                {Math.round(school.distanceMeters)} m od Twojej pozycji
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            {isLiked ? <Heart className="size-4 text-rose-500" /> : null}
                            {isUnlocked ? <Sparkles className="size-4 text-amber-500" /> : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 px-4 lg:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-center">
          <div className="flex items-center gap-3 rounded-full bg-white/95 px-5 py-3 shadow-xl ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => openMobilePanel("greeting")}
              aria-pressed={activeMobilePanel === "greeting"}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-sky-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                activeMobilePanel === "greeting" ? "bg-sky-100" : "bg-sky-50 hover:bg-sky-100"
              }`}
            >
              <Info className="size-5" />
              <span className="sr-only">Powitanie</span>
            </button>
            <button
              type="button"
              onClick={() => openMobilePanel("schools")}
              aria-pressed={activeMobilePanel === "schools"}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-emerald-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                activeMobilePanel === "schools" ? "bg-emerald-100" : "bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              <School className="size-5" />
              <span className="sr-only">Najbliższe szkoły</span>
            </button>
            <button
              type="button"
              onClick={() => openMobilePanel("stats")}
              aria-pressed={activeMobilePanel === "stats"}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-amber-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                activeMobilePanel === "stats" ? "bg-amber-100" : "bg-amber-50 hover:bg-amber-100"
              }`}
            >
              <BarChart3 className="size-5" />
              <span className="sr-only">Statystyki</span>
            </button>
          </div>
        </div>
      </div>

      {activeMobilePanel && mobilePanelContent ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-sm lg:hidden">
          <button type="button" className="flex-1" aria-label="Zamknij panel" onClick={closeMobilePanel} />
          <div className="relative rounded-t-3xl bg-white px-5 pb-6 pt-5 shadow-[0_-18px_36px_-16px_rgba(15,23,42,0.45)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-700">{mobilePanelTitles[activeMobilePanel]}</h3>
              <button
                type="button"
                onClick={closeMobilePanel}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Zamknij panel"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4">{mobilePanelContent}</div>
          </div>
        </div>
      ) : null}

      <EdustopTaskModal
        open={isTaskModalOpen}
        edustop={selectedEduStop || proximityEduStop}
        task={activeTask}
        isLoadingTask={isRequestingTask}
        isSubmitting={isVerifyingTask}
        error={taskRequestError}
        feedback={taskFeedback}
        onSubmit={handleSubmitTaskAnswers}
        onClose={handleCloseTaskModal}
        onRetry={handleRetryTaskRequest}
        onLoadNextTask={handleLoadNextTask}
      />

      <CalendarModal
        open={isCalendarOpen}
        onClose={handleCloseCalendar}
        days={modalDays}
        activeYear={activeYear}
        isLoading={isCalendarLoading}
        error={calendarError}
        onRefresh={handleRefreshCalendar}
        highlightVoivodeship={userVoivodeship}
      />

      <SchoolModal
        school={selectedSchool}
        onClose={() => setSelectedSchoolId(null)}
        onUnlock={handleManualUnlock}
        onLike={handleLike}
        onUnlike={handleUnlike}
      />
    </AppShell>
  );
};

export default Dashboard;

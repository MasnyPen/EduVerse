import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BarChart3, Clock3, Heart, Info, LogIn, School, Sparkles, X } from "lucide-react";
import AppShell from "../components/AppShell";
import Loader from "../components/Loader";
import Map3DScene from "../components/Map3DScene";
import SchoolModal from "../components/SchoolModal";
import { getSchoolsWithinRadius } from "../api/schools";
import type { Coordinates, SchoolSummary } from "../types";
import { MAP_DEFAULT_RADIUS_METERS } from "../utils/constants";
import { annotateDistances } from "../utils/distance";
import { getCurrentPosition, watchUserPosition } from "../utils/geolocation";
import { useUserStore, type UserStoreState } from "../store/userStore";

const MAX_LISTED_SCHOOLS = 5;
type MobilePanel = "greeting" | "schools" | "stats";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(true);
  const [isFetchingSchools, setIsFetchingSchools] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel | null>(null);

  const {
    token,
    user,
    hydrateUser,
    refreshLiked,
    refreshUnlocked,
    refreshVisited,
    likedSchools,
    unlockedSchools,
    visitedSchools,
    like,
    unlike,
    unlock,
  } = useUserStore((state: UserStoreState) => ({
    token: state.token,
    user: state.user,
    hydrateUser: state.hydrateUser,
    refreshLiked: state.refreshLiked,
    refreshUnlocked: state.refreshUnlocked,
    refreshVisited: state.refreshVisited,
    likedSchools: state.likedSchools,
    unlockedSchools: state.unlockedSchools,
    visitedSchools: state.visitedSchools,
    like: state.like,
    unlike: state.unlike,
    unlock: state.unlock,
  }));

  const bootstrappedUser = useRef(false);
  const latestPositionRef = useRef<Coordinates | null>(null);
  const isFetchingSchoolsRef = useRef(false);
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
    void refreshLiked();
    void refreshUnlocked();
    void refreshVisited();
  }, [token, hydrateUser, refreshLiked, refreshUnlocked, refreshVisited]);

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
  }, [userPosition, fetchSchools]);

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

  useEffect(() => {
    if (!schoolsError) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setSchoolsError(null);
    }, 15000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [schoolsError]);

  const likedSchoolIds = useMemo(() => new Set(likedSchools.map((entry) => entry.school._id)), [likedSchools]);
  const unlockedSchoolIds = useMemo(() => new Set(unlockedSchools.map((entry) => entry._id)), [unlockedSchools]);

  const selectedSchool = useMemo(
    () => (selectedSchoolId ? schools.find((school) => school._id === selectedSchoolId) ?? null : null),
    [schools, selectedSchoolId]
  );

  const nearestSchools = useMemo(() => {
    if (schools.length === 0) return [] as SchoolSummary[];
    return [...schools]
      .sort((a, b) => (a.distanceMeters ?? Number.POSITIVE_INFINITY) - (b.distanceMeters ?? Number.POSITIVE_INFINITY))
      .slice(0, MAX_LISTED_SCHOOLS);
  }, [schools]);

  const handleAutoUnlock = useCallback(
    async (schoolId: string) => {
      if (!token) {
        return;
      }
      try {
        await unlock(schoolId);
        await refreshUnlocked();
        await refreshVisited();
        setSchools((prev) => prev.map((item) => (item._id === schoolId ? { ...item, unlocked: true } : item)));
      } catch (error) {
        console.error("Automatyczne odblokowanie szkoły nie powiodło się", error);
        throw error;
      }
    },
    [token, unlock, refreshUnlocked, refreshVisited]
  );

  const handleManualUnlock = useCallback(
    async (schoolId: string) => {
      await handleAutoUnlock(schoolId);
    },
    [handleAutoUnlock]
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
    const started = await fetchSchools(coords);
    return started;
  }, [fetchSchools, userPosition]);

  const displayName = (user?.displayName ?? user?.username ?? "Gościu").trim() || "Gościu";
  const greetingMessage = user ? `Witaj ${displayName}!` : `Witaj, ${displayName}!`;
  const isGuest = !user;
  const closeMobilePanel = useCallback(() => {
    setActiveMobilePanel(null);
  }, []);
  const openMobilePanel = useCallback((panel: MobilePanel) => {
    setActiveMobilePanel((current) => (current === panel ? null : panel));
  }, []);
  const handleMobileLogin = useCallback(() => {
    closeMobilePanel();
    navigate("/login");
  }, [closeMobilePanel, navigate]);
  const handleMobileSelectSchool = useCallback(
    (schoolId: string) => {
      setSelectedSchoolId(schoolId);
      closeMobilePanel();
    },
    [closeMobilePanel]
  );
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
                  <p className="text-base font-semibold text-slate-700">{greetingMessage}</p>
                  {isGuest ? (
                    <>
                      <p>
                        Zaloguj się, aby odkrywać i odblokowywać szkoły w swojej okolicy oraz zapisywać ulubione
                        miejsca.
                      </p>
                      <button
                        type="button"
                        onClick={handleMobileLogin}
                        className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <LogIn className="size-4" />
                        <span>Zaloguj się</span>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p>Miło Cię widzieć, {displayName}. Kontynuuj eksplorację EduVerse!</p>
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">
                          <span className="text-slate-500">Polubione szkoły</span>
                          <span className="font-semibold text-slate-800">{likedSchools.length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">
                          <span className="text-slate-500">Odblokowane szkoły</span>
                          <span className="font-semibold text-slate-800">{unlockedSchools.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                  {nearestSchools.map((school) => {
                    const isUnlockedSchool = unlockedSchoolIds.has(school._id);
                    const isLikedSchool = likedSchoolIds.has(school._id);
                    return (
                      <li key={school._id}>
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
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                    <span className="text-sm font-semibold text-emerald-600">Szkoły</span>
                    <span className="text-lg font-semibold text-slate-800">{schools.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
                    <span className="text-sm font-semibold text-amber-600">Odblokowane</span>
                    <span className="text-lg font-semibold text-slate-800">{unlockedSchoolIds.size}</span>
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
              onAutoUnlock={handleAutoUnlock}
              onScan={handleManualScan}
              isRefreshing={isFetchingSchools}
            />
            {(isLoadingPosition || isFetchingSchools) && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur">
                <Loader />
              </div>
            )}
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

              <div className="mt-6 grid gap-3">
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
                  <span className="text-sm font-medium text-slate-500">Historia wizyt</span>
                  <span className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Clock3 className="size-4 text-sky-500" />
                    {visitedSchools.length}
                  </span>
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
                  {nearestSchools.map((school) => {
                    const isUnlocked = unlockedSchoolIds.has(school._id);
                    const isLiked = likedSchoolIds.has(school._id);
                    return (
                      <li key={school._id}>
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
            <div className="rounded-3xl bg-white p-6 shadow ring-1 ring-black/5">
              <div className="grid grid-cols-1 gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                  <span className="flex items-center gap-2 text-emerald-600">
                    <span className="inline-block rounded-full bg-emerald-500/20 px-2 py-0.5">Szkoły</span>
                  </span>
                  <span className="text-lg text-slate-800">{schools.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
                  <span className="flex items-center gap-2 text-amber-600">
                    <span className="inline-block rounded-full bg-amber-500/20 px-2 py-0.5">Odblokowane</span>
                  </span>
                  <span className="text-lg text-slate-800">{unlockedSchoolIds.size}</span>
                </div>
              </div>
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

      <SchoolModal
        school={selectedSchool}
        onClose={() => setSelectedSchoolId(null)}
        onUnlock={handleManualUnlock}
        onLike={handleLike}
        onUnlike={handleUnlike}
        isLiked={selectedSchool ? likedSchoolIds.has(selectedSchool._id) : false}
        isUnlocked={selectedSchool ? unlockedSchoolIds.has(selectedSchool._id) : false}
        currentUserId={user?._id}
      />
    </AppShell>
  );
};

export default Dashboard;

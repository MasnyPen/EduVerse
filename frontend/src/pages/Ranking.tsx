import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, BarChart3, Coins, Crown, Medal, RefreshCw, Star, Target, Trophy, Users } from "lucide-react";
import AppShell from "../components/AppShell";
import Loader from "../components/Loader";
import { fetchUserRanking } from "../api/users";
import { useUserStore, type UserStoreState } from "../store/userStore";
import type { UserProfile, UserRankingEntry } from "../types";

const PAGE_SIZE = 50;

type RankingRow = UserRankingEntry & { position: number };

const useEnsureUserProfile = (token: string | null, user: UserProfile | null, hydrateUser: () => Promise<void>) => {
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token || user || requestedRef.current) {
      return;
    }
    requestedRef.current = true;
    void hydrateUser();
  }, [token, user, hydrateUser]);
};

interface RankingTableProps {
  rows: RankingRow[];
  viewerId: string | null;
}

type RankingBadge = { Icon: typeof Award; className: string; label: string };

const resolveBadge = (position: number): RankingBadge => {
  if (position === 1) {
    return { Icon: Crown, className: "bg-amber-500/10 text-amber-600", label: "Lider" };
  }
  if (position === 2) {
    return { Icon: Medal, className: "bg-slate-500/10 text-slate-600", label: "Drugie miejsce" };
  }
  if (position === 3) {
    return { Icon: Star, className: "bg-rose-500/10 text-rose-600", label: "Trzecie miejsce" };
  }
  return { Icon: Award, className: "bg-slate-100 text-slate-500", label: "Uczestnik" };
};

const RankingTable = ({ rows, viewerId }: RankingTableProps) => {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Brak osób w rankingu. Spróbuj odświeżyć dane.
      </p>
    );
  }

  return (
    <div className="space-y-2" role="table" aria-label="Ranking użytkowników">
      <div className="hidden grid-cols-[4rem_1fr_auto] gap-4 rounded-xl bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 md:grid">
        <span className="inline-flex items-center gap-2">
          <BarChart3 className="size-4" aria-hidden="true" />
          Pozycja
        </span>
        <span className="inline-flex items-center gap-2">
          <Users className="size-4" aria-hidden="true" />
          Uczestnik
        </span>
        <span className="inline-flex items-center gap-2 justify-self-end">
          <Trophy className="size-4" aria-hidden="true" />
          Punkty
        </span>
      </div>
      <div className="space-y-2" role="rowgroup">
        {rows.map((entry) => {
          const isViewer = viewerId !== null && entry._id === viewerId;
          const badge = resolveBadge(entry.position);

          return (
            <div
              key={entry._id}
              role="row"
              aria-current={isViewer ? "true" : undefined}
              className={`grid grid-cols-1 gap-y-2 rounded-xl border px-4 py-3 text-sm shadow-sm transition md:grid-cols-[4rem_1fr_auto] md:items-center ${
                isViewer
                  ? "border-sky-400 bg-sky-50/80 ring-1 ring-sky-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600 md:text-base" role="cell">
                #{entry.position}
                <span
                  aria-label={badge.label}
                  className={`flex size-7 items-center justify-center rounded-full text-[0]
                    md:size-8 md:text-[0] ${badge.className}`}
                >
                  <badge.Icon className="size-4 md:size-5" aria-hidden="true" />
                </span>
              </span>
              <div role="cell" className="flex flex-col">
                <span className="text-base font-semibold text-slate-800">{entry.username}</span>
                {isViewer ? <span className="text-xs font-medium text-sky-600">To Ty</span> : null}
              </div>
              <span
                role="cell"
                className="flex items-center justify-between text-sm font-semibold text-slate-700 md:justify-end md:text-base"
              >
                <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 md:hidden">
                  <Coins className="size-3" aria-hidden="true" /> Punkty
                </span>
                <span className="inline-flex items-center gap-2">
                  <Coins className="size-4 text-amber-500" aria-hidden="true" />
                  {entry.ranking} pkt
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Ranking = () => {
  const { user, token, hydrateUser, isAuthLoading } = useUserStore((state: UserStoreState) => ({
    user: state.user,
    token: state.token,
    hydrateUser: state.hydrateUser,
    isAuthLoading: state.isAuthLoading,
  }));

  const [ranking, setRanking] = useState<UserRankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEnsureUserProfile(token, user, hydrateUser);

  const loadRanking = useCallback(async (options: { silent?: boolean } = {}) => {
    const isSilent = options.silent === true;
    setError(null);
    setIsRefreshing(isSilent);
    setIsLoading(!isSilent);

    try {
      const data = await fetchUserRanking(0, PAGE_SIZE);
      setRanking(data);
    } catch (err) {
      console.error("Nie udało się pobrać rankingu", err);
      setError("Nie udało się pobrać rankingu. Spróbuj ponownie za chwilę.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  const decoratedRanking = useMemo<RankingRow[]>(
    () => ranking.map((entry, index) => ({ ...entry, position: index + 1 })),
    [ranking]
  );

  const viewerId = user?._id ?? null;

  const viewerEntry = useMemo(
    () => decoratedRanking.find((entry) => entry._id === viewerId) ?? null,
    [decoratedRanking, viewerId]
  );

  const viewerPosition = viewerEntry?.position ?? user?.rankingPosition ?? null;
  const viewerPointsFromProfile = typeof user?.ranking === "number" ? user.ranking : null;
  const viewerIsOutsideVisible = user !== null && viewerEntry === null && viewerPosition !== null;

  const handleRefresh = useCallback(() => {
    void loadRanking({ silent: ranking.length > 0 });
  }, [loadRanking, ranking.length]);

  return (
    <AppShell>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <section className="rounded-3xl bg-white/95 p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
                <Users className="size-6 text-slate-400" aria-hidden="true" />
                Ranking EduVerse
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Target className="size-4 text-slate-400" aria-hidden="true" />
                Lista najlepszych odkrywców i ich aktualne wyniki.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Odśwież ranking
            </button>
          </div>

          {error && !isRefreshing ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>
          ) : null}

          {isLoading ? (
            <div className="mt-12 flex h-40 items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <RankingTable rows={decoratedRanking} viewerId={viewerId} />
              {viewerIsOutsideVisible ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <span>Twoja pozycja:</span>
                  <span className="font-semibold text-slate-700">#{viewerPosition}</span>
                  <span>· Punkty:</span>
                  <span className="font-semibold text-slate-700">{viewerPointsFromProfile ?? "-"}</span>
                  <span className="text-xs font-medium text-slate-400">(poza widoczną listą)</span>
                </div>
              ) : null}
              {isAuthLoading && !user ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Ładowanie danych użytkownika...
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default Ranking;

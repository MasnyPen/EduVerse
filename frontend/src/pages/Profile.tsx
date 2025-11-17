import { useState, useEffect } from "react";
import { Heart, Sparkles, School, Trophy, User, UserCheck, Medal, Settings } from "lucide-react";
import AppShell from "../components/AppShell";
import SchoolModal from "../components/SchoolModal";
import { getSchoolDetails } from "../api/schools";
import { useUserStore, type UserStoreState } from "../store/userStore";
import type { SchoolDetails } from "../types";

const Profile = () => {
  const { user, token, hydrateUser, likedSchools, unlockedSchools, like, unlike, unlock, isAuthLoading } = useUserStore(
    (state: UserStoreState) => ({
      user: state.user,
      token: state.token,
      hydrateUser: state.hydrateUser,
      likedSchools: state.likedSchools,
      unlockedSchools: state.unlockedSchools,
      like: state.like,
      unlike: state.unlike,
      unlock: state.unlock,
      isAuthLoading: state.isAuthLoading,
    })
  );

  const [selectedSchool, setSelectedSchool] = useState<SchoolDetails | null>(null);
  const [schoolNames, setSchoolNames] = useState<Record<string, string>>({});
  const rankingPoints = user?.ranking ?? 0;
  const rankingPosition = user?.rankingPosition;
  const isProfileLoading = isAuthLoading && !user;

  useEffect(() => {
    if (token && !user) {
      hydrateUser();
    }
  }, [token, user, hydrateUser]);

  useEffect(() => {
    if (unlockedSchools.length === 0) {
      setSchoolNames({});
      return;
    }

    const uniqueUnlockedIds = Array.from(new Set(unlockedSchools));
    const fetches = uniqueUnlockedIds.map((id) =>
      getSchoolDetails(id)
        .then((details) => ({ id, name: details.name }))
        .catch((error) => {
          console.warn(`Failed to fetch details for school ${id}`, error);
          return null;
        })
    );

    Promise.all(fetches).then((results) => {
      const names = results.reduce<Record<string, string>>((acc, item) => {
        if (item) {
          acc[item.id] = item.name;
        }
        return acc;
      }, {});
      setSchoolNames(names);
    });
  }, [unlockedSchools]);

  const handleSchoolClick = async (schoolId: string) => {
    if (!unlockedSchools.includes(schoolId)) {
      return;
    }
    try {
      const details = await getSchoolDetails(schoolId);
      setSelectedSchool(details);
    } catch (error) {
      console.error("Failed to fetch school details", error);
    }
  };

  const handleCloseModal = () => setSelectedSchool(null);

  const handleLike = async (schoolId: string) => {
    await like(schoolId);
  };

  const handleUnlike = async (schoolId: string) => {
    await unlike(schoolId);
  };

  const handleUnlock = async (schoolId: string) => {
    await unlock(schoolId);
  };

  return (
    <AppShell>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
              <User className="size-6 text-sky-500" />
              Twój profil
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {user
                ? `Witaj ponownie, ${user.displayName ?? user.username}!`
                : "Zaloguj się, aby zapisać swoje postępy."}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Polubione</span>
                <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-800">
                  <Heart className="size-5 text-rose-500" />
                  {likedSchools.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Odblokowane</span>
                <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-800">
                  <Sparkles className="size-5 text-amber-500" />
                  {unlockedSchools.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Settings className="size-5 text-slate-500" />
              Dane konta
            </h2>
            {user ? (
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <dt className="flex items-center gap-2 font-medium text-slate-500">
                    <User className="size-4" />
                    Nazwa użytkownika
                  </dt>
                  <dd>{user.username}</dd>
                </div>
                {user.displayName ? (
                  <div>
                    <dt className="flex items-center gap-2 font-medium text-slate-500">
                      <UserCheck className="size-4" />
                      Wyświetlana nazwa
                    </dt>
                    <dd>{user.displayName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="flex items-center gap-2 font-medium text-slate-500">
                    <Trophy className="size-4 text-yellow-500" />
                    Punkty
                  </dt>
                  <dd className="flex items-center gap-2">{rankingPoints}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 font-medium text-slate-500">
                    <Medal className="size-4 text-amber-500" />
                    Pozycja w rankingu
                  </dt>
                  <dd className="flex items-center gap-2">
                    {isProfileLoading ? "Ładowanie..." : rankingPosition ? `#${rankingPosition}` : "Brak danych"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Brak danych użytkownika. Zaloguj się, aby zobaczyć swój profil.
              </p>
            )}
          </div>
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Heart className="size-5 text-rose-500" />
              Ostatnio polubione
            </h2>
            {likedSchools.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nie polubiłeś jeszcze żadnej szkoły.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {likedSchools.slice(0, 6).map((entry) => {
                  const isUnlocked = unlockedSchools.includes(entry);
                  return (
                    <li key={entry}>
                      <button
                        onClick={() => handleSchoolClick(entry)}
                        className={`flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left transition ${
                          isUnlocked
                            ? "bg-slate-50 text-slate-700 hover:bg-slate-100"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                        disabled={!isUnlocked}
                      >
                        <School className="size-4 text-slate-500" />
                        <span className="font-semibold">
                          {schoolNames[entry] || (isUnlocked ? "Ładowanie..." : "Odblokuj szkołę, aby zobaczyć")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              Historia odblokowań
            </h2>
            {unlockedSchools.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Brak odblokowanych szkół.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {unlockedSchools.slice(0, 6).map((entry) => (
                  <li key={entry}>
                    <button
                      onClick={() => handleSchoolClick(entry)}
                      className="flex w-full items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 transition"
                    >
                      <School className="size-4 text-slate-500" />
                      <span className="font-semibold">{schoolNames[entry] || "Ładowanie..."}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <SchoolModal
          school={selectedSchool}
          onClose={handleCloseModal}
          onUnlock={handleUnlock}
          onLike={handleLike}
          onUnlike={handleUnlike}
        />
      </div>
    </AppShell>
  );
};

export default Profile;

import { useState, useEffect } from "react";
import { Heart, Sparkles, School } from "lucide-react";
import AppShell from "../components/AppShell";
import SchoolModal from "../components/SchoolModal";
import { getSchoolDetails } from "../api/schools";
import { useUserStore, type UserStoreState } from "../store/userStore";
import type { SchoolDetails } from "../types";

const Profile = () => {
  const { user, token, hydrateUser, likedSchools, unlockedSchools, like, unlike, unlock } = useUserStore(
    (state: UserStoreState) => ({
      user: state.user,
      token: state.token,
      hydrateUser: state.hydrateUser,
      likedSchools: state.likedSchools,
      unlockedSchools: state.unlockedSchools,
      like: state.like,
      unlike: state.unlike,
      unlock: state.unlock,
    })
  );

  const [selectedSchool, setSelectedSchool] = useState<SchoolDetails | null>(null);
  const [schoolNames, setSchoolNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token && !user) {
      hydrateUser();
    }
  }, [token, user, hydrateUser]);

  useEffect(() => {
    const allIds = [...new Set([...likedSchools, ...unlockedSchools])];
    if (allIds.length === 0) return;
    const fetches = allIds.map((id) => getSchoolDetails(id).then((details) => ({ id, name: details.name })));
    Promise.all(fetches)
      .then((results) => {
        const names = results.reduce((acc, { id, name }) => ({ ...acc, [id]: name }), {});
        setSchoolNames(names);
      })
      .catch((error) => {
        console.error("Failed to fetch school names", error);
      });
  }, [likedSchools, unlockedSchools]);

  const handleSchoolClick = async (schoolId: string) => {
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
            <h1 className="text-2xl font-semibold text-slate-800">Twój profil</h1>
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
            <h2 className="text-lg font-semibold text-slate-800">Dane konta</h2>
            {user ? (
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <dt className="font-medium text-slate-500">Nazwa użytkownika</dt>
                  <dd>{user.username}</dd>
                </div>
                {user.displayName ? (
                  <div>
                    <dt className="font-medium text-slate-500">Wyświetlana nazwa</dt>
                    <dd>{user.displayName}</dd>
                  </div>
                ) : null}
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
            <h2 className="text-lg font-semibold text-slate-800">Ostatnio polubione</h2>
            {likedSchools.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nie polubiłeś jeszcze żadnej szkoły.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {likedSchools.slice(0, 6).map((entry) => (
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
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-slate-800">Historia odblokowań</h2>
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
          currentUserId={user?._id}
        />
      </div>
    </AppShell>
  );
};

export default Profile;

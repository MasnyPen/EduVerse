import { useMemo } from "react";
import { Heart, NotebookPen, Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import type { SchoolSummary } from "../types";
import { useUserStore, type UserStoreState } from "../store/userStore";

const formatSchoolName = (school: SchoolSummary) => school.name ?? "Nieznana szkoła";

const Profile = () => {
  const { user, likedSchools, unlockedSchools, visitedSchools } = useUserStore((state: UserStoreState) => ({
    user: state.user,
    likedSchools: state.likedSchools,
    unlockedSchools: state.unlockedSchools,
    visitedSchools: state.visitedSchools,
  }));

  const unlockedById = useMemo(() => new Set(unlockedSchools.map((school) => school._id)), [unlockedSchools]);

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
            <div className="mt-6 grid gap-4 md:grid-cols-3">
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
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Odwiedzone</span>
                <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-800">
                  <NotebookPen className="size-5 text-sky-500" />
                  {visitedSchools.length}
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
                  <li key={entry._id} className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
                    <p className="font-semibold">{formatSchoolName(entry.school)}</p>
                    <p className="text-xs text-slate-500">{new Date(entry.likedAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-slate-800">Historia odblokowań</h2>
            {visitedSchools.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Brak odblokowanych szkół.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {visitedSchools.slice(0, 6).map((entry) => (
                  <li key={entry._id} className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
                    <p className="font-semibold">{formatSchoolName(entry.school)}</p>
                    <p className="text-xs text-slate-500">
                      {unlockedById.has(entry.school._id) ? "Odblokowana" : "Odwiedzona"} •{" "}
                      {new Date(entry.visitedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Profile;

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, LogOut, Map, Menu, Trophy, User, X, Wrench } from "lucide-react";
import { useUserStore, type UserStoreState } from "../store/userStore";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUserStore((state: UserStoreState) => ({
    user: state.user,
    logout: state.logout,
  }));

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  type NavItem = {
    label: string;
    path: string;
    icon: ComponentType<{ className?: string }>;
  };

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: "Mapa 3D", path: "/dashboard", icon: Map },
      { label: "Ranking", path: "/ranking", icon: Trophy },
      { label: "Profil", path: "/profile", icon: User },
      ...(localStorage.getItem("developer") === "true"
        ? [{ label: "Developer", path: "/developer", icon: Wrench }]
        : []),
    ],
    []
  );

  const displayName = (user?.displayName ?? user?.username ?? "Gość").trim() || "Gość";
  const userInitial = displayName.charAt(0).toUpperCase() || "G";

  const handleLogout = () => {
    logout();
    navigate("/dashboard");
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white/90 px-4 shadow-sm backdrop-blur-md sm:px-6">
      <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-sky-600">
        <Compass className="size-6" />
        EduVerse
      </Link>

      <nav className="hidden items-center gap-4 lg:flex">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                active ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-medium text-slate-600 sm:inline">
          {user ? user.displayName ?? user.username : "Gość"}
        </span>

        <button
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-800 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </button>

        {user ? (
          <button
            onClick={handleLogout}
            className="hidden items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 lg:flex"
          >
            <LogOut className="size-4" />
            Wyloguj
          </button>
        ) : null}
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-999 flex items-start justify-center bg-slate-950/30 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent p-0 m-0 border-0"
            aria-label="Zamknij menu"
          />

          <aside className="relative mt-4 w-[90%] max-w-md rounded-3xl bg-white/95 p-6 shadow-2xl ring-1 ring-slate-200 backdrop-blur-xl animate-[fadeInUp_0.25s_ease-out]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-semibold shadow-md">
                  {userInitial}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">{user ? "Zalogowany jako" : "Witaj w EduVerse"}</span>
                  <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-3">
              {navItems.map(({ label, path, icon: Icon }) => {
                const active = location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-medium transition ${
                      active ? "bg-sky-50 text-sky-700 shadow-sm" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`size-5 ${active ? "text-sky-600" : "text-slate-400"}`} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {user ? (
              <button
                onClick={handleLogout}
                className="mt-5 flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <LogOut className="size-5" />
                Wyloguj się
              </button>
            ) : (
              <p className="mt-5 text-center text-sm text-slate-500">Zaloguj się poprzez wyświetlony modal.</p>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">EduVerse • Twoja mapa edukacyjnych odkryć</p>
          </aside>
        </div>
      )}
    </header>
  );
};

export default Navbar;

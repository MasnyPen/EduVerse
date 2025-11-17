import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "./store/userStore";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Developer from "./pages/Developer";
import Ranking from "./pages/Ranking";

const App = () => {
  const hydrateUser = useUserStore((state) => state.hydrateUser);
  const [isDeveloperMode, setIsDeveloperMode] = useState(localStorage.getItem("developer") === "true");

  useEffect(() => {
    hydrateUser();
    if (localStorage.getItem("developer") === null) {
      localStorage.setItem("developer", "false");
    }
  }, [hydrateUser]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "developer") {
        setIsDeveloperMode(e.newValue === "true");
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);

    const handleCustomChange = () => {
      setIsDeveloperMode(localStorage.getItem("developer") === "true");
    };

    globalThis.addEventListener("developerModeChanged", handleCustomChange);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (key === "developer") {
        globalThis.dispatchEvent(new CustomEvent("developerModeChanged"));
      }
    };

    return () => {
      globalThis.removeEventListener("storage", handleStorageChange);
      globalThis.removeEventListener("developerModeChanged", handleCustomChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        {isDeveloperMode && <Route path="/developer" element={<Developer />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

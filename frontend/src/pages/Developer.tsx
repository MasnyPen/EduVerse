import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, Calendar, LogOut, MapPin, Settings } from "lucide-react";
import type { Coordinates } from "../types";

const Developer = () => {
  const navigate = useNavigate();
  const markerRef = useRef<Marker | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerPersistRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [markerPlaced, setMarkerPlaced] = useState<boolean>(false);

  const envVars = import.meta.env as Record<string, string | undefined>;
  const mapStyleUrl = envVars.VITE_MAP_STYLE_URL || "https://demotiles.maplibre.org/style.json";

  useEffect(() => {
    const savedLocationRaw = localStorage.getItem("developerLocation");
    let savedLocation: Coordinates | null = null;
    if (savedLocationRaw) {
      try {
        savedLocation = JSON.parse(savedLocationRaw) as Coordinates;
        setUserLocation(savedLocation);
        setMarkerPlaced(true);
        markerPersistRef.current = true;
      } catch (error) {
        console.warn("Nie udało się odczytać zapisanej lokalizacji developera", error);
        localStorage.removeItem("developerLocation");
      }
    }
    const savedDate = localStorage.getItem("developerDate");
    if (savedDate) {
      setSelectedDate(savedDate);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (markerPersistRef.current) {
            setLocationError(null);
            return;
          }
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setLocationError(null);
          if (mapRef.current) {
            mapRef.current.setCenter([coords.longitude, coords.latitude]);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          let errorMessage = "Nie udało się uzyskać lokalizacji.";
          if (error.code === 1) {
            errorMessage = "Dostęp do lokalizacji został odmówiony. Sprawdź ustawienia przeglądarki.";
          } else if (error.code === 2) {
            errorMessage = "Pozycja niedostępna.";
          } else if (error.code === 3) {
            errorMessage = "Przekroczono czas oczekiwania na lokalizację.";
          }
          setLocationError(errorMessage);
        }
      );
    } else {
      setLocationError("Geolokalizacja nie jest wspierana przez tę przeglądarkę.");
    }

    const mapInstance = new MapLibreMap({
      container: "developer-map",
      style: mapStyleUrl,
      center: [19.9449799, 50.0646501],
      zoom: 10,
    });

    mapRef.current = mapInstance;

    mapInstance.addControl(new NavigationControl());

    if (savedLocation) {
      const initialMarker = new Marker()
        .setLngLat([savedLocation.longitude, savedLocation.latitude])
        .addTo(mapInstance);
      markerRef.current = initialMarker;
      mapInstance.setCenter([savedLocation.longitude, savedLocation.latitude]);
    }

    mapInstance.on("click", (e) => {
      const coords: Coordinates = {
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
      };
      setUserLocation(coords);
      setMarkerPlaced(true);
      markerPersistRef.current = true;
      localStorage.setItem("developerLocation", JSON.stringify(coords));

      if (markerRef.current) {
        markerRef.current.remove();
      }

      const newMarker = new Marker().setLngLat([coords.longitude, coords.latitude]).addTo(mapInstance);
      markerRef.current = newMarker;
    });

    return () => {
      markerRef.current = null;
      mapRef.current = null;
      mapInstance.remove();
    };
  }, [mapStyleUrl]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    localStorage.setItem("developerDate", date);
    globalThis.dispatchEvent(new CustomEvent("developerDateChanged", { detail: date }));
  };

  const toggleDeveloperMode = () => {
    localStorage.removeItem("developerLocation");
    localStorage.removeItem("developerDate");
    localStorage.setItem("developer", "false");
    globalThis.location.reload();
  };

  const retryGeolocation = () => {
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (markerPersistRef.current) {
            setLocationError(null);
            return;
          }
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setLocationError(null);
          if (mapRef.current) {
            mapRef.current.setCenter([coords.longitude, coords.latitude]);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          let errorMessage = "Nie udało się uzyskać lokalizacji.";
          if (error.code === 1) {
            errorMessage = "Dostęp do lokalizacji został odmówiony. Sprawdź ustawienia przeglądarki.";
          } else if (error.code === 2) {
            errorMessage = "Pozycja niedostępna.";
          } else if (error.code === 3) {
            errorMessage = "Przekroczono czas oczekiwania na lokalizację.";
          }
          setLocationError(errorMessage);
        }
      );
    } else {
      setLocationError("Geolokalizacja nie jest wspierana przez tę przeglądarkę.");
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <button
              onClick={() => navigate("/")}
              className="flex size-11 items-center justify-center rounded-full bg-slate-100 transition-colors shadow ring-1 ring-black/5 hover:bg-slate-200 sm:size-12"
              title="Powrót do Dashboard"
            >
              <ArrowLeft className="size-5 text-slate-700 sm:size-6" />
            </button>
            <div className="relative flex items-center justify-center">
              <Settings className="size-10 text-slate-700 sm:size-12" />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold text-slate-700 sm:text-4xl">Developer Mode</h1>
              <p className="text-base text-slate-500 sm:text-lg">Narzędzia dla programistów EduVerse</p>
            </div>
          </div>
          <button
            onClick={toggleDeveloperMode}
            className="inline-flex w-full items-center justify-center rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition-colors shadow ring-1 ring-black/5 hover:bg-rose-600 sm:w-auto md:px-6 md:self-auto"
          >
            <LogOut className="size-5 mr-2 inline" />
            Wyłącz Tryb Deweloperski
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-black/5 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-full bg-sky-500 p-3">
                <MapPin className="size-7 text-white sm:size-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 sm:text-2xl">Ustaw Lokalizację</h2>
            </div>
            <p className="mb-6 text-base leading-relaxed text-slate-600 sm:text-lg">
              Kliknij na mapie, aby ustawić niestandardową lokalizację użytkownika. To zastąpi rzeczywistą
              geolokalizację i pozwoli na testowanie w różnych miejscach.
            </p>
            <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200 sm:h-72 lg:h-80">
              <div id="developer-map" className="w-full h-full"></div>
            </div>
            {markerPlaced && userLocation && (
              <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-emerald-700 font-semibold text-center">
                  ✓ Wybrana lokalizacja: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}
            {locationError && (
              <div className="mt-6 p-4 bg-rose-50 rounded-xl border border-rose-200">
                <p className="text-rose-700 mb-3">{locationError}</p>
                <button
                  onClick={retryGeolocation}
                  className="w-full px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Spróbuj ponownie
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-black/5 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-full bg-amber-500 p-3">
                <Calendar className="size-7 text-white sm:size-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 sm:text-2xl">Ustaw Datę</h2>
            </div>
            <p className="mb-6 text-base leading-relaxed text-slate-600 sm:text-lg">
              Wybierz datę, która będzie traktowana jako "dzisiaj" w aplikacji. To pozwala na testowanie wydarzeń
              kalendarzowych w różnych okresach.
            </p>
            <div className="mb-6">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-lg text-slate-700 transition-colors placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none sm:text-xl"
              />
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="flex items-center justify-center gap-2 text-center text-base font-semibold text-amber-700 sm:text-lg">
                <Calendar className="size-5" />
                Wybrana data:{" "}
                {new Date(selectedDate).toLocaleDateString("pl-PL", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Developer;

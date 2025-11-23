import { Loader2, MapPinPlus, RefreshCcw, Edit, Trash2 } from "lucide-react";
import { Map as MapLibreMap, Marker, NavigationControl, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { createEduStop, searchEduStopsWithinRadius, updateEduStop, deleteEduStop } from "../../api/edustops";
import type { Coordinates, EduStopSummary } from "../../types";
import { haversine } from "../../utils/distance";

const DEFAULT_CENTER: Coordinates = {
  latitude: 50.0646501,
  longitude: 19.9449799,
};

const envVars = import.meta.env as Record<string, string | undefined>;
const MAP_STYLE_URL = envVars.VITE_MAP_STYLE_URL || "https://demotiles.maplibre.org/style.json";

type MarkerRecord = {
  marker: Marker;
  element: HTMLElement;
  data: EduStopSummary;
};

type StatusKind = "success" | "error";

interface StatusMessage {
  type: StatusKind;
  message: string;
}

const createTaskIcon = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  canvas.className = "edustop-task-marker";

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(64, 64);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  const notebookGeometry = new THREE.BoxGeometry(3, 0.3, 2.25);
  const notebookMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const notebook = new THREE.Mesh(notebookGeometry, notebookMaterial);
  notebook.position.set(0, 0, 0);
  scene.add(notebook);

  const penGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
  const penMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
  const pen = new THREE.Mesh(penGeometry, penMaterial);
  pen.position.set(1.8, 1.5, 0);
  pen.rotation.z = Math.PI / 4;
  scene.add(pen);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  renderer.render(scene, camera);
  return canvas;
};

const computeRadiusKm = (map: MapLibreMap | null): number => {
  if (!map) {
    return 200;
  }
  try {
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const edge = bounds.getNorthEast();
    const radiusMeters = haversine(
      { latitude: center.lat, longitude: center.lng },
      { latitude: edge.lat, longitude: edge.lng }
    );
    return Math.max(radiusMeters / 1000, 5);
  } catch (error) {
    console.warn("Nie udało się obliczyć promienia mapy", error);
    return 200;
  }
};

const EdustopManagerMap = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerStoreRef = useRef<Map<string, MarkerRecord>>(new Map());
  const pendingMarkerRef = useRef<Marker | null>(null);
  const [edustops, setEdustops] = useState<EduStopSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCoords, setFormCoords] = useState<Coordinates | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCoords, setEditingCoords] = useState<Coordinates | null>(null);
  const [editingError, setEditingError] = useState<string | null>(null);

  const placePendingMarker = useCallback((coords: Coordinates) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.remove();
      pendingMarkerRef.current = null;
    }

    const element = document.createElement("div");
    element.className = "edustop-manager__pending-marker";
    const pulse = document.createElement("span");
    pulse.className = "edustop-manager__pending-marker-pulse";
    element.appendChild(pulse);

    const marker = new Marker({ element, anchor: "bottom" }).setLngLat([coords.longitude, coords.latitude]).addTo(map);

    pendingMarkerRef.current = marker;
  }, []);

  const hidePendingMarker = useCallback(() => {
    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.remove();
      pendingMarkerRef.current = null;
    }
  }, []);

  const syncMarkers = useCallback((items: EduStopSummary[]) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const active = new Set<string>();
    for (const stop of items) {
      active.add(stop._id);
      const existing = markerStoreRef.current.get(stop._id);
      if (existing) {
        existing.marker.remove();
        markerStoreRef.current.delete(stop._id);
      }

      const element = createTaskIcon();

      const marker = new Marker({ element, anchor: "bottom" })
        .setLngLat([stop.coordinates.longitude, stop.coordinates.latitude])
        .addTo(map);

      markerStoreRef.current.set(stop._id, { marker, element, data: stop });
    }

    for (const [id, record] of markerStoreRef.current.entries()) {
      if (!active.has(id)) {
        record.marker.remove();
        markerStoreRef.current.delete(id);
      }
    }
  }, []);

  const fetchEdustops = useCallback(
    async (options?: { silent?: boolean }) => {
      const map = mapRef.current;
      const center = map ? { latitude: map.getCenter().lat, longitude: map.getCenter().lng } : { ...DEFAULT_CENTER };
      const radiusKm = map ? Math.min(computeRadiusKm(map), 2000) : 500;

      if (options?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const stops = await searchEduStopsWithinRadius({
          latitude: center.latitude,
          longitude: center.longitude,
          radiusKm,
        });
        setEdustops(stops);
        syncMarkers(stops);
        setStatus(null);
      } catch (error) {
        console.error("Nie udało się pobrać Edustopów", error);
        setStatus({ type: "error", message: "Nie udało się pobrać listy Edustopów." });
      } finally {
        if (options?.silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [syncMarkers]
  );

  const initializeMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const instance = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
      zoom: 12,
      pitch: 0,
    });

    instance.addControl(new NavigationControl(), "top-right");

    instance.on("load", () => {
      void fetchEdustops();
    });

    instance.on("moveend", () => {
      void fetchEdustops({ silent: true });
    });

    instance.on("click", (event: MapMouseEvent) => {
      const coords: Coordinates = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };
      placePendingMarker(coords);
      setFormCoords(coords);
      setFormName("");
      setFormError(null);
    });

    mapRef.current = instance;
  }, [fetchEdustops, placePendingMarker]);

  useEffect(() => {
    initializeMap();
    const markerStore = markerStoreRef.current;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      for (const marker of markerStore.values()) {
        marker.marker.remove();
      }
      markerStore.clear();
      hidePendingMarker();
    };
  }, [hidePendingMarker, initializeMap]);

  const handleSubmit = useCallback(async () => {
    if (!formCoords) {
      return;
    }
    const trimmed = formName.trim();
    if (trimmed.length < 3) {
      setFormError("Nazwa musi mieć co najmniej 3 znaki.");
      return;
    }
    try {
      await createEduStop({
        name: trimmed,
        latitude: formCoords.latitude,
        longitude: formCoords.longitude,
      });
      setStatus({ type: "success", message: "Edustop został zapisany." });
      setFormCoords(null);
      setFormName("");
      hidePendingMarker();
      await fetchEdustops();
    } catch (error) {
      console.error("Nie udało się stworzyć Edustopa", error);
      setFormError("Nie udało się zapisać Edustopa. Spróbuj ponownie.");
    }
  }, [fetchEdustops, formCoords, formName, hidePendingMarker]);

  const handleCancel = useCallback(() => {
    setFormCoords(null);
    setFormName("");
    setFormError(null);
    hidePendingMarker();
  }, [hidePendingMarker]);

  const handleEdit = useCallback((stop: EduStopSummary) => {
    setEditingId(stop._id);
    setEditingName(stop.name);
    setEditingCoords(stop.coordinates);
    setEditingError(null);
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editingId || !editingCoords) {
      return;
    }
    const trimmed = editingName.trim();
    if (trimmed.length < 3) {
      setEditingError("Nazwa musi mieć co najmniej 3 znaki.");
      return;
    }
    try {
      await updateEduStop(editingId, {
        name: trimmed,
        latitude: editingCoords.latitude,
        longitude: editingCoords.longitude,
      });
      setStatus({ type: "success", message: "Edustop został zaktualizowany." });
      setEditingId(null);
      setEditingName("");
      setEditingCoords(null);
      await fetchEdustops();
    } catch (error) {
      console.error("Nie udało się zaktualizować Edustopa", error);
      setEditingError("Nie udało się zaktualizować Edustopa. Spróbuj ponownie.");
    }
  }, [editingId, editingCoords, editingName, fetchEdustops]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingName("");
    setEditingCoords(null);
    setEditingError(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Czy na pewno chcesz usunąć ten Edustop?")) {
        return;
      }
      try {
        await deleteEduStop(id);
        setStatus({ type: "success", message: "Edustop został usunięty." });
        await fetchEdustops();
      } catch (error) {
        console.error("Nie udało się usunąć Edustopa", error);
        setStatus({ type: "error", message: "Nie udało się usunąć Edustopa." });
      }
    },
    [fetchEdustops]
  );

  const headerLabel = useMemo(() => {
    if (isLoading && edustops.length === 0) {
      return "Ładuję mapę...";
    }
    if (edustops.length === 0) {
      return "Brak Edustopów w tym obszarze";
    }
    return `Widocznych Edustopów: ${edustops.length}`;
  }, [edustops.length, isLoading]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-800">Panel Edustopów</p>
          <h3 className="text-2xl font-bold text-slate-800">Zarządzaj i dodawaj Edustopy</h3>
          <p className="text-sm text-slate-500">Kliknij na mapie, aby utworzyć nowy punkt i przypisać mu nazwę.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow ring-1 ring-black/5 transition hover:bg-slate-800"
          onClick={() => fetchEdustops()}
          disabled={isLoading}
        >
          <RefreshCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Odśwież
        </button>
      </div>

      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-slate-200">
        <div ref={containerRef} className="h-full w-full" aria-label="Mapa Edustopów" />
        {(isLoading || isRefreshing) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/75">
            <Loader2 className="size-8 animate-spin text-slate-500" />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {headerLabel}
      </div>

      {status ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      {formCoords ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MapPinPlus className="size-5 text-sky-500" />
            <h4 className="text-base font-semibold text-slate-700">Nowy Edustop</h4>
          </div>
          <p className="text-sm text-slate-500">
            Pozycja: {formCoords.latitude.toFixed(5)}, {formCoords.longitude.toFixed(5)}
          </p>
          <label className="mt-3 block text-sm font-medium text-slate-600" htmlFor="edustop-name">
            Nazwa Edustopa
          </label>
          <input
            id="edustop-name"
            type="text"
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            placeholder="np. Punkt zadań przy rynku"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none"
          />
          {formError ? <p className="mt-2 text-sm text-rose-600">{formError}</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-white shadow hover:bg-sky-500"
              onClick={handleSubmit}
            >
              Zapisz
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
              onClick={handleCancel}
            >
              Anuluj
            </button>
          </div>
        </div>
      ) : null}

      {editingId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Edit className="size-5 text-amber-500" />
            <h4 className="text-base font-semibold text-slate-700">Edytuj Edustop</h4>
          </div>
          {editingCoords && (
            <p className="text-sm text-slate-500">
              Pozycja: {editingCoords.latitude.toFixed(5)}, {editingCoords.longitude.toFixed(5)}
            </p>
          )}
          <label className="mt-3 block text-sm font-medium text-slate-600" htmlFor="edit-edustop-name">
            Nazwa Edustopa
          </label>
          <input
            id="edit-edustop-name"
            type="text"
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            placeholder="np. Punkt zadań przy rynku"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none"
          />
          {editingError ? <p className="mt-2 text-sm text-rose-600">{editingError}</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-white shadow hover:bg-amber-500"
              onClick={handleEditSubmit}
            >
              Zaktualizuj
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
              onClick={handleEditCancel}
            >
              Anuluj
            </button>
          </div>
        </div>
      ) : null}

      {edustops.length > 0 ? (
        <div className="space-y-2">
          <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ostatnio pobrane</h5>
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {edustops.slice(0, 8).map((stop) => (
              <li key={stop._id} className="rounded-2xl border border-slate-100 bg-white px-4 py-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{stop.name}</p>
                    <p className="text-xs text-slate-500">
                      {stop.coordinates.latitude.toFixed(4)}, {stop.coordinates.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(stop)}
                      className="p-1 text-slate-500 hover:text-sky-500 transition-colors"
                      title="Edytuj"
                    >
                      <Edit className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(stop._id)}
                      className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                      title="Usuń"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default EdustopManagerMap;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type LayerSpecification,
  type StyleSpecification,
} from "maplibre-gl";
import { Box } from "lucide-react";
import * as THREE from "three";
import type { Coordinates, EduStopSummary, SchoolSummary } from "../types";
import { MAP_DEFAULT_ZOOM } from "../utils/constants";
import { haversine } from "../utils/distance";
import { watchUserPosition } from "../utils/geolocation";
import { Scan3DAnimation } from "./Scan3DAnimation";

interface Map3DSceneProps {
  userPosition: Coordinates | null;
  schools: SchoolSummary[];
  onSelectSchool: (school: SchoolSummary) => void;
  unlockedSchoolIds: Set<string>;
  likedSchoolIds: Set<string>;
  onScan?: () => Promise<boolean | void> | boolean | void;
  isRefreshing?: boolean;
  edustops?: EduStopSummary[];
  onSelectEduStop?: (stop: EduStopSummary) => void;
}

type MarkerRecord = {
  marker: Marker;
  element: HTMLButtonElement;
  logoEl: HTMLImageElement;
  school: SchoolSummary;
};

type EdustopMarkerRecord = {
  marker: Marker;
  element: HTMLElement;
  edustop: EduStopSummary;
};

type MarkerVisualState = {
  isUnlocked: boolean;
  isLiked: boolean;
};

const DEFAULT_CENTER: Coordinates = {
  latitude: 50.0646501,
  longitude: 19.9449799,
};
const BUILDINGS_LAYER_ID = "eduverse-buildings";
const BUILDINGS_SOURCE_ID = "eduverse-buildings-source";
const INITIAL_PITCH = 58;
const INITIAL_BEARING = -24;
const INTERACTION_RELEASE_DELAY = 1400;
const SCAN_ANIMATION_DURATION_MS = 5200;
const SCAN_COOLDOWN_MS = 60_000;

const envVars = import.meta.env as Record<string, string | undefined>;
const VECTOR_STYLE_URL = (envVars.VITE_MAP_STYLE_URL ?? "").trim();
const VECTOR_TILESET_URL =
  (envVars.VITE_VECTOR_TILESET_URL ?? "").trim() || "https://demotiles.maplibre.org/tiles/tiles.json";
const RASTER_TILE_URLS = (() => {
  const parsed = (envVars.VITE_RASTER_TILE_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  return parsed.length > 0
    ? parsed
    : [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ];
})();

const FALLBACK_RASTER_STYLE = createRasterStyle(RASTER_TILE_URLS);

const createFallbackLogo = (name: string): string => {
  const size = 120;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 54px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initial = name.trim().charAt(0).toUpperCase() || "E";
  ctx.fillText(initial, size / 2, size / 2);

  return canvas.toDataURL("image/png");
};

const computeMarkerScale = (distanceMeters: number | null, isUnlocked: boolean): number => {
  const base = distanceMeters == null ? 1 : Math.max(0.65, Math.min(1.85, 1.45 - distanceMeters / 450));
  return isUnlocked ? base * 1.12 : base;
};

const applyMarkerVisualState = (
  element: HTMLButtonElement,
  { isUnlocked, isLiked, justUnlocked }: { isUnlocked: boolean; isLiked: boolean; justUnlocked: boolean }
) => {
  element.classList.toggle("eduverse-marker--unlocked", isUnlocked);
  element.classList.toggle("eduverse-marker--liked", isLiked);
  if (justUnlocked && typeof globalThis !== "undefined") {
    element.classList.add("eduverse-marker--just-unlocked");
    globalThis.setTimeout(() => {
      element.classList.remove("eduverse-marker--just-unlocked");
    }, 950);
  }
};

function createRasterStyle(tileUrls: string[]): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "eduverse-raster": {
        type: "raster",
        tiles: tileUrls,
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "eduverse-raster-base",
        type: "raster",
        source: "eduverse-raster",
        paint: {
          "raster-fade-duration": 0,
        },
      },
    ],
  } satisfies StyleSpecification;
}

export const Map3DScene = ({
  userPosition,
  schools,
  onSelectSchool,
  unlockedSchoolIds,
  likedSchoolIds,
  onScan,
  isRefreshing = false,
  edustops = [],
  onSelectEduStop,
}: Map3DSceneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerStoreRef = useRef<Map<string, MarkerRecord>>(new Map());
  const edustopMarkerStoreRef = useRef<Map<string, EdustopMarkerRecord>>(new Map());
  const markerStateRef = useRef<Map<string, MarkerVisualState>>(new Map());
  const logoCacheRef = useRef<Map<string, string>>(new Map());
  const userMarkerRef = useRef<Marker | null>(null);
  const userPositionRef = useRef<Coordinates | null>(null);
  const hasCenteredRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const fallbackAppliedRef = useRef(VECTOR_STYLE_URL.length === 0);
  const scanTimeoutRef = useRef<number | null>(null);
  const scanStartRef = useRef<number | null>(null);
  const componentMountedRef = useRef(true);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [internalPosition, setInternalPosition] = useState<Coordinates | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [isScanActive, setIsScanActive] = useState(false);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const cubeParticleIds = useMemo(() => Array.from({ length: 6 }, (_, index) => index), []);

  const livePosition = userPosition ?? internalPosition;

  const buildingSourceUrl = useMemo(() => VECTOR_TILESET_URL, []);

  const unlockKey = useMemo(
    () =>
      Array.from(unlockedSchoolIds)
        .sort((a, b) => a.localeCompare(b))
        .join("|"),
    [unlockedSchoolIds]
  );
  const likedKey = useMemo(
    () =>
      Array.from(likedSchoolIds)
        .sort((a, b) => a.localeCompare(b))
        .join("|"),
    [likedSchoolIds]
  );

  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      if (scanTimeoutRef.current) {
        globalThis.clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      scanStartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (lastScanTimestamp == null) {
      setCooldownRemainingMs(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, SCAN_COOLDOWN_MS - (Date.now() - lastScanTimestamp));
      setCooldownRemainingMs(remaining);
    };

    update();
    const id = globalThis.setInterval(update, 500);

    return () => {
      globalThis.clearInterval(id);
    };
  }, [lastScanTimestamp]);

  const finishScanWithMinimumDuration = useCallback((minimumDuration: number = SCAN_ANIMATION_DURATION_MS) => {
    if (scanStartRef.current == null) {
      return;
    }

    const elapsed = Date.now() - scanStartRef.current;
    const remaining = Math.max(0, minimumDuration - elapsed);

    if (scanTimeoutRef.current) {
      globalThis.clearTimeout(scanTimeoutRef.current);
    }

    scanTimeoutRef.current = globalThis.setTimeout(() => {
      scanTimeoutRef.current = null;
      scanStartRef.current = null;
      setIsScanActive(false);
    }, remaining);
  }, []);

  useEffect(() => {
    if (userPosition) {
      setInternalPosition(null);
      setGeolocationError(null);
      return;
    }

    const stopWatching = watchUserPosition(
      (coords) => {
        setInternalPosition(coords);
        setGeolocationError(null);
      },
      (error) => {
        console.error("Błąd geolokalizacji w Map3DScene", error);
        setGeolocationError(error.message ?? "Nie udało się ustalić lokalizacji użytkownika.");
      }
    );

    return () => {
      stopWatching();
    };
  }, [userPosition]);

  const resetMarkerScales = useCallback(() => {
    for (const record of markerStoreRef.current.values()) {
      const state = markerStateRef.current.get(record.school._id);
      const scale = computeMarkerScale(null, Boolean(state?.isUnlocked));
      record.element.style.setProperty("--marker-scale", scale.toFixed(3));
    }
    for (const record of edustopMarkerStoreRef.current.values()) {
      const scale = computeMarkerScale(null, true);
      record.element.style.setProperty("--marker-scale", scale.toFixed(3));
    }
  }, []);

  const updateMarkersForPosition = useCallback((position: Coordinates) => {
    for (const [id, record] of markerStoreRef.current.entries()) {
      const state = markerStateRef.current.get(id);
      const distance = haversine(position, record.school.coordinates);
      const scale = computeMarkerScale(distance, Boolean(state?.isUnlocked));
      record.element.style.setProperty("--marker-scale", scale.toFixed(3));
      record.element.dataset.distanceMeters = distance.toFixed(1);
    }
  }, []);

  const updateEdustopMarkersForPosition = useCallback((position: Coordinates) => {
    for (const record of edustopMarkerStoreRef.current.values()) {
      const distance = haversine(position, record.edustop.coordinates);
      const scale = computeMarkerScale(distance, true);
      record.element.style.setProperty("--marker-scale", scale.toFixed(3));
      record.element.dataset.distanceMeters = distance.toFixed(1);
    }
  }, []);

  const handleManualScan = useCallback(() => {
    if (isScanActive || !livePosition || cooldownRemainingMs > 0) {
      return;
    }

    if (scanTimeoutRef.current) {
      globalThis.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    const now = Date.now();
    scanStartRef.current = now;
    setLastScanTimestamp(now);
    setIsScanActive(true);

    if (!onScan) {
      finishScanWithMinimumDuration(SCAN_ANIMATION_DURATION_MS / 2);
      return;
    }

    Promise.resolve(onScan())
      .then(() => {
        finishScanWithMinimumDuration();
      })
      .catch((error) => {
        console.error("Nie udało się odświeżyć szkół podczas skanowania", error);
        finishScanWithMinimumDuration(SCAN_ANIMATION_DURATION_MS / 2);
      });
  }, [isScanActive, livePosition, cooldownRemainingMs, onScan, finishScanWithMinimumDuration]);

  const syncUserMarker = useCallback((map: MapLibreMap, position: Coordinates) => {
    let marker = userMarkerRef.current;
    const lngLat: [number, number] = [position.longitude, position.latitude];

    if (marker === null) {
      const element = document.createElement("div");
      element.className = "eduverse-user-marker";
      const pulse = document.createElement("span");
      pulse.className = "eduverse-user-marker__pulse";
      element.appendChild(pulse);

      marker = new Marker({ element, anchor: "center" }).setLngLat(lngLat).addTo(map);
      userMarkerRef.current = marker;
    } else {
      marker.setLngLat(lngLat);
    }

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.flyTo({
        center: lngLat,
        zoom: Math.max(MAP_DEFAULT_ZOOM + 1, 16),
        pitch: 65,
        bearing: INITIAL_BEARING,
        duration: 1200,
        essential: true,
      });
    } else if (!isUserInteractingRef.current) {
      map.easeTo({ center: lngLat, duration: 850 });
    }
  }, []);

  const ensureBuildingLayer = useCallback(
    (map: MapLibreMap) => {
      if (map.getLayer(BUILDINGS_LAYER_ID)) {
        return;
      }

      let sourceId: string | null = null;

      if (map.getSource("openmaptiles")) {
        sourceId = "openmaptiles";
      } else {
        if (!map.getSource(BUILDINGS_SOURCE_ID) && buildingSourceUrl) {
          try {
            map.addSource(BUILDINGS_SOURCE_ID, {
              type: "vector",
              url: buildingSourceUrl,
            });
          } catch (error) {
            console.warn("Nie udało się dodać źródła budynków", error);
          }
        }

        if (map.getSource(BUILDINGS_SOURCE_ID)) {
          sourceId = BUILDINGS_SOURCE_ID;
        }
      }

      if (!sourceId) {
        return;
      }

      try {
        const layers = map.getStyle()?.layers as LayerSpecification[] | undefined;
        const beforeLayerId = layers?.find((layer) => {
          if (layer.type !== "symbol") {
            return false;
          }
          const layout = layer.layout as Record<string, unknown> | undefined;
          return typeof layout?.["text-field"] === "string";
        })?.id;

        map.addLayer(
          {
            id: BUILDINGS_LAYER_ID,
            source: sourceId,
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#aaaaaa",
              "fill-extrusion-opacity": 0.7,
              "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                ["get", "height"],
                ["*", ["coalesce", ["get", "building:levels"], 0], 3],
                15,
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                ["get", "min_height"],
                ["*", ["coalesce", ["get", "building:min_level"], 0], 3],
                0,
              ],
              "fill-extrusion-vertical-gradient": true,
            },
          },
          beforeLayerId ?? undefined
        );
      } catch (error) {
        console.warn("Nie udało się dodać warstwy budynków", error);
      }
    },
    [buildingSourceUrl]
  );

  const setMarkerLogo = useCallback((imgEl: HTMLImageElement, school: SchoolSummary) => {
    const cacheKey = `fallback-${school._id}`;
    const cached = logoCacheRef.current.get(cacheKey);
    if (cached) {
      imgEl.src = cached;
      return;
    }

    const fallback = createFallbackLogo(school.name);
    logoCacheRef.current.set(cacheKey, fallback);
    imgEl.src = fallback;
  }, []);

  const createSchoolMarker = useCallback(
    (map: MapLibreMap, school: SchoolSummary, isUnlocked: boolean, isLiked: boolean): MarkerRecord => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "eduverse-marker";
      element.title = school.name;
      element.dataset.schoolId = school._id;
      element.style.setProperty("--marker-scale", computeMarkerScale(null, isUnlocked).toFixed(3));

      const iconWrapper = document.createElement("div");
      iconWrapper.className = "eduverse-marker__icon";
      const halo = document.createElement("span");
      halo.className = "eduverse-marker__halo";
      const logo = document.createElement("img");
      logo.alt = school.name;
      iconWrapper.appendChild(logo);
      element.appendChild(iconWrapper);
      element.appendChild(halo);

      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectSchool(school);
      });

      const marker = new Marker({
        element,
        anchor: "bottom",
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat([school.coordinates.longitude, school.coordinates.latitude])
        .addTo(map);
      setMarkerLogo(logo, school);
      applyMarkerVisualState(element, {
        isUnlocked,
        isLiked,
        justUnlocked: false,
      });

      return { marker, element, logoEl: logo, school };
    },
    [onSelectSchool, setMarkerLogo]
  );

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

  const createEdustopMarker = useCallback(
    (map: MapLibreMap, stop: EduStopSummary): EdustopMarkerRecord => {
      const element = createTaskIcon();
      element.title = stop.name;

      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectEduStop?.(stop);
      });

      const marker = new Marker({
        element,
        anchor: "bottom",
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat([stop.coordinates.longitude, stop.coordinates.latitude])
        .addTo(map);

      return { marker, element, edustop: stop };
    },
    [onSelectEduStop]
  );
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;

    if (!container.offsetHeight) {
      container.style.height = `${window.innerHeight}px`;
    }

    try {
      const map = new MapLibreMap({
        container,
        style: VECTOR_STYLE_URL.length > 0 ? VECTOR_STYLE_URL : FALLBACK_RASTER_STYLE,
        center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
        zoom: MAP_DEFAULT_ZOOM,
        pitch: INITIAL_PITCH,
        bearing: INITIAL_BEARING,
        maxPitch: 85,
      });

      mapRef.current = map;

      map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      map.touchZoomRotate.enable();
      map.touchZoomRotate.enableRotation();

      const handleMapLoad = () => {
        setMapReady(true);
        setMapError(null);
        ensureBuildingLayer(map);

        setTimeout(() => map.resize(), 200);
      };

      const handleStyleData = () => ensureBuildingLayer(map);

      const handleInteractionStart = () => {
        isUserInteractingRef.current = true;
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current);
          interactionTimeoutRef.current = null;
        }
      };

      const handleInteractionEnd = () => {
        if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = globalThis.setTimeout(() => {
          isUserInteractingRef.current = false;
          interactionTimeoutRef.current = null;
        }, INTERACTION_RELEASE_DELAY);
      };

      const handleStyleError = (event: { error?: Error }) => {
        if (fallbackAppliedRef.current || VECTOR_STYLE_URL.length === 0) return;
        console.warn("Błąd stylu MapLibre, przełączam na raster", event.error);
        fallbackAppliedRef.current = true;
        map.setStyle(FALLBACK_RASTER_STYLE);
      };

      map.on("load", handleMapLoad);
      map.on("styledata", handleStyleData);
      map.on("dragstart", handleInteractionStart);
      map.on("dragend", handleInteractionEnd);
      map.on("rotatestart", handleInteractionStart);
      map.on("rotateend", handleInteractionEnd);
      map.on("pitchstart", handleInteractionStart);
      map.on("pitchend", handleInteractionEnd);
      if (VECTOR_STYLE_URL.length > 0) map.on("error", handleStyleError);

      const scheduleResize = () => map.resize();
      const handleResize = () => scheduleResize();

      window.addEventListener("resize", handleResize);
      globalThis.addEventListener("orientationchange", handleResize);
      window.visualViewport?.addEventListener("resize", handleResize);

      const markerStoreForCleanup = markerStoreRef.current;
      const markerStateForCleanup = markerStateRef.current;
      const edustopMarkerStoreForCleanup = edustopMarkerStoreRef.current;
      const userMarkerForCleanup = userMarkerRef.current;

      return () => {
        map.off("load", handleMapLoad);
        map.off("styledata", handleStyleData);
        map.off("dragstart", handleInteractionStart);
        map.off("dragend", handleInteractionEnd);
        map.off("rotatestart", handleInteractionStart);
        map.off("rotateend", handleInteractionEnd);
        map.off("pitchstart", handleInteractionStart);
        map.off("pitchend", handleInteractionEnd);
        if (VECTOR_STYLE_URL.length > 0) map.off("error", handleStyleError);

        map.remove();
        mapRef.current = null;
        setMapReady(false);

        window.removeEventListener("resize", handleResize);
        globalThis.removeEventListener("orientationchange", handleResize);
        window.visualViewport?.removeEventListener("resize", handleResize);

        for (const record of markerStoreForCleanup.values()) {
          record.marker.remove();
        }
        markerStoreForCleanup.clear();
        markerStateForCleanup.clear();
        for (const record of edustopMarkerStoreForCleanup.values()) {
          record.marker.remove();
        }
        edustopMarkerStoreForCleanup.clear();
        if (userMarkerForCleanup) {
          userMarkerForCleanup.remove();
          userMarkerRef.current = null;
        }

        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current);
        }

        fallbackAppliedRef.current = VECTOR_STYLE_URL.length === 0;
        hasCenteredRef.current = false;
      };
    } catch (error) {
      console.error("Nie udało się zainicjować MapLibre GL", error);
      setMapError("Nie udało się uruchomić mapy. Odśwież stronę lub sprawdź połączenie sieciowe.");
    }
  }, [ensureBuildingLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const activeIds = new Set<string>();

    for (const school of schools) {
      activeIds.add(school._id);

      const isUnlocked = unlockedSchoolIds.has(school._id) || Boolean(school.unlocked);
      const isLiked = likedSchoolIds.has(school._id) || Boolean(school.liked);
      const existing = markerStoreRef.current.get(school._id);
      const prevState = markerStateRef.current.get(school._id);

      if (existing) {
        existing.school = school;
        existing.marker.setLngLat([school.coordinates.longitude, school.coordinates.latitude]);
        setMarkerLogo(existing.logoEl, school);
        const justUnlocked = prevState ? isUnlocked && !prevState.isUnlocked : false;
        applyMarkerVisualState(existing.element, {
          isUnlocked,
          isLiked,
          justUnlocked,
        });
      } else {
        const record = createSchoolMarker(map, school, isUnlocked, isLiked);
        markerStoreRef.current.set(school._id, record);
      }

      markerStateRef.current.set(school._id, { isUnlocked, isLiked });
    }

    for (const [id, record] of markerStoreRef.current.entries()) {
      if (!activeIds.has(id)) {
        record.marker.remove();
        markerStoreRef.current.delete(id);
        markerStateRef.current.delete(id);
      }
    }
  }, [schools, likedKey, unlockKey, createSchoolMarker, setMarkerLogo, likedSchoolIds, unlockedSchoolIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const activeIds = new Set<string>();

    for (const stop of edustops) {
      activeIds.add(stop._id);
      const existing = edustopMarkerStoreRef.current.get(stop._id);
      if (existing) {
        existing.edustop = stop;
        existing.marker.setLngLat([stop.coordinates.longitude, stop.coordinates.latitude]);
        const label = existing.element.querySelector<HTMLSpanElement>(".edustop-task-marker__label");
        if (label) {
          label.textContent = stop.name;
        }
      } else {
        const record = createEdustopMarker(map, stop);
        edustopMarkerStoreRef.current.set(stop._id, record);
      }
    }

    for (const [id, record] of edustopMarkerStoreRef.current.entries()) {
      if (!activeIds.has(id)) {
        record.marker.remove();
        edustopMarkerStoreRef.current.delete(id);
      }
    }
  }, [createEdustopMarker, edustops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    userPositionRef.current = livePosition;

    if (!livePosition) {
      resetMarkerScales();
      return;
    }

    syncUserMarker(map, livePosition);
    updateMarkersForPosition(livePosition);
    updateEdustopMarkersForPosition(livePosition);
  }, [
    livePosition,
    mapReady,
    resetMarkerScales,
    syncUserMarker,
    updateMarkersForPosition,
    updateEdustopMarkersForPosition,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || (!livePosition && schools.length === 0)) {
      return;
    }

    if (isUserInteractingRef.current || !hasCenteredRef.current) {
      return;
    }

    const bounds = new LngLatBounds();
    let hasAny = false;

    if (livePosition) {
      bounds.extend([livePosition.longitude, livePosition.latitude]);
      hasAny = true;
    }

    for (const school of schools) {
      bounds.extend([school.coordinates.longitude, school.coordinates.latitude]);
      hasAny = true;
    }

    if (!hasAny) {
      return;
    }

    map.fitBounds(bounds, {
      padding: { top: 120, bottom: 160, left: 140, right: 140 },
      maxZoom: 17,
      duration: 900,
    });
  }, [schools, livePosition, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const win = globalThis.window as (Window & typeof globalThis) | undefined;
    const viewport = win?.visualViewport;
    let frameId: number | null = null;

    const scheduleResize = () => {
      if (frameId !== null) {
        win?.cancelAnimationFrame(frameId);
      }
      frameId =
        win?.requestAnimationFrame(() => {
          if (!componentMountedRef.current || !map) {
            return;
          }
          map.resize();
        }) ?? null;
    };

    scheduleResize();

    const handleResize = () => {
      scheduleResize();
    };

    win?.addEventListener("resize", handleResize);
    win?.addEventListener("orientationchange", handleResize);
    viewport?.addEventListener("resize", handleResize);

    return () => {
      if (frameId !== null && win) {
        win.cancelAnimationFrame(frameId);
      }
      win?.removeEventListener("resize", handleResize);
      win?.removeEventListener("orientationchange", handleResize);
      viewport?.removeEventListener("resize", handleResize);
    };
  }, [mapReady]);

  const isCooldownActive = cooldownRemainingMs > 0;
  const isScanDisabled = !livePosition || isScanActive || isCooldownActive;
  const scanButtonLabel = "Skanowanie okolicy";
  const scanTooltip = livePosition
    ? "Uruchom skanowanie najbliższych szkół"
    : "Oczekiwanie na lokalizację do skanowania";
  const scanButtonCaption = "Skanowanie okolicy";
  const scanCooldownInfo = isCooldownActive
    ? `Następne skanowanie możliwe za ${Math.ceil(cooldownRemainingMs / 1000)} s`
    : "Następne skanowanie możliwe za 0 s";

  return (
    <div className="relative h-full w-full">
      {mapError ? (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-600 sm:rounded-3xl">
          {mapError}
        </div>
      ) : (
        <div ref={containerRef} className="h-full w-full sm:rounded-3xl" />
      )}

      <div className="pointer-events-none absolute inset-0 hidden sm:block sm:rounded-3xl sm:ring-1 sm:ring-black/10" />

      <div className="absolute inset-x-0 bottom-40 z-30 flex flex-col items-center px-4 sm:bottom-20 lg:bottom-12">
        <button
          type="button"
          onClick={handleManualScan}
          disabled={isScanDisabled}
          aria-busy={isScanActive}
          aria-label={scanButtonLabel}
          title={scanTooltip}
          className={`scan-button-3d group mb-6 inline-flex h-24 w-24 items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed ${
            isScanActive ? "scan-button-3d--active" : ""
          }`}
        >
          <span className="scan-button-3d__shadow" aria-hidden />
          <span className="scan-button-3d__glow" aria-hidden />
          <span className="scan-button-3d__beams" aria-hidden />
          <span className="scan-button-3d__cube" aria-hidden>
            <span className="scan-button-3d__cube-face scan-button-3d__cube-face--front">
              <Box className="size-9 drop-shadow-xl" />
              <span>Skan</span>
            </span>
            <span className="scan-button-3d__cube-face scan-button-3d__cube-face--back" />
            <span className="scan-button-3d__cube-face scan-button-3d__cube-face--left" />
            <span className="scan-button-3d__cube-face scan-button-3d__cube-face--right" />
            <span className="scan-button-3d__cube-face scan-button-3d__cube-face--top" />
            <span className="scan-button-3d__cube-face scan-button-3d__cube-face--bottom" />
          </span>
          {cubeParticleIds.map((id) => (
            <span key={id} className={`scan-button-3d__particle scan-button-3d__particle--${id + 1}`} aria-hidden />
          ))}
        </button>
        <span className="text-sm font-semibold uppercase tracking-wide text-white drop-shadow">
          {scanButtonCaption}
        </span>
        <span className="text-sm font-bold uppercase tracking-wide text-white drop-shadow-lg">{scanCooldownInfo}</span>
        {isRefreshing && !isScanActive ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-white drop-shadow">
            Aktualizuję dane...
          </span>
        ) : null}
      </div>

      {isScanActive ? <Scan3DAnimation caption="Analizuję teren" /> : null}

      {geolocationError && !userPosition ? (
        <div className="absolute right-4 top-4 z-20 max-w-xs rounded-2xl bg-amber-100/90 px-4 py-3 text-xs font-semibold text-amber-800 shadow-lg sm:right-6 sm:top-6">
          {geolocationError}
        </div>
      ) : null}
    </div>
  );
};

export default Map3DScene;

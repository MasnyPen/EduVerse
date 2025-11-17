import type { Coordinates } from "../types";

export type PositionListener = (coords: Coordinates) => void;
export type ErrorListener = (error: GeolocationPositionError | Error) => void;

const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000,
};

export const watchUserPosition = (
    listener: PositionListener,
    onError?: ErrorListener,
    options: PositionOptions = defaultOptions
): (() => void) => {
    const isDeveloperMode = localStorage.getItem('developer') === 'true';
    const savedLocation = localStorage.getItem('developerLocation');

    if (isDeveloperMode && savedLocation) {
        const coords = JSON.parse(savedLocation);
        listener(coords);
        return () => {}; 
    }

    if (!("geolocation" in navigator)) {
        onError?.(new Error("Geolokalizacja nie jest wspierana w tej przeglądarce."));
        return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
        (event) => {
            listener({
                latitude: event.coords.latitude,
                longitude: event.coords.longitude,
            });
        },
        (error) => onError?.(error),
        { ...defaultOptions, ...options }
    );

    return () => navigator.geolocation.clearWatch(watchId);
};

export const getCurrentPosition = (options: PositionOptions = defaultOptions): Promise<Coordinates> =>
    new Promise((resolve, reject) => {
        const isDeveloperMode = localStorage.getItem('developer') === 'true';
        const savedLocation = localStorage.getItem('developerLocation');

        if (isDeveloperMode && savedLocation) {
            resolve(JSON.parse(savedLocation));
            return;
        }

        if (!("geolocation" in navigator)) {
            reject(new Error("Geolokalizacja nie jest wspierana w tej przeglądarce."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (event) => {
                resolve({
                    latitude: event.coords.latitude,
                    longitude: event.coords.longitude,
                });
            },
            (error) => reject(error instanceof Error ? error : new Error(error.message ?? "Geolocation error")),
            { ...defaultOptions, ...options }
        );
    });

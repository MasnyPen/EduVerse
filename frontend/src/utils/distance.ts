import type { Coordinates, SchoolSummary } from "../types";

const EARTH_RADIUS_METERS = 6371e3;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversine = (a: Coordinates, b: Coordinates): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
};

export const annotateDistances = (origin: Coordinates, schools: SchoolSummary[]): SchoolSummary[] =>
  schools.map((school) => ({
    ...school,
    distanceMeters: haversine(origin, school.coordinates),
  }));

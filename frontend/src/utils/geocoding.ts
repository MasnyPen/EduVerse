import type { Coordinates } from "../types";

export interface ReverseGeocodeResult {
  full: string | null;
  short: string | null;
}

const cache = new Map<string, ReverseGeocodeResult>();

interface ReverseGeocodeOptions {
  signal?: AbortSignal;
  language?: string;
}

const DEFAULT_LANGUAGE = "pl,en";

const pickLocality = (address?: Record<string, string | undefined>): string | null => {
  if (!address) {
    return null;
  }
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.hamlet ||
    address.city_district ||
    address.state_district ||
    address.county ||
    null
  );
};

const pickStreet = (address?: Record<string, string | undefined>): string | null => {
  if (!address) {
    return null;
  }
  return (
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.cycleway ||
    address.path ||
    address.residential ||
    address.highway ||
    null
  );
};

const pickBuildingIdentifier = (address?: Record<string, string | undefined>): string | null => {
  if (!address) {
    return null;
  }
  const keys = ["house_number", "house", "house_name", "housenumber", "building", "unit", "block", "plot", "lot"];
  for (const key of keys) {
    const value = address[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const buildShortAddress = (address?: Record<string, string | undefined>): string | null => {
  if (!address) {
    return null;
  }
  const locality = pickLocality(address);
  const street = pickStreet(address);
  const buildingNumber = pickBuildingIdentifier(address);

  let streetSegment = "";
  if (street && buildingNumber) {
    streetSegment = `${street} nr ${buildingNumber}`;
  } else if (street) {
    streetSegment = street;
  } else if (buildingNumber) {
    streetSegment = `nr ${buildingNumber}`;
  }

  if (locality && streetSegment.length > 0) {
    return `${locality}, ${streetSegment}`;
  }
  if (locality) {
    return locality;
  }
  if (streetSegment.length > 0) {
    return streetSegment;
  }
  return null;
};

export const reverseGeocode = async (
  coords: Coordinates,
  { signal, language = DEFAULT_LANGUAGE }: ReverseGeocodeOptions = {}
): Promise<ReverseGeocodeResult> => {
  const key = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}|${language}`;
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: coords.latitude.toString(),
    lon: coords.longitude.toString(),
    zoom: "18",
    addressdetails: "1",
    "accept-language": language,
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const payload: { display_name?: string; address?: Record<string, string | undefined> } = await response.json();
  const result: ReverseGeocodeResult = {
    full: payload.display_name?.trim() ?? null,
    short: buildShortAddress(payload.address),
  };
  cache.set(key, result);
  return result;
};

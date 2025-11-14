import api from "./api";
import { fetchCurrentUser } from "./auth";
import type { Opinion, PaginatedOpinions, SchoolDetails, SchoolSummary } from "../types";
import { MAP_DEFAULT_RADIUS_METERS } from "../utils/constants";

type NullableNumeric = number | string | null | undefined;

export interface RadiusSchoolResponseDto {
  id: string;
  name: string;
  banner?: string | null;
  baner?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  coordinates?: {
    latitude?: NullableNumeric;
    longitude?: NullableNumeric;
  } | null;
  latitude?: NullableNumeric;
  longitude?: NullableNumeric;
}

const parseNumeric = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

export const mapRadiusSchoolResponse = (payload: RadiusSchoolResponseDto): SchoolSummary => {
  const coordLatitude = parseNumeric(payload.coordinates?.latitude) ?? parseNumeric(payload.latitude) ?? 0;
  const coordLongitude = parseNumeric(payload.coordinates?.longitude) ?? parseNumeric(payload.longitude) ?? 0;

  const banner = payload.banner ?? payload.baner ?? payload.bannerUrl ?? payload.img ?? undefined;

  return {
    _id: payload._id || payload.id,
    name: payload.name,
    coordinates: {
      latitude: coordLatitude,
      longitude: coordLongitude,
    },
    bannerUrl: banner ?? undefined,
  } satisfies SchoolSummary;
};

export interface RadiusQuery {
  latitude: number;
  longitude: number;
  radius?: number;
}

export const getSchoolsWithinRadius = async (query: RadiusQuery): Promise<SchoolSummary[]> => {
  const { latitude, longitude, radius = MAP_DEFAULT_RADIUS_METERS } = query;
  const safeRadiusKm = Math.max(radius / 1000, 0.1);
  const { data } = await api.post<RadiusSchoolResponseDto[]>(
    "/schools/search",
    {
      latitude,
      longitude,
    },
    {
      params: { r: safeRadiusKm },
    }
  );
  const items = Array.isArray(data) ? data : [];
  const mappedSchools = items.map(mapRadiusSchoolResponse);

  return mappedSchools;
};

export const getSchoolDetails = async (schoolId: string): Promise<SchoolDetails> => {
  const { data } = await api.get<SchoolDetails>(`/schools/${schoolId}`);
  return data;
};

export const getSchoolOpinions = async (schoolId: string, page = 1): Promise<PaginatedOpinions> => {
  type BackendOpinion = {
    _id?: string;
    id?: string;
    userId: { _id: string; username: string };
    content: string;
    stars: number;
    createdAt: string | null;
    updatedAt?: string | null;
  };

  try {
    const { data } = await api.get<BackendOpinion[]>(`/schools/${schoolId}/comments`, {
      params: { page },
    });

    const items = Array.isArray(data) ? data : [];
    const total = items.length;
    const currentPage = page;
    const pageSize = items.length;

    const mappedOpinions = items.map((item) => ({
      _id: item._id || item.id || "",
      userId: item.userId._id,
      userName: item.userId.username,
      content: item.content,
      stars: item.stars,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || undefined,
    }));

    return {
      opinions: mappedOpinions,
      total,
      page: currentPage,
      pageSize,
    } satisfies PaginatedOpinions;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 404) {
      return {
        opinions: [],
        total: 0,
        page: 1,
        pageSize: 0,
      };
    }
    throw error;
  }
};

export const addSchoolOpinion = async (schoolId: string, stars: number, content: string): Promise<Opinion> => {
  type BackendOpinion = {
    _id?: string;
    id?: string;
    userId?: { _id: string; username: string };
    content: string;
    stars: number;
    createdAt: string | null;
    updatedAt?: string | null;
  };

  const { data } = await api.post<BackendOpinion>(`/schools/${schoolId}/comments`, {
    stars,
    content,
  });

  if (!data.userId) {
    const currentUser = await fetchCurrentUser();
    return {
      _id: data._id || data.id || "",
      userId: currentUser._id,
      userName: currentUser.username,
      content: content,
      stars: stars,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || undefined,
    };
  }

  return {
    _id: data._id || data.id || "",
    userId: data.userId._id,
    userName: data.userId.username,
    content: content,
    stars: stars,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || undefined,
  };
};

export const updateSchoolOpinion = async (
  schoolId: string,
  opinionId: string,
  stars: number,
  content: string,
  userId: string
): Promise<Opinion> => {
  type BackendOpinion = {
    _id?: string;
    id?: string;
    userId?: { _id: string; username: string };
    content: string;
    stars: number;
    createdAt: string | null;
    updatedAt?: string | null;
  };

  const { data } = await api.put<BackendOpinion>(`/schools/${schoolId}/comments/${opinionId}`, {
    stars,
    content,
    userId,
  });

  if (!data.userId) {
    const currentUser = await fetchCurrentUser();
    return {
      _id: data._id || data.id || "",
      userId: currentUser._id,
      userName: currentUser.username,
      content: content,
      stars: stars,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || undefined,
    };
  }

  return {
    _id: data._id || data.id || "",
    userId: data.userId._id,
    userName: data.userId.username,
    content: content,
    stars: stars,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || undefined,
  };
};

export const deleteSchoolOpinion = async (schoolId: string, opinionId: string): Promise<void> => {
  await api.delete(`/schools/${schoolId}/comments/${opinionId}`);
};

export const likeSchool = async (schoolId: string): Promise<void> => {
  await api.post(`/schools/${schoolId}/likes`);
};

export const unlikeSchool = async (schoolId: string): Promise<void> => {
  await api.delete(`/schools/${schoolId}/likes`);
};

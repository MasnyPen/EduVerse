import api from "./api";
import type {
  Coordinates,
  EduStopSummary,
  EduStopTaskAnswerPayload,
  EduStopTaskPayload,
  EduStopTaskVerificationResult,
} from "../types";

interface EduStopResponseDto {
  _id?: string;
  id?: string;
  name: string;
  latitude?: number | string;
  longitude?: number | string;
}

const parseCoordinate = (value: number | string | undefined): number => {
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

const randomId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

const mapEduStopResponse = (payload: EduStopResponseDto): EduStopSummary => ({
  _id: payload._id ?? payload.id ?? randomId(),
  name: payload.name,
  coordinates: {
    latitude: parseCoordinate(payload.latitude),
    longitude: parseCoordinate(payload.longitude),
  },
});

export interface SearchEduStopsQuery extends Coordinates {
  radiusKm?: number;
}

export const searchEduStopsWithinRadius = async (payload: SearchEduStopsQuery): Promise<EduStopSummary[]> => {
  const { latitude, longitude, radiusKm = 50 } = payload;
  const safeRadius = Math.max(radiusKm, 1);

  const { data } = await api.post<EduStopResponseDto[]>(
    "/edustops/search",
    { latitude, longitude },
    { params: { r: safeRadius } }
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapEduStopResponse);
};

export interface CreateEduStopPayload extends Coordinates {
  name: string;
}

export const createEduStop = async (payload: CreateEduStopPayload): Promise<void> => {
  await api.post("/edustops", payload);
};

export const getEduStop = async (id: string): Promise<EduStopSummary> => {
  const { data } = await api.get<EduStopResponseDto>(`/edustops/${id}`);
  return mapEduStopResponse(data);
};

export const updateEduStop = async (id: string, payload: Partial<CreateEduStopPayload>): Promise<void> => {
  await api.put(`/edustops/${id}`, payload);
};

export const deleteEduStop = async (id: string): Promise<void> => {
  await api.delete(`/edustops/${id}`);
};

export const requestEduStopTask = async (eduStopId: string): Promise<EduStopTaskPayload> => {
  const { data } = await api.get<EduStopTaskPayload>(`/tasks/${eduStopId}/request`);
  return data;
};

export const verifyEduStopTask = async (
  accessToken: string,
  answers: EduStopTaskAnswerPayload[]
): Promise<EduStopTaskVerificationResult> => {
  const { data } = await api.post<EduStopTaskVerificationResult>("/tasks/verify", answers, {
    params: { accessToken },
  });
  return data;
};

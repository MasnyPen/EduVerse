import api from "./api";
import type { Opinion, PaginatedOpinions, SchoolDetails, SchoolSummary } from "../types";

export interface RadiusQuery {
    latitude: number;
    longitude: number;
    radius?: number;
}

export const getSchoolsWithinRadius = async (query: RadiusQuery): Promise<SchoolSummary[]> => {
    const { latitude, longitude, radius = 3000 } = query;
    const { data } = await api.get<SchoolSummary[]>("/schools/radiusSchools", {
        params: {
            lat: latitude,
            lon: longitude,
            radius,
        },
    });
    return data;
};

export const getSchoolDetails = async (schoolId: string): Promise<SchoolDetails> => {
    const { data } = await api.get<SchoolDetails>(`/schools/${schoolId}`);
    return data;
};

export const getSchoolOpinions = async (schoolId: string, page = 1): Promise<PaginatedOpinions> => {
    const { data } = await api.get<PaginatedOpinions>(`/schools/${schoolId}/opinions`, {
        params: { page },
    });
    return data;
};

export const addSchoolOpinion = async (schoolId: string, message: string): Promise<Opinion> => {
    const { data } = await api.post<Opinion>(`/schools/${schoolId}/opinions`, {
        message,
    });
    return data;
};

export const updateSchoolOpinion = async (schoolId: string, opinionId: string, message: string): Promise<Opinion> => {
    const { data } = await api.put<Opinion>(`/schools/${schoolId}/opinions/${opinionId}`, {
        message,
    });
    return data;
};

export const deleteSchoolOpinion = async (schoolId: string, opinionId: string): Promise<void> => {
    await api.delete(`/schools/${schoolId}/opinions/${opinionId}`);
};

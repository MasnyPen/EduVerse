import api from "./api";
import type { LikeEntry, SchoolHistoryEntry, SchoolSummary } from "../types";

export const unlockSchool = async (schoolId: string): Promise<SchoolHistoryEntry> => {
    const { data } = await api.post<SchoolHistoryEntry>("/user/schoolshistory", {
        schoolId,
    });
    return data;
};

export const getSchoolHistory = async (): Promise<SchoolHistoryEntry[]> => {
    const { data } = await api.get<SchoolHistoryEntry[]>("/user/schoolshistory");
    return data;
};

export const likeSchool = async (schoolId: string): Promise<LikeEntry> => {
    const { data } = await api.post<LikeEntry>("/user/likedschools", {
        schoolId,
    });
    return data;
};

export const unlikeSchool = async (schoolId: string): Promise<void> => {
    await api.delete(`/user/likedschools/${schoolId}`);
};

export const getLikedSchools = async (): Promise<LikeEntry[]> => {
    const { data } = await api.get<LikeEntry[]>("/user/likedschools");
    return data;
};

export const syncUnlockedSchools = async (): Promise<SchoolSummary[]> => {
    const { data } = await api.get<SchoolSummary[]>("/user/unlocked");
    return data;
};

import api from "./api";
import type { UserRankingEntry } from "../types";

interface UserDetails {
  userId: string;
  username: string;
  likes?: string[];
  schoolsHistory?: string[];
}

export const getLikedSchools = async (): Promise<string[]> => {
  const { data } = await api.get<UserDetails>("/users/profile");
  return data.likes || [];
};

export const getUnlockedSchools = async (): Promise<string[]> => {
  const { data } = await api.get<UserDetails>("/users/profile");
  return data.schoolsHistory || [];
};

export const unlockSchool = async (schoolId: string, latitude: number, longitude: number): Promise<void> => {
  await api.post("/users/unlockschool", {
    schoolId,
    latitude,
    longitude,
  });
};

export const fetchUserRanking = async (page = 0, size = 50): Promise<UserRankingEntry[]> => {
  const { data } = await api.get<UserRankingEntry[]>("/users/ranking", {
    params: {
      page,
      size,
    },
  });
  return data ?? [];
};

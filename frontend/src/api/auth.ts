import api, { authTokenStorage } from "./api";
import type { AuthPayload, AuthSession, RegisterPayload, UserProfile } from "../types";

interface LoginResponseDto {
  access_token: string;
}

interface RegisterResponseDto {
  message: string;
}

const fetchProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get<UserProfile>("/auth/profile");
  return data;
};

const buildSession = async (token: string): Promise<AuthSession> => {
  authTokenStorage.set(token);
  const user = await fetchProfile();
  return { token, user };
};

export const login = async (payload: AuthPayload): Promise<AuthSession> => {
  const { data } = await api.post<LoginResponseDto>("/auth/login", payload);
  return buildSession(data.access_token);
};

export const register = async (payload: RegisterPayload): Promise<AuthSession> => {
  await api.post<RegisterResponseDto>("/auth/register", payload);
  return login(payload);
};

export const fetchCurrentUser = async (): Promise<UserProfile> => fetchProfile();

export const logout = () => authTokenStorage.clear();

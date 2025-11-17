import { isAxiosError } from "axios";
import { create } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import type { StoreApi } from "zustand";
import { fetchCurrentUser, login as loginRequest, register as registerRequest } from "../api/auth";
import { authTokenStorage } from "../api/api";
import { unlockSchool } from "../api/users";
import { likeSchool, unlikeSchool } from "../api/schools";
import { getCurrentPosition } from "../utils/geolocation";
import type { AuthPayload, AuthSession, RegisterPayload, UserProfile } from "../types";

export interface UserStoreState {
  user: UserProfile | null;
  token: string | null;
  isAuthLoading: boolean;
  authError?: string;
  likedSchools: string[];
  unlockedSchools: string[];
  setAuthData: (payload: AuthSession) => void;
  login: (credentials: AuthPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  hydrateUser: () => Promise<void>;
  like: (schoolId: string) => Promise<void>;
  unlike: (schoolId: string) => Promise<void>;
  unlock: (schoolId: string) => Promise<void>;
  logout: () => void;
  handleUnauthorized: () => void;
}

const defaultSlices = {
  isAuthLoading: false,
  authError: undefined as string | undefined,
};

type PersistedState = Pick<UserStoreState, "token">;

type StoreSet = StoreApi<UserStoreState>["setState"];
type StoreGet = StoreApi<UserStoreState>["getState"];

const resolveErrorMessage = (error: unknown): string | undefined => {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const payload = error.response?.data;
    if (Array.isArray(payload?.message)) {
      return payload?.message[0];
    }
    if (typeof payload?.message === "string") {
      return payload.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return undefined;
};

const storeCreator = (set: StoreSet, get: StoreGet): UserStoreState => ({
  user: null,
  token: authTokenStorage.get(),
  likedSchools: [],
  unlockedSchools: [],
  ...defaultSlices,
  setAuthData: (payload: AuthSession) => {
    authTokenStorage.set(payload.token);
    set({
      token: payload.token,
      user: payload.user,
      likedSchools: payload.user.likes || [],
      unlockedSchools: payload.user.schoolsHistory || [],
      authError: undefined,
    });
  },
  login: async (credentials: AuthPayload) => {
    set({ isAuthLoading: true, authError: undefined });
    try {
      const session = await loginRequest(credentials);
      set({ token: session.token, user: session.user });
    } catch (error) {
      const message = resolveErrorMessage(error) ?? "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.";
      set({ authError: message });
      throw error;
    } finally {
      set({ isAuthLoading: false });
    }
  },
  register: async (payload: RegisterPayload) => {
    set({ isAuthLoading: true, authError: undefined });
    try {
      const session = await registerRequest(payload);
      set({ token: session.token, user: session.user });
    } catch (error) {
      const message = resolveErrorMessage(error) ?? "Rejestracja nie powiodła się. Spróbuj ponownie.";
      set({ authError: message });
      throw error;
    } finally {
      set({ isAuthLoading: false });
    }
  },
  hydrateUser: async () => {
    const currentToken = get().token ?? authTokenStorage.get();
    if (!currentToken) return;
    set({ isAuthLoading: true });
    try {
      const profile = await fetchCurrentUser();
      set({
        user: profile,
        likedSchools: profile.likes || [],
        unlockedSchools: profile.schoolsHistory || [],
      });
    } catch (error) {
      console.error("Nie udało się pobrać profilu użytkownika", error);
      set({ token: null, user: null });
      authTokenStorage.clear();
    } finally {
      set({ isAuthLoading: false });
    }
  },
  like: async (schoolId: string) => {
    try {
      await likeSchool(schoolId);
      set((state) => ({
        likedSchools: state.likedSchools.includes(schoolId) ? state.likedSchools : [...state.likedSchools, schoolId],
      }));
    } catch (error) {
      console.error("Failed to like school", error);
      throw error;
    }
  },
  unlike: async (schoolId: string) => {
    try {
      await unlikeSchool(schoolId);
      set((state) => ({
        likedSchools: state.likedSchools.filter((id) => id !== schoolId),
      }));
    } catch (error) {
      console.error("Failed to unlike school", error);
      throw error;
    }
  },
  unlock: async (schoolId: string) => {
    try {
      const position = await getCurrentPosition();
      await unlockSchool(schoolId, position.latitude, position.longitude);
      set((state) => ({
        unlockedSchools: state.unlockedSchools.includes(schoolId)
          ? state.unlockedSchools
          : [...state.unlockedSchools, schoolId],
      }));
    } catch (error) {
      console.error("Failed to unlock school", error);
      throw error;
    }
  },
  logout: () => {
    authTokenStorage.clear();
    set({
      user: null,
      token: null,
      likedSchools: [],
      unlockedSchools: [],
      ...defaultSlices,
    });
  },
  handleUnauthorized: () => {
    authTokenStorage.clear();
    set({
      user: null,
      token: null,
      likedSchools: [],
      unlockedSchools: [],
      ...defaultSlices,
    });
  },
});

const persistOptions: PersistOptions<UserStoreState, PersistedState> = {
  name: "eduverse-user-store",
  partialize: (state: UserStoreState) => ({
    token: state.token,
  }),
};

export const useUserStore = create<UserStoreState>()(persist(storeCreator, persistOptions));

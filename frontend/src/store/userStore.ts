import { isAxiosError } from "axios";
import { create } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import type { StoreApi } from "zustand";
import { fetchCurrentUser, login as loginRequest, register as registerRequest } from "../api/auth";
import { authTokenStorage } from "../api/api";
import type { AuthPayload, AuthSession, RegisterPayload, UserProfile } from "../types";

export interface UserStoreState {
  user: UserProfile | null;
  token: string | null;
  isAuthLoading: boolean;
  authError?: string;
  likedSchools: any[];
  unlockedSchools: any[];
  visitedSchools: any[];
  setAuthData: (payload: AuthSession) => void;
  login: (credentials: AuthPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  hydrateUser: () => Promise<void>;
  refreshLiked: () => Promise<void>;
  refreshUnlocked: () => Promise<void>;
  refreshVisited: () => Promise<void>;
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

type PersistedState = Pick<UserStoreState, "token" | "user">;

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
  visitedSchools: [],
  ...defaultSlices,
  setAuthData: (payload: AuthSession) => {
    authTokenStorage.set(payload.token);
    set({ token: payload.token, user: payload.user, authError: undefined });
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
    if (get().user) return;
    set({ isAuthLoading: true });
    try {
      const profile = await fetchCurrentUser();
      set({ user: profile });
    } catch (error) {
      console.error("Nie udało się pobrać profilu użytkownika", error);
      set({ token: null, user: null });
      authTokenStorage.clear();
    } finally {
      set({ isAuthLoading: false });
    }
  },
  refreshLiked: async () => {
    console.warn("NOT IMPLEMENTED");
    throw new Error("NOT IMPLEMENTED");
  },
  refreshUnlocked: async () => {
    console.warn("NOT IMPLEMENTED");
    throw new Error("NOT IMPLEMENTED");
  },
  refreshVisited: async () => {
    console.warn("NOT IMPLEMENTED");
    throw new Error("NOT IMPLEMENTED");
  },
  like: async () => {
    console.warn("NOT IMPLEMENTED");
    throw new Error("NOT IMPLEMENTED");
  },
  unlike: async () => {
    console.warn("NOT IMPLEMENTED");
    throw new Error("NOT IMPLEMENTED");
  },
  unlock: async () => {
    console.warn("NOT IMPLEMENTED");
    throw new Error("NOT IMPLEMENTED");
  },
  logout: () => {
    authTokenStorage.clear();
    set({
      user: null,
      token: null,
      likedSchools: [],
      unlockedSchools: [],
      visitedSchools: [],
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
      visitedSchools: [],
      ...defaultSlices,
    });
  },
});

const persistOptions: PersistOptions<UserStoreState, PersistedState> = {
  name: "eduverse-user-store",
  partialize: (state: UserStoreState) => ({
    token: state.token,
    user: state.user,
  }),
};

export const useUserStore = create<UserStoreState>()(persist(storeCreator, persistOptions));

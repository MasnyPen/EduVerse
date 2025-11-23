import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { AUTH_TOKEN_KEY } from "../utils/constants";

const resolveBaseUrl = () => {
  return import.meta.env.VITE_API_URL ?? "http://localhost:3000";
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: false,
});

type TokenListener = (token: string | null) => void;

let tokenListener: TokenListener | null = null;

export const setTokenListener = (listener: TokenListener | null) => {
  tokenListener = listener;
};

const getStoredToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Unable to read auth token from storage", error);
    return null;
  }
};

const persistToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    tokenListener?.(token);
  } catch (error) {
    console.error("Unable to persist auth token", error);
  }
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const isDeveloperMode = localStorage.getItem("developer") === "true";
  const customDate = localStorage.getItem("developerDate");
  if (isDeveloperMode && customDate) {
    config.headers = config.headers ?? {};
    config.headers["x-custom-date"] = customDate;
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      persistToken(null);
    }
    return Promise.reject(error);
  }
);

export const authTokenStorage = {
  set: (token: string | null) => persistToken(token),
  get: () => getStoredToken(),
  clear: () => persistToken(null),
};

export default api;

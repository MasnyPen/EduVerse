import api from "./api";
import type { Calendar } from "../types";

export const getTodayCalendarTitle = async (): Promise<string> => {
  const { data } = await api.get<string>("/calendar/today");
  return data;
};

export const getCalendarByYear = async (year: number): Promise<Calendar> => {
  const { data } = await api.get<Calendar>(`/calendar/${year}`);
  return data;
};

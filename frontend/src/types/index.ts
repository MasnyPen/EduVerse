export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SchoolSummary {
  _id: string;
  name: string;
  shortDescription?: string;
  coordinates: Coordinates;
  bannerUrl?: string;
  profile?: string;
  tags?: string[];
  unlocked?: boolean;
  liked?: boolean;
  distanceMeters?: number;
}

export interface SchoolDetails extends SchoolSummary {
  description?: string;
  website?: string;
  address?: string;
  examStats?: Record<string, string | number>;
  likes: number;
  profiles?: {
    name: string;
    type: number;
    tags: string[];
    extensions: string[];
    extensionsOpt: string[];
    img?: string;
  }[];
  results?: {
    polish?: number;
    math?: number;
    aliens?: number;
  };
  url?: string;
  paid?: boolean;
}

export interface Opinion {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  stars: number;
  createdAt: string;
  updatedAt?: string;
  liked: boolean;
  likes: number;
}

export interface PaginatedOpinions {
  opinions: Opinion[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthPayload {
  username: string;
  password: string;
}

export type RegisterPayload = AuthPayload;

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  _id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  likes?: string[];
  schoolsHistory?: string[];
}

export interface CalendarDate {
  dates: string[];
  title: string;
  perms: string[];
}

export interface Calendar {
  _id: string;
  year: number;
  dates: CalendarDate[];
}

export interface CalendarTimeSlot {
  id: string;
  label: string;
  raw: string;
  start?: string;
  end?: string;
  startIso?: string;
  endIso?: string;
  durationMinutes?: number | null;
}

export interface CalendarDaySchedule {
  isoDate: string;
  title: string;
  displayDate: string;
  timestamp: number;
  isToday: boolean;
  isPast: boolean;
  slots: CalendarTimeSlot[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EduStopSummary {
  _id: string;
  name: string;
  coordinates: Coordinates;
}

export interface EduStopTaskOption {
  key: string;
  text: string;
}

interface UnknownEduStopTaskTypeBrand {
  readonly __edustopTaskTypeBrand?: never;
}

export type EduStopTaskQuestionType =
  | "OPEN"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | (string & UnknownEduStopTaskTypeBrand);

export interface EduStopTaskQuestion {
  questionId: string;
  content: string;
  type?: EduStopTaskQuestionType;
  options?: EduStopTaskOption[];
  answers?: string[];
  _class?: string;
}

export interface EduStopTaskContent {
  subject: string;
  title: string;
  description: string;
  questions: EduStopTaskQuestion[];
}

export interface EduStopTaskPayload {
  taskId: string;
  content: EduStopTaskContent;
  accessToken: string;
  tokenTTLMinutes: number;
}

export interface EduStopTaskAnswerPayload {
  questionId: string;
  answers: string[];
}

export interface EduStopTaskVerificationResult {
  verified: boolean;
  eduStopId: string;
  taskId: string;
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
  error?: string;
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
  ranking?: number;
  rankingPosition?: number;
}

export interface UserRankingEntry {
  _id: string;
  username: string;
  ranking: number;
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
  availableYears?: number[];
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
  voivodeships?: string[] | null;
  hasAllVoivodeships?: boolean;
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

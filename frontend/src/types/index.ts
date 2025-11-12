export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SchoolSummary {
  _id: string;
  name: string;
  shortDescription?: string;
  location: Coordinates;
  bannerUrl?: string;
  logoUrl?: string;
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
}

export interface Opinion {
  _id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
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
}

export interface SchoolHistoryEntry {
  _id: string;
  school: SchoolSummary;
  visitedAt: string;
}

export interface LikeEntry {
  _id: string;
  school: SchoolSummary;
  likedAt: string;
}

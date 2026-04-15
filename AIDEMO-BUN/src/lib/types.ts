export interface Drama {
  title: string;
  year: string | number;
  sweetness: number;
  tags: string[];
  reason?: string;
  rating?: number;
  platform?: string;
  episodes?: number;
  genre?: string[];
  description?: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionStore {
  sessions: SessionMeta[];
  activeSessionId: string;
}

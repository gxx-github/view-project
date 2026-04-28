/**
 * 服务端数据库操作（仅用于 API Routes）
 * 客户端代码不能 import 此文件
 */
import { eq, desc } from "drizzle-orm";
import { getDB } from "./db";
import { sessions, messages, favorites } from "./db/schema";
import type { SessionMeta } from "./types";

export function dbGetSessions() {
  const db = getDB();
  const all = db.select().from(sessions).orderBy(desc(sessions.updatedAt)).all();
  return {
    sessions: all.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.getTime(),
      updatedAt: s.updatedAt.getTime(),
    })),
    activeSessionId: all[0]?.id ?? "",
  };
}

export function dbCreateSession(id: string, title: string = "新对话"): SessionMeta {
  const db = getDB();
  const now = new Date();
  db.insert(sessions).values({ id, title, createdAt: now, updatedAt: now }).run();
  return { id, title, createdAt: now.getTime(), updatedAt: now.getTime() };
}

export function dbUpdateSession(id: string, data: { title?: string }) {
  const db = getDB();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title) updates.title = data.title;
  db.update(sessions).set(updates).where(eq(sessions.id, id)).run();
}

export function dbDeleteSession(id: string) {
  const db = getDB();
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function dbSaveMessages(sessionId: string, msgs: unknown[]) {
  const db = getDB();
  db.delete(messages).where(eq(messages.sessionId, sessionId)).run();
  for (const msg of msgs as Array<{ id: string; role: string; parts: unknown }>) {
    db.insert(messages).values({
      id: msg.id,
      sessionId,
      role: msg.role as "user" | "assistant" | "system",
      partsJson: JSON.stringify(msg.parts),
      createdAt: new Date(),
    }).run();
  }
}

export function dbGetMessages(sessionId: string): unknown[] {
  const db = getDB();
  const rows = db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.createdAt).all();
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    parts: JSON.parse(r.partsJson),
  }));
}

export function dbGetFavorites(sessionId: string) {
  const db = getDB();
  return db.select().from(favorites).where(eq(favorites.sessionId, sessionId)).orderBy(desc(favorites.createdAt)).all();
}

export function dbAddFavorite(data: { sessionId: string; tmdbId?: number; title: string; posterUrl?: string; year?: string; rating?: number }) {
  const db = getDB();
  db.insert(favorites).values({
    sessionId: data.sessionId,
    tmdbId: data.tmdbId,
    title: data.title,
    posterUrl: data.posterUrl,
    year: data.year,
    rating: data.rating,
    createdAt: new Date(),
  }).run();
}

export function dbRemoveFavorite(id: string) {
  const db = getDB();
  db.delete(favorites).where(eq(favorites.id, id)).run();
}

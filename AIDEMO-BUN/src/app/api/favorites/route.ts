import { dbGetFavorites, dbAddFavorite, dbRemoveFavorite } from "@/lib/storage.server";
import { NextResponse } from "next/server";

/** GET /api/favorites?sessionId=xxx */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const favs = dbGetFavorites(sessionId);
  return NextResponse.json(favs);
}

/** POST /api/favorites — body: { sessionId, title, posterUrl?, tmdbId?, year?, rating? } */
export async function POST(req: Request) {
  const body = await req.json();
  if (!body.sessionId || !body.title) {
    return NextResponse.json({ error: "sessionId and title required" }, { status: 400 });
  }
  dbAddFavorite(body);
  return NextResponse.json({ ok: true });
}

/** DELETE /api/favorites?id=xxx */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  dbRemoveFavorite(id);
  return NextResponse.json({ ok: true });
}

/**
 * TVmaze API 客户端
 * 文档：https://www.tvmaze.com/api
 * 免费，无需 API Key
 */

const TVMAZE_BASE = "https://api.tvmaze.com";

function tvmazeFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TVMAZE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString()).then((r) => {
    if (!r.ok) throw new Error(`TVmaze API error: ${r.status}`);
    return r.json() as Promise<T>;
  });
}

/* ==================== 类型 ==================== */

export interface TVMazeShow {
  id: number;
  name: string;
  url: string;
  image: { medium: string; original: string } | null;
  rating: { average: number | null };
  genres: string[];
  summary: string | null;
  premiered: string | null;
  status: string;
  network: { name: string; country: { code: string; name: string } | null } | null;
  webChannel: { name: string } | null;
  language: string | null;
}

export interface TVMazeShowDetail extends TVMazeShow {
  _embedded?: {
    cast: TVMazeCastMember[];
  };
  _totalEpisodes?: number;
  _totalSeasons?: number;
}

export interface TVMazeCastMember {
  person: {
    id: number;
    name: string;
    image: { medium: string; original: string } | null;
  };
  character: {
    name: string;
    image: { medium: string; original: string } | null;
  };
}

export interface TVMazePerson {
  id: number;
  name: string;
  image: { medium: string; original: string } | null;
  url: string;
}

/* ==================== 辅助方法 ==================== */

/** 从 image 对象获取 URL */
export function getImageURL(
  image: { medium: string; original: string } | null,
  size: "medium" | "original" = "medium"
): string {
  if (!image) return "";
  return size === "original" ? image.original : image.medium;
}

/** 去除 HTML 标签 */
export function stripHtml(html: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/* ==================== API 方法 ==================== */

/** 搜索电视剧 */
export async function searchShows(query: string) {
  return tvmazeFetch<Array<{ score: number; show: TVMazeShow }>>("/search/shows", { q: query });
}

/** 获取电视剧详情（含演员表和集数统计） */
export async function getShowDetails(showId: number) {
  const [show, episodes] = await Promise.all([
    tvmazeFetch<TVMazeShowDetail>(`/shows/${showId}`, { "embed[]": "cast" }),
    tvmazeFetch<Array<{ season: number }>>(`/shows/${showId}/episodes`).catch(() => []),
  ]);

  const seasons = new Set(episodes.map((e) => e.season).filter((s) => s > 0));
  show._totalEpisodes = episodes.length;
  show._totalSeasons = seasons.size;

  return show;
}

/** 搜索演员 */
export async function searchPeople(query: string) {
  return tvmazeFetch<Array<{ score: number; person: TVMazePerson }>>("/search/people", { q: query });
}

/** 获取演员参演作品 */
export async function getPersonCredits(personId: number) {
  return tvmazeFetch<Array<{ _embedded: { show: TVMazeShow } }>>(
    `/people/${personId}/castcredits`,
    { embed: "show" }
  );
}

/** 获取节目单（热播榜代理） */
export async function getSchedule(date?: string) {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  return tvmazeFetch<Array<{ show: TVMazeShow; name: string; season: number; number: number; airdate: string }>>(
    "/schedule", params
  );
}

/* ==================== Genre 映射（中文 → 英文搜索词） ==================== */

export const GENRE_SEARCH_TERMS: Record<string, string> = {
  爱情: "romance",
  喜剧: "comedy",
  动作: "action",
  悬疑: "mystery",
  科幻: "sci-fi",
  古装: "historical drama",
  家庭: "family",
  动画: "anime",
  犯罪: "crime",
  剧情: "drama",
  历史: "history",
  音乐: "music",
  恐怖: "horror",
};

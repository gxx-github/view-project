/**
 * TMDB (The Movie Database) API 客户端
 * 文档：https://developer.themoviedb.org/docs
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const apiKey = () => process.env.TMDB_API_KEY ?? "";

function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("language", "zh-CN");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return fetch(url.toString()).then((r) => {
    if (!r.ok) throw new Error(`TMDB API error: ${r.status}`);
    return r.json();
  });
}

/* ==================== 类型 ==================== */

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  origin_country: string[];
}

export interface TMDBTVDetail extends TMDBTVShow {
  number_of_episodes: number;
  number_of_seasons: number;
  status: string;
  genres: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string }[];
  credits?: {
    cast: TMDBCast[];
  };
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBPerson {
  id: number;
  name: string;
  known_for_department: string;
  known_for: {
    id: number;
    name?: string;
    title?: string;
    poster_path: string | null;
    vote_average: number;
    first_air_date?: string;
    release_date?: string;
    media_type: string;
  }[];
}

/* ==================== 图片 URL ==================== */

export function getImageURL(path: string | null, size: string = "w342"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/* ==================== API 方法 ==================== */

/** 搜索电视剧 */
export async function searchTV(query: string, options?: { year?: number; page?: number }) {
  const params: Record<string, string> = { query };
  if (options?.year) params.first_air_date_year = String(options.year);
  if (options?.page) params.page = String(options.page);
  const data = await tmdbFetch("/search/tv", params);
  return data.results as TMDBTVShow[];
}

/** 获取电视剧详情 */
export async function getTVDetails(tvId: number) {
  const data = await tmdbFetch(`/tv/${tvId}`);
  return data as TMDBTVDetail;
}

/** 获取电视剧演员表 */
export async function getTVCredits(tvId: number) {
  const data = await tmdbFetch(`/tv/${tvId}/credits`);
  return data.cast as TMDBCast[];
}

/** 获取热播榜 */
export async function getTrendingTV(timeWindow: "day" | "week" = "week", page: number = 1) {
  const data = await tmdbFetch(`/trending/tv/${timeWindow}`, { page: String(page) });
  return data.results as TMDBTVShow[];
}

/** 获取推荐（基于某部剧） */
export async function getTVRecommendations(tvId: number, page: number = 1) {
  const data = await tmdbFetch(`/tv/${tvId}/recommendations`, { page: String(page) });
  return data.results as TMDBTVShow[];
}

/** 搜索演员 */
export async function searchPerson(query: string) {
  const data = await tmdbFetch("/search/person", { query });
  return data.results as TMDBPerson[];
}

/** 按条件发现电视剧 */
export async function discoverTV(options: {
  with_genres?: string;
  with_origin_country?: string;
  sort_by?: string;
  "first_air_date.gte"?: string;
  "vote_average.gte"?: string;
  page?: number;
}) {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(options)) {
    if (v !== undefined) params[k] = String(v);
  }
  const data = await tmdbFetch("/discover/tv", params);
  return data.results as TMDBTVShow[];
}

/* ==================== Genre 映射 ==================== */

export const GENRE_MAP: Record<string, number> = {
  爱情: 10749,
  喜剧: 35,
  动作: 28,
  悬疑: 9648,
  科幻: 878,
  古装: 36,
  家庭: 10751,
  动画: 16,
  犯罪: 80,
  剧情: 18,
  历史: 36,
  音乐: 10402,
  恐怖: 27,
};

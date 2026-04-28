import { tool, zodSchema } from "ai";
import { z } from "zod";
import { searchPeople, getPersonCredits, getImageURL } from "@/lib/tvmaze";

/**
 * 按演员搜索作品工具（基于 TVmaze API）
 */
export const tmdbGetByActor = tool({
  description: "按演员名字搜索其参演的电视剧/电影。当用户问'某演员的剧'、'某演员演过什么'时使用。",
  inputSchema: zodSchema(
    z.object({
      actorName: z.string().describe("演员名字，支持中文名"),
    })
  ),
  execute: async ({ actorName }) => {
    const persons = await searchPeople(actorName);

    if (persons.length === 0) {
      return { actor: actorName, works: [] };
    }

    const person = persons[0].person;

    // 获取参演作品
    const credits = await getPersonCredits(person.id).catch(() => []);

    const works = credits
      .map((c) => {
        const show = c._embedded?.show;
        if (!show) return null;
        return {
          id: show.id,
          title: show.name,
          rating: show.rating.average ? Math.round(show.rating.average * 10) / 10 : 0,
          year: show.premiered?.slice(0, 4) ?? "",
          posterUrl: getImageURL(show.image),
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .filter((w) => w.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);

    return {
      actor: person.name,
      department: "Acting",
      works,
    };
  },
});

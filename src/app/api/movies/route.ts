import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type MovieQuery = {
  familySafe?: boolean;
  source?: string;
};

type MovieDoc = {
  _id?: unknown;
  title?: string;
  source?: string;
  link?: string | null;
  poster?: string | null;
  poster_path?: string | null;
  familySafe?: boolean;
  tags?: string[];
  genres?: string[];
  customRating?: string;
  notes?: string;
  overview?: string;
  description?: string;
  release_date?: string;
};

type OutputMovie = {
  _id?: unknown;
  title: string;
  source: string;
  link: string;
  poster: string;
  poster_path: string;
  overview: string;
  description: string;
  release_date: string;
  familySafe: boolean;
  tags: string[];
  genres: string[];
  customRating: string;
};

const BAD_TITLE_PATTERNS = [
  /^watch$/i,
  /^trailer$/i,
  /^join now$/i,
  /^save now$/i,
  /^journal$/i,
  /^kids ark club$/i,
  /^pure flix$/i,
  /annual plan/i,
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  animals: [
    "animal",
    "animals",
    "dog",
    "dogs",
    "cat",
    "cats",
    "horse",
    "horses",
    "lion",
    "lions",
    "bear",
    "bears",
    "wildlife",
    "zoo",
    "farm",
    "pet",
    "pets",
  ],

  sports: [
    "sports",
    "football",
    "baseball",
    "basketball",
    "soccer",
    "tennis",
    "golf",
    "boxing",
    "wrestling",
    "racing",
    "swimming",
    "runner",
    "track",
    "rodeo",
  ],

  christian: [
    "christian",
    "faith",
    "bible",
    "jesus",
    "church",
    "gospel",
    "prayer",
    "ministry",
    "pastor",
    "missionary",
  ],

  preschool: [
    "preschool",
    "toddler",
    "learning",
    "alphabet",
    "numbers",
    "school",
    "playground",
    "nursery",
  ],

  childrens: [
    "children",
    "kids",
    "family",
    "adventure",
    "animated",
    "magic",
  ],

  fantasy: [
    "fantasy",
    "magic",
    "wizard",
    "dragon",
    "castle",
    "kingdom",
  ],

  mystery: [
    "mystery",
    "detective",
    "investigation",
    "secret",
    "clue",
    "missing",
    "case",
  ],

  realpeople: [
    "biography",
    "family",
    "drama",
    "true",
    "people",
    "life",
  ],
};

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map(v => v.trim()).filter(Boolean);
}

function isBadTitle(title?: string) {
  if (!title) return true;
  return BAD_TITLE_PATTERNS.some(p => p.test(title));
}

function sourceRank(source?: string) {
  const s = String(source || "").toLowerCase();

  if (s === "christian_db") return 0;
  if (s === "christiancinema") return 1;
  if (s === "fishflix") return 2;
  if (s === "pureflix") return 3;
  return 4;
}

function keywordScore(text: string, words: string[]) {
  const t = text.toLowerCase();
  let score = 0;

  for (const w of words) {
    if (t.includes(w)) score++;
  }

  return score;
}

function movieMatchesAliases(movie: MovieDoc, aliases: string[]) {
  const text =
    `${movie.title || ""} ${movie.notes || ""} ${movie.overview || ""} ${movie.description || ""} ${
      movie.tags?.join(" ") || ""
    } ${movie.genres?.join(" ") || ""}`.toLowerCase();

  return keywordScore(text, aliases);
}

function movieMatchesSearch(movie: MovieDoc, search: string) {
  if (!search) return true;

  const q = search.toLowerCase();

  const text =
    `${movie.title || ""} ${movie.notes || ""} ${movie.overview || ""} ${movie.description || ""} ${
      movie.tags?.join(" ") || ""
    } ${movie.genres?.join(" ") || ""}`.toLowerCase();

  return text.includes(q);
}

function ratingAllowed(
  rating: string | undefined,
  gOnly: boolean
) {
  const r = String(rating || "").toUpperCase();

  if (!gOnly) return true;

  return r === "G";
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function normalizeMovie(movie: MovieDoc): OutputMovie {
  return {
    _id: movie._id,
    title: movie.title || "",
    source: movie.source || "mongo",
    link: movie.link || "",
    poster: movie.poster || movie.poster_path || "",
    poster_path: movie.poster_path || movie.poster || "",
    overview: movie.overview || movie.description || "",
    description: movie.description || movie.overview || "",
    release_date: movie.release_date || "",
    familySafe: movie.familySafe ?? false,
    tags: movie.tags || [],
    genres: movie.genres || [],
    customRating: movie.customRating || "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const source = searchParams.get("source") || "";
    const limit = Number(searchParams.get("limit") || 8);
    const family = searchParams.get("family") === "true";
    const gOnly = searchParams.get("gOnly") === "true";
    const randomize = searchParams.get("randomize") === "true";

    const excludeTitles = parseCsvParam(
      searchParams.get("excludeTitles")
    );

    const excludeIds = parseCsvParam(
      searchParams.get("excludeIds")
    );

    const client = await clientPromise;
    const db = client.db("clearstream");

    const query: MovieQuery = {};

    if (family) {
      query.familySafe = true;
    }

    if (source) {
      query.source = source;
    }

    const docs = await db
      .collection<MovieDoc>("faith_movies")
      .find(query)
      .limit(limit * 200)
      .toArray();

    const aliases = CATEGORY_ALIASES[category] || [];

    let results = docs
      .filter(movie => {
        if (isBadTitle(movie.title)) return false;
        if (excludeTitles.includes(movie.title || "")) return false;
        if (excludeIds.includes(String(movie._id))) return false;
        if (!ratingAllowed(movie.customRating, gOnly)) return false;
        if (!movieMatchesSearch(movie, search)) return false;
        return true;
      })
      .map(movie => ({
        movie,
        score:
          movieMatchesAliases(movie, aliases) +
          (search ? (movieMatchesSearch(movie, search) ? 100 : 0) : 0),
      }))
      .filter(x => {
        if (search) return true;
        return aliases.length === 0 || x.score > 0;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return sourceRank(a.movie.source) - sourceRank(b.movie.source);
      })
      .map(x => normalizeMovie(x.movie));

    if (randomize) {
      results = shuffle(results);
    }

    results = results.slice(0, limit);

    return NextResponse.json({
      movies: results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "movies route error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type TmdbMovie = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  adult?: boolean;
};

type TmdbSearchResponse = {
  results?: TmdbMovie[];
};

type ProviderInfo = {
  name: string;
  type: "stream" | "rent" | "buy" | "free";
};

type OutputMovie = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  certification?: string;
  vote_average?: number;
  providers?: ProviderInfo[];
  providerLink?: string;
  priceStatus?: string;
  source?: "tmdb" | "christian-ai";
};

type ChristianSearchItem = {
  title?: string;
  source?: string;
  type?: string;
  genre?: string;
  description?: string;
  url?: string;
};

type FaithMovieRecord = {
  _id?: unknown;
  title?: string;
  source?: string;
  link?: string | null;
  poster?: string | null;
  familySafe?: boolean;
  tags?: string[];
};

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const CHRISTIAN_SEARCH_API = (
  process.env.CHRISTIAN_SEARCH_API || "https://christian-search-ai.onrender.com"
).replace(/\/+$/, "");

const BAD_GENRE_IDS = new Set([
  27, // Horror
  10752, // War
]);

const BANNED_WORDS = [
  "zombie",
  "slasher",
  "killer",
  "kill",
  "blood",
  "terror",
  "evil",
  "demon",
  "haunt",
  "haunting",
  "possession",
  "possessed",
  "re-animation",
  "night of the living dead",
  "massacre",
  "gore",
  "nudity",
  "sexual",
  "rape",
  "devil",
  "horror",
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
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
    "dolphin",
    "whale",
    "wildlife",
    "zoo",
    "pet",
    "pets",
    "farm",
    "ranch",
  ],
  sports: [
    "sports",
    "sport",
    "football",
    "baseball",
    "basketball",
    "soccer",
    "hockey",
    "tennis",
    "golf",
    "boxing",
    "wrestling",
    "racing",
    "swimming",
    "runner",
    "track",
    "gymnastics",
    "dance",
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
    "pastor",
    "ministry",
    "scripture",
    "missionary",
  ],
  preschool: [
    "preschool",
    "toddler",
    "little kids",
    "learning",
    "alphabet",
    "numbers",
    "train",
    "friendly",
    "nursery",
    "school",
    "playground",
  ],
  childrens: [
    "children",
    "children's",
    "kids",
    "kid",
    "family",
    "adventure",
    "animated",
    "magic",
    "friendship",
  ],
  realpeople: [
    "live action",
    "biography",
    "family",
    "people",
    "human",
    "inspirational",
    "drama",
  ],
  fantasy: [
    "fantasy",
    "magic",
    "wizard",
    "castle",
    "dragon",
    "kingdom",
    "fairy",
    "enchanted",
  ],
  mystery: [
    "mystery",
    "detective",
    "clue",
    "investigation",
    "secret",
    "missing",
    "case",
    "puzzle",
  ],
  scifi: [
    "science fiction",
    "space",
    "alien",
    "future",
    "robot",
    "galaxy",
    "starship",
    "time travel",
  ],
};

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function uniqueByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeYear(releaseDate?: string) {
  if (!releaseDate) return "";
  return releaseDate.slice(0, 4);
}

function containsBannedWords(text: string) {
  const normalized = text.toLowerCase();
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

function normalizeRating(value?: string) {
  return String(value || "").trim().toUpperCase();
}

function getProviderPriorityScore(movie: OutputMovie) {
  const providers = movie.providers || [];
  if (providers.some((p) => p.type === "free")) return 4;
  if (providers.some((p) => p.type === "stream")) return 3;
  if (providers.some((p) => p.type === "rent")) return 2;
  if (providers.some((p) => p.type === "buy")) return 1;
  return 0;
}

function getCertificationPriorityScore(movie: OutputMovie, family: boolean) {
  const cert = normalizeRating(movie.certification);

  if (cert === "G") return 5;
  if (cert === "PG") return 4;
  if (cert === "NR" || cert === "UNRATED" || cert === "NOT RATED") {
    return family ? 3 : 2;
  }
  if (cert === "PG-13") return family ? 0 : 2;
  if (cert === "R" || cert === "NC-17" || cert === "TV-MA" || cert === "MA") {
    return 0;
  }

  return family ? 2 : 1;
}

function getSourcePriorityScore(movie: OutputMovie) {
  if (movie.source === "christian-ai") return 2;
  if (movie.source === "tmdb") return 1;
  return 0;
}

function compareOutputMovies(
  a: OutputMovie,
  b: OutputMovie,
  options?: {
    family?: boolean;
    preferProviders?: boolean;
    preferFaith?: boolean;
  }
) {
  const preferProviders = options?.preferProviders ?? true;
  const preferFaith = options?.preferFaith ?? false;
  const family = options?.family ?? false;

  if (preferProviders) {
    const providerScoreDiff =
      getProviderPriorityScore(b) - getProviderPriorityScore(a);
    if (providerScoreDiff !== 0) return providerScoreDiff;
  }

  if (preferFaith) {
    const sourceScoreDiff =
      getSourcePriorityScore(b) - getSourcePriorityScore(a);
    if (sourceScoreDiff !== 0) return sourceScoreDiff;
  }

  const certScoreDiff =
    getCertificationPriorityScore(b, family) -
    getCertificationPriorityScore(a, family);
  if (certScoreDiff !== 0) return certScoreDiff;

  const voteDiff = (b.vote_average || 0) - (a.vote_average || 0);
  if (voteDiff !== 0) return voteDiff;

  return a.title.localeCompare(b.title);
}

function isFamilySafeTitle(
  movie: TmdbMovie,
  options?: { family?: boolean; isMysteryGenre?: boolean }
) {
  const title = movie.title || "";
  const overview = movie.overview || "";

  if (!options?.family) return true;
  if (options.isMysteryGenre) return true;

  return !containsBannedWords(`${title} ${overview}`);
}

function passesGenreRules(
  movie: TmdbMovie,
  excludedGenreIds: number[],
  family: boolean
) {
  const genreIds = movie.genre_ids || [];

  if (
    excludedGenreIds.length > 0 &&
    genreIds.some((id) => excludedGenreIds.includes(id))
  ) {
    return false;
  }

  if (family) {
    const blockedGenres = genreIds.filter((id) => BAD_GENRE_IDS.has(id));
    if (blockedGenres.length > 0) return false;
  }

  return true;
}

function passesBasicMovieRules(
  movie: TmdbMovie,
  minVoteCount: number,
  minVoteAverage: number,
  options?: { family?: boolean; isMysteryGenre?: boolean }
) {
  if (!movie.id || !movie.title) return false;
  if (movie.adult) return false;
  if ((movie.vote_count || 0) < minVoteCount) return false;
  if ((movie.vote_average || 0) < minVoteAverage) return false;
  if (!isFamilySafeTitle(movie, options)) return false;
  return true;
}

function keywordScore(text: string, keywords: string[]) {
  const haystack = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 1;
  }
  return score;
}

function inferKeywordPack(params: { q: string; genre: string }) {
  const q = params.q.toLowerCase();
  const genre = params.genre;

  if (genre === "9648" || q.includes("mystery")) {
    return CATEGORY_KEYWORDS.mystery;
  }
  if (genre === "878" || q.includes("sci") || q.includes("space")) {
    return CATEGORY_KEYWORDS.scifi;
  }
  if (genre === "14" || q.includes("fantasy") || q.includes("magic")) {
    return CATEGORY_KEYWORDS.fantasy;
  }
  if (
    q.includes("animal") ||
    q.includes("dog") ||
    q.includes("horse") ||
    q.includes("lion")
  ) {
    return CATEGORY_KEYWORDS.animals;
  }
  if (
    q.includes("sport") ||
    q.includes("football") ||
    q.includes("baseball")
  ) {
    return CATEGORY_KEYWORDS.sports;
  }
  if (
    q.includes("christian") ||
    q.includes("faith") ||
    q.includes("jesus") ||
    q.includes("bible")
  ) {
    return CATEGORY_KEYWORDS.christian;
  }
  if (q.includes("preschool") || q.includes("toddler")) {
    return CATEGORY_KEYWORDS.preschool;
  }
  if (q.includes("children") || q.includes("kids")) {
    return CATEGORY_KEYWORDS.childrens;
  }
  if (q.includes("real people") || q.includes("live action")) {
    return CATEGORY_KEYWORDS.realpeople;
  }

  return [];
}

async function tmdbFetch<T>(path: string) {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is missing in environment variables");
  }

  const separator = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE}${path}${separator}api_key=${TMDB_API_KEY}`;

  const response = await fetch(url, {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TMDB request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

async function getCertification(movieId: number, region: string) {
  try {
    const data = await tmdbFetch<{
      results?: Array<{
        iso_3166_1: string;
        release_dates: Array<{ certification: string }>;
      }>;
    }>(`/movie/${movieId}/release_dates`);

    const match = data.results?.find((r) => r.iso_3166_1 === region);
    const cert =
      match?.release_dates.find(
        (r) => r.certification && r.certification.trim()
      )?.certification || "";

    return cert.trim();
  } catch {
    return "";
  }
}

async function getProviders(movieId: number, region: string) {
  try {
    const data = await tmdbFetch<{
      results?: Record<
        string,
        {
          link?: string;
          flatrate?: Array<{ provider_name: string }>;
          rent?: Array<{ provider_name: string }>;
          buy?: Array<{ provider_name: string }>;
          free?: Array<{ provider_name: string }>;
        }
      >;
    }>(`/movie/${movieId}/watch/providers`);

    const regionData = data.results?.[region];
    if (!regionData) {
      return {
        providers: [] as ProviderInfo[],
        providerLink: undefined as string | undefined,
        priceStatus:
          "Provider data not available for this title in your region.",
      };
    }

    const providers: ProviderInfo[] = [];

    (regionData.free || []).forEach((p) => {
      providers.push({ name: p.provider_name, type: "free" });
    });

    (regionData.flatrate || []).forEach((p) => {
      providers.push({ name: p.provider_name, type: "stream" });
    });

    (regionData.rent || []).forEach((p) => {
      providers.push({ name: p.provider_name, type: "rent" });
    });

    (regionData.buy || []).forEach((p) => {
      providers.push({ name: p.provider_name, type: "buy" });
    });

    const deduped = providers.filter(
      (provider, index, array) =>
        index ===
        array.findIndex(
          (p) => p.name === provider.name && p.type === provider.type
        )
    );

    let priceStatus = "Price unavailable from current data source.";
    if (deduped.some((p) => p.type === "free")) {
      priceStatus = "Free streaming option found.";
    } else if (deduped.some((p) => p.type === "stream")) {
      priceStatus = "Subscription streaming options found.";
    } else if (deduped.some((p) => p.type === "rent")) {
      priceStatus = "Rental options found.";
    } else if (deduped.some((p) => p.type === "buy")) {
      priceStatus = "Purchase options found.";
    }

    return {
      providers: deduped,
      providerLink: regionData.link,
      priceStatus,
    };
  } catch {
    return {
      providers: [] as ProviderInfo[],
      providerLink: undefined as string | undefined,
      priceStatus: "Provider data not available.",
    };
  }
}

function ratingAllowed(
  certification: string,
  allowedRatings: string[],
  excludedRatings: string[],
  family: boolean
) {
  const normalized = certification.trim().toUpperCase();

  if (allowedRatings.length > 0) {
    if (!normalized) return false;
    return allowedRatings.map((r) => r.toUpperCase()).includes(normalized);
  }

  if (excludedRatings.length > 0 && normalized) {
    if (excludedRatings.map((r) => r.toUpperCase()).includes(normalized)) {
      return false;
    }
  }

  if (family) {
    const blockedForFamily = new Set(["R", "NC-17", "TV-MA", "MA", "PG-13"]);
    if (normalized && blockedForFamily.has(normalized)) {
      return false;
    }
  }

  return true;
}

async function enrichMovie(
  movie: TmdbMovie,
  region: string,
  allowedRatings: string[],
  excludedRatings: string[],
  family: boolean
): Promise<OutputMovie | null> {
  const certification = await getCertification(movie.id, region);

  if (!ratingAllowed(certification, allowedRatings, excludedRatings, family)) {
    return null;
  }

  const providerData = await getProviders(movie.id, region);

  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview || "",
    poster_path: movie.poster_path || undefined,
    release_date: normalizeYear(movie.release_date),
    certification: certification || undefined,
    vote_average: movie.vote_average,
    providers: providerData.providers,
    providerLink: providerData.providerLink,
    priceStatus: providerData.priceStatus,
    source: "tmdb",
  };
}

async function searchMoviesByQuery(query: string, page = 1) {
  const encoded = encodeURIComponent(query);
  return tmdbFetch<TmdbSearchResponse>(
    `/search/movie?query=${encoded}&include_adult=false&page=${page}`
  );
}

async function discoverMovies(params: {
  genre?: string;
  region: string;
  page?: number;
  family: boolean;
  mode?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("include_adult", "false");
  searchParams.set("include_video", "false");
  searchParams.set("page", String(params.page || 1));
  searchParams.set("region", params.region);

  if (params.genre) {
    searchParams.set("with_genres", params.genre);
  }

  if (params.family) {
    searchParams.set("certification_country", params.region);
    searchParams.set("certification.lte", "PG");
    searchParams.set("without_genres", "27,10752");
    searchParams.set("sort_by", "popularity.desc");
  } else if (params.mode === "bestDeal" || params.mode === "watchNow") {
    searchParams.set("sort_by", "popularity.desc");
  } else if (params.mode === "surprise") {
    searchParams.set("sort_by", "vote_count.desc");
  } else {
    searchParams.set("sort_by", "popularity.desc");
  }

  return tmdbFetch<TmdbSearchResponse>(
    `/discover/movie?${searchParams.toString()}`
  );
}

async function searchChristianBackend(query: string) {
  const url = `${CHRISTIAN_SEARCH_API}/search?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Christian backend request failed: ${response.status} ${text}`
    );
  }

  const data = (await response.json()) as {
    results?: ChristianSearchItem[];
    count?: number;
    query?: string;
  };

  const results = (data.results || []).map((item, index): OutputMovie => ({
    id: 900000 + index,
    title: item.title || "Untitled",
    overview: item.description || "",
    poster_path: undefined,
    release_date: "",
    certification: item.type || undefined,
    vote_average: undefined,
    providers: item.url
      ? [{ name: item.source || "Catalog", type: "stream" }]
      : [],
    providerLink: item.url || undefined,
    priceStatus: item.genre || item.source || "Christian catalog result",
    source: "christian-ai",
  }));

  return results;
}

async function getMongoFaithMatches(
  query: string,
  limit = 30
): Promise<OutputMovie[]> {
  try {
    const client = await clientPromise;
    const db = client.db("clearstream");

    const trimmed = query.trim();
    const regex = trimmed ? new RegExp(trimmed, "i") : undefined;

    const filter: Record<string, unknown> = {
      familySafe: true,
    };

    if (regex) {
      filter.$or = [
        { title: { $regex: regex } },
        { source: { $regex: regex } },
        { tags: { $elemMatch: { $regex: regex } } },
      ];
    }

    const docs = await db
      .collection<FaithMovieRecord>("faith_movies")
      .find(filter)
      .limit(limit)
      .toArray();

    return docs.map((movie, index) => ({
      id: 800000 + index,
      title: movie.title || "Untitled",
      overview: `Faith and family title from ${
        movie.source || "ClearStream library"
      }.`,
      poster_path: movie.poster || undefined,
      release_date: "",
      certification: undefined,
      vote_average: undefined,
      providers: movie.link
        ? [{ name: movie.source || "Faith Library", type: "stream" }]
        : [],
      providerLink: movie.link || undefined,
      priceStatus:
        movie.tags && movie.tags.length > 0
          ? movie.tags.join(", ")
          : movie.source || "Faith library title",
      source: "christian-ai",
    }));
  } catch {
    return [];
  }
}

async function buildTmdbResults(params: {
  q: string;
  genre: string;
  region: string;
  mode: string;
  family: boolean;
  limit: number;
  minVoteCount: number;
  minVoteAverage: number;
  allowedRatings: string[];
  excludedRatings: string[];
  excludedGenreIds: number[];
  randomize: boolean;
  isMysteryGenre: boolean;
}) {
  const keywordPack = inferKeywordPack({
    q: params.q,
    genre: params.genre,
  });

  const tmdbCandidates: TmdbMovie[] = [];
  const queries: string[] = [];

  if (params.q.trim().length > 0) {
    queries.push(params.q.trim());
  }

  if (keywordPack.length > 0) {
    queries.push(keywordPack.slice(0, 3).join(" "));
    queries.push(`family ${keywordPack[0]} movie`);
    queries.push(`${keywordPack[0]} adventure`);
    queries.push(`${keywordPack[0]} family`);
  }

  if (keywordPack === CATEGORY_KEYWORDS.animals) {
    queries.push(
      "animal family movie",
      "dog movie",
      "horse movie",
      "wildlife family",
      "pet adventure"
    );
  }

  if (keywordPack === CATEGORY_KEYWORDS.sports) {
    queries.push(
      "sports movie",
      "football movie",
      "baseball movie",
      "basketball movie",
      "inspirational sports"
    );
  }

  if (keywordPack === CATEGORY_KEYWORDS.preschool) {
    queries.push(
      "preschool",
      "toddler",
      "kids learning",
      "children animated",
      "educational kids"
    );
  }

  if (keywordPack === CATEGORY_KEYWORDS.realpeople) {
    queries.push(
      "live action family",
      "biography family",
      "inspirational drama",
      "true story",
      "family drama"
    );
  }

  if (keywordPack === CATEGORY_KEYWORDS.fantasy) {
    queries.push(
      "fantasy family",
      "magic adventure",
      "enchanted",
      "wizard",
      "kingdom fantasy"
    );
  }

  const uniqueQueries = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];

  for (const query of uniqueQueries) {
    const responses = await Promise.all([
      searchMoviesByQuery(query, 1),
      searchMoviesByQuery(query, 2),
      searchMoviesByQuery(query, 3),
    ]);

    for (const response of responses) {
      tmdbCandidates.push(...(response.results || []));
    }
  }

  const discoverResponses = await Promise.all([
    discoverMovies({
      genre: params.genre || undefined,
      region: params.region,
      page: 1,
      family: params.family,
      mode: params.mode,
    }),
    discoverMovies({
      genre: params.genre || undefined,
      region: params.region,
      page: 2,
      family: params.family,
      mode: params.mode,
    }),
    discoverMovies({
      genre: params.genre || undefined,
      region: params.region,
      page: 3,
      family: params.family,
      mode: params.mode,
    }),
    discoverMovies({
      genre: params.genre || undefined,
      region: params.region,
      page: 4,
      family: params.family,
      mode: params.mode,
    }),
  ]);

  for (const response of discoverResponses) {
    tmdbCandidates.push(...(response.results || []));
  }

  const deduped = uniqueById(
    tmdbCandidates.filter((movie): movie is TmdbMovie => Boolean(movie?.id))
  );

  const filtered = deduped
    .filter((movie) => {
      if (
        !passesBasicMovieRules(
          movie,
          params.minVoteCount,
          params.minVoteAverage,
          {
            family: params.family,
            isMysteryGenre: params.isMysteryGenre,
          }
        )
      ) {
        return false;
      }

      if (
        !passesGenreRules(movie, params.excludedGenreIds, params.family)
      ) {
        return false;
      }

      const text = `${movie.title || ""} ${movie.overview || ""}`.toLowerCase();

      if (params.family && containsBannedWords(text)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aScore = keywordScore(
        `${a.title} ${a.overview || ""}`,
        keywordPack
      );

      const bScore = keywordScore(
        `${b.title} ${b.overview || ""}`,
        keywordPack
      );

      if (bScore !== aScore) return bScore - aScore;

      return (b.vote_average || 0) - (a.vote_average || 0);
    });

  const enriched = await Promise.all(
    filtered
      .slice(0, Math.max(params.limit * 6, 60))
      .map((movie) =>
        enrichMovie(
          movie,
          params.region,
          params.allowedRatings,
          params.excludedRatings,
          params.family
        )
      )
  );

  let results = enriched.filter((m): m is OutputMovie => Boolean(m));

  results = uniqueById(results);
  results = uniqueByTitle(results);

  results.sort((a, b) =>
    compareOutputMovies(a, b, {
      family: params.family,
      preferProviders:
        params.mode === "watchNow" || params.mode === "bestDeal",
      preferFaith: false,
    })
  );

  if (params.randomize) {
    results = shuffleArray(results);
  }

  return results.slice(0, params.limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const genreParam = searchParams.get("genre");
    const isMysteryGenre = genreParam === "9648";

    const q = searchParams.get("q")?.trim() || "";
    const genre = genreParam?.trim() || "";
    const region = searchParams.get("region")?.trim() || "US";
    const mode = searchParams.get("mode")?.trim() || "search";

    const family = searchParams.get("family") === "true";
    const randomize = searchParams.get("randomize") === "true";

    const limit = Math.max(
      1,
      Math.min(Number(searchParams.get("limit") || "8"), 40)
    );
    const minVoteCount = Math.max(
      0,
      Number(searchParams.get("minVoteCount") || "0")
    );
    const minVoteAverage = Math.max(
      0,
      Number(searchParams.get("minVoteAverage") || "0")
    );

    const allowedRatings = parseCsvParam(searchParams.get("allowedRatings"));
    const excludedRatings = parseCsvParam(searchParams.get("excludeRatings"));
    const excludedGenreIds = parseCsvParam(searchParams.get("excludeGenres"))
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    const excludeTitles = parseCsvParam(
      searchParams.get("excludeTitles")
    ).map((t) => t.toLowerCase());
    const excludeIds = parseCsvParam(searchParams.get("excludeIds"));

    const useChristian = searchParams.get("useChristian") === "true";
    const includeFaith =
      searchParams.get("includeFaith") === "true" || useChristian;

    let tmdbResults: OutputMovie[] = [];
    let christianResults: OutputMovie[] = [];
    let mongoFaithResults: OutputMovie[] = [];

    if (!useChristian || !q) {
      tmdbResults = await buildTmdbResults({
        q,
        genre,
        region,
        mode,
        family,
        limit: Math.max(limit * 2, 16),
        minVoteCount,
        minVoteAverage,
        allowedRatings,
        excludedRatings,
        excludedGenreIds,
        randomize: false,
        isMysteryGenre,
      });
    }

    if (includeFaith && q) {
      const [backendResults, mongoResults] = await Promise.all([
        searchChristianBackend(q).catch(() => []),
        getMongoFaithMatches(q, Math.max(limit * 2, 20)).catch(() => []),
      ]);

      christianResults = backendResults;
      mongoFaithResults = mongoResults;
    }

    let combined = [...tmdbResults, ...mongoFaithResults, ...christianResults];

    combined = uniqueByTitle(combined);
    combined = uniqueById(combined);

    combined = combined.filter((movie) => {
      if (excludeIds.includes(String(movie.id))) return false;
      if (excludeTitles.includes(movie.title.trim().toLowerCase())) return false;
      return true;
    });

    combined.sort((a, b) =>
      compareOutputMovies(a, b, {
        family,
        preferProviders: mode === "watchNow" || mode === "bestDeal",
        preferFaith: includeFaith && Boolean(q),
      })
    );

    if (randomize) {
      combined = shuffleArray(combined);
    }

    const results = combined.slice(0, limit);

    return NextResponse.json({
      results,
      count: results.length,
      q,
      genre,
      region,
      mode,
      family,
      randomize,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown search error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
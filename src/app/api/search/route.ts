import { NextRequest, NextResponse } from "next/server";

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

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const CHRISTIAN_SEARCH_API =
  process.env.CHRISTIAN_SEARCH_API || "https://christian-search-ai.onrender.com";

const BAD_GENRE_IDS = new Set([
  27, // Horror
  53, // Thriller
  80, // Crime
  10752, // War
]);

const BANNED_WORDS = [
  "zombie",
  "slasher",
  "killer",
  "kill",
  "murder",
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

function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
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

function isFamilySafeTitle(movie: TmdbMovie) {
  const title = movie.title || "";
  const overview = movie.overview || "";
  return !containsBannedWords(`${title} ${overview}`);
}

function passesGenreRules(movie: TmdbMovie, excludedGenreIds: number[], family: boolean) {
  const genreIds = movie.genre_ids || [];

  if (excludedGenreIds.length > 0 && genreIds.some((id) => excludedGenreIds.includes(id))) {
    return false;
  }

  if (family && genreIds.some((id) => BAD_GENRE_IDS.has(id))) {
    return false;
  }

  return true;
}

function passesBasicMovieRules(movie: TmdbMovie, minVoteCount: number, minVoteAverage: number) {
  if (!movie.id || !movie.title) return false;
  if (movie.adult) return false;
  if ((movie.vote_count || 0) < minVoteCount) return false;
  if ((movie.vote_average || 0) < minVoteAverage) return false;
  if (!isFamilySafeTitle(movie)) return false;
  return true;
}

async function tmdbFetch<T>(path: string) {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is missing in .env.local");
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
      match?.release_dates.find((r) => r.certification && r.certification.trim())?.certification ||
      "";

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
        priceStatus: "Provider data not available for this title in your region.",
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
        index === array.findIndex((p) => p.name === provider.name && p.type === provider.type),
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
  family: boolean,
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
  family: boolean,
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
    `/search/movie?query=${encoded}&include_adult=false&page=${page}`,
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
    searchParams.set("without_genres", "27,53,80,9648,10752");
    searchParams.set("sort_by", "popularity.desc");
  } else if (params.mode === "bestDeal" || params.mode === "watchNow") {
    searchParams.set("sort_by", "popularity.desc");
  } else if (params.mode === "surprise") {
    searchParams.set("sort_by", "vote_count.desc");
  } else {
    searchParams.set("sort_by", "popularity.desc");
  }

  return tmdbFetch<TmdbSearchResponse>(`/discover/movie?${searchParams.toString()}`);
}

async function searchChristianBackend(query: string) {
  const url = `${CHRISTIAN_SEARCH_API}/search?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Christian backend request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    results?: ChristianSearchItem[];
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const genre = searchParams.get("genre")?.trim() || "";
    const region = searchParams.get("region")?.trim() || "US";
    const mode = searchParams.get("mode")?.trim() || "search";

    const family = searchParams.get("family") === "true";
    const randomize = searchParams.get("randomize") === "true";

    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || "8"), 20));
    const minVoteCount = Math.max(0, Number(searchParams.get("minVoteCount") || "0"));
    const minVoteAverage = Math.max(0, Number(searchParams.get("minVoteAverage") || "0"));

    const excludedGenreIds = parseCsvParam(searchParams.get("excludeGenres")).map((v) => Number(v));
    const allowedRatings = parseCsvParam(searchParams.get("allowedRatings"));
    const excludedRatings = parseCsvParam(searchParams.get("excludeRatings"));

    if (mode === "christian") {
      if (!q) {
        return NextResponse.json({ results: [] });
      }

      const christianResults = await searchChristianBackend(q);
      return NextResponse.json({
        results: christianResults.slice(0, limit),
      });
    }

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: "TMDB_API_KEY is missing in .env.local" },
        { status: 500 },
      );
    }

    let rawMovies: TmdbMovie[] = [];

    if (q) {
      const [page1, page2] = await Promise.all([
        searchMoviesByQuery(q, 1),
        searchMoviesByQuery(q, 2),
      ]);

      rawMovies = [...(page1.results || []), ...(page2.results || [])];
    } else {
      const [page1, page2, page3] = await Promise.all([
        discoverMovies({ genre, region, page: 1, family, mode }),
        discoverMovies({ genre, region, page: 2, family, mode }),
        discoverMovies({ genre, region, page: 3, family, mode }),
      ]);

      rawMovies = [
        ...(page1.results || []),
        ...(page2.results || []),
        ...(page3.results || []),
      ];
    }

    let filtered = uniqueById(rawMovies).filter((movie) => {
      if (!passesBasicMovieRules(movie, minVoteCount, minVoteAverage)) return false;
      if (!passesGenreRules(movie, excludedGenreIds, family)) return false;
      return true;
    });

    if (mode === "family" || mode === "familyNight") {
      filtered = filtered.filter((movie) => {
        const genres = movie.genre_ids || [];
        const badGenre = genres.some((id) => BAD_GENRE_IDS.has(id));
        if (badGenre) return false;

        const text = `${movie.title || ""} ${movie.overview || ""}`.toLowerCase();
        if (containsBannedWords(text)) return false;

        return true;
      });

      filtered = shuffleArray(filtered).slice(0, 24);
    } else if (randomize) {
      filtered = shuffleArray(filtered);
    }

    const candidateMovies = filtered.slice(0, Math.max(limit * 3, 24));

    const enriched = await Promise.all(
      candidateMovies.map((movie) =>
        enrichMovie(movie, region, allowedRatings, excludedRatings, family),
      ),
    );

    let results = enriched.filter((movie): movie is OutputMovie => Boolean(movie));

    if (mode === "family" || mode === "familyNight") {
      results = results.filter((movie) => {
        const cert = (movie.certification || "").toUpperCase();
        if (cert && cert !== "G" && cert !== "PG" && cert !== "NR") {
          return false;
        }

        const text = `${movie.title || ""} ${movie.overview || ""}`.toLowerCase();
        if (containsBannedWords(text)) return false;

        return true;
      });

      results = shuffleArray(results).slice(0, 8);
    }

    if (mode === "watchNow") {
      const withWatchOptions = results.filter((movie) =>
        movie.providers?.some(
          (provider) => provider.type === "free" || provider.type === "stream",
        ),
      );

      if (withWatchOptions.length > 0) {
        results = withWatchOptions;
      }
    }

    if (mode === "bestDeal") {
      const sorted = [...results].sort((a, b) => {
        const score = (movie: OutputMovie) => {
          if (movie.providers?.some((p) => p.type === "free")) return 4;
          if (movie.providers?.some((p) => p.type === "stream")) return 3;
          if (movie.providers?.some((p) => p.type === "rent")) return 2;
          if (movie.providers?.some((p) => p.type === "buy")) return 1;
          return 0;
        };
        return score(b) - score(a);
      });

      results = sorted;
    }

    if (randomize && mode !== "bestDeal" && mode !== "family" && mode !== "familyNight") {
      results = shuffleArray(results);
    }

    results = results.slice(0, limit);

    return NextResponse.json({
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
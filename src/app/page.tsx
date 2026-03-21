"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProviderInfo = {
  name: string;
  type: "stream" | "rent" | "buy" | "free";
};

type Movie = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  certification?: string;
  customRating?: string;
  vote_average?: number;
  providers?: ProviderInfo[];
  providerLink?: string;
  priceStatus?: string;
  source?: "tmdb" | "mongo" | "christian-ai";
  familySafe?: boolean;
  notes?: string;
};

type UserReview = {
  userId: string;
  movieId: number;
  title: string;
  rating: number;
  review?: string;
  poster_path?: string;
  release_date?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MongoMovie = {
  _id?: string;
  title?: string;
  tmdbId?: number;
  notes?: string;
  category?: string[];
  familySafe?: boolean;
  customRating?: string;
};

type FavoriteApiRecord = {
  _id?: string;
  userId: string;
  movieId: number;
  title: string;
  poster_path?: string;
  release_date?: string;
  addedAt?: string;
};

type ActiveMode =
  | "idle"
  | "search"
  | "watchNow"
  | "bestDeal"
  | "familyNight"
  | "surprise";

type CategoryKey =
  | "anygenre"
  | "comedy"
  | "action"
  | "western"
  | "scifi"
  | "animation"
  | "realpeople"
  | "animals"
  | "childrensnook"
  | "preschool"
  | "fantasy"
  | "christian"
  | "sports"
  | "mystery"
  | "documentary";

type Category = {
  key: CategoryKey;
  label: string;
  genreId?: string;
  fallbackQuery: string;
  gOnly?: boolean;
  excludedGenreIds?: string[];
  anyGenre?: boolean;
};

const DEV_USER_ID = "devUser1";
const FAMILY_SAFE_POSTER_PLACEHOLDER = "/images/poster-fallback.png";

const PROVIDER_PRIORITY: Record<ProviderInfo["type"], number> = {
  free: 4,
  stream: 3,
  rent: 2,
  buy: 1,
};

const PROVIDER_LABELS: Record<ProviderInfo["type"], string> = {
  free: "Free",
  stream: "Subscription",
  rent: "Rent",
  buy: "Buy",
};

const MONGO_CATEGORY_MAP: Partial<Record<CategoryKey, string>> = {
  realpeople: "realpeople",
  animals: "animals",
  childrensnook: "childrensnook",
  preschool: "preschool",
  christian: "christian",
  sports: "sports",
};

const CATEGORIES: Category[] = [
  {
    key: "anygenre",
    label: "Any Genre",
    fallbackQuery: "popular family movies adventure comedy fantasy animation",
    anyGenre: true,
  },
  {
    key: "comedy",
    label: "Comedies",
    genreId: "35",
    fallbackQuery: "best family comedy movies",
  },
  {
    key: "action",
    label: "Action",
    genreId: "28",
    fallbackQuery: "best family action adventure movies",
  },
  {
    key: "western",
    label: "Westerns",
    genreId: "37",
    fallbackQuery: "best western movies",
  },
  {
    key: "scifi",
    label: "Sci-Fi",
    genreId: "878",
    fallbackQuery: "best family science fiction movies",
  },
  {
    key: "animation",
    label: "Animation",
    genreId: "16",
    fallbackQuery: "best animated family movies",
  },
  {
    key: "realpeople",
    label: "Real People",
    fallbackQuery: "best live action family movies",
    excludedGenreIds: ["16"],
  },
  {
    key: "animals",
    label: "Animal Movies",
    fallbackQuery: "animal family movies dogs horses wildlife kids",
  },
  {
    key: "childrensnook",
    label: "Children's Nook",
    fallbackQuery: "G rated children family animated adventure movies",
    gOnly: true,
  },
  {
    key: "preschool",
    label: "Preschool Playground",
    fallbackQuery:
      "preschool toddler little kids thomas train mister rogers peppa pig daniel tiger sesame learning",
    gOnly: true,
  },
  {
    key: "fantasy",
    label: "Fantasy",
    genreId: "14",
    fallbackQuery: "best family fantasy movies",
  },
  {
    key: "christian",
    label: "Christian",
    fallbackQuery: "faith christian bible jesus family movies documentaries",
  },
  {
    key: "sports",
    label: "Sports",
    fallbackQuery:
      "sports family inspirational football baseball basketball soccer hockey swimming tennis rodeo dance documentaries",
  },
  {
    key: "mystery",
    label: "Mystery",
    genreId: "9648",
    fallbackQuery: "family mystery adventure movies",
    excludedGenreIds: ["27"],
  },
  {
    key: "documentary",
    label: "Documentary",
    genreId: "99",
    fallbackQuery: "best family documentaries",
  },
];

const PLACEHOLDER_MOVIES: Movie[] = [
  {
    id: 327017,
    title: "Chisum",
    overview: "A family-safe western adventure starring John Wayne.",
    poster_path: "/images/chisum.png",
    certification: "G",
    vote_average: 6.7,
    release_date: "1970",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 630,
    title: "The Wizard of Oz",
    overview: "A timeless fantasy classic.",
    poster_path: "/pfAZFD7I2hxW9HCChTuAzsdE6UX.jpg",
    certification: "G",
    vote_average: 7.6,
    release_date: "1939",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 18660,
    title: "The Apple Dumpling Gang",
    overview: "Funny Disney western family movie.",
    poster_path: "/cSbRtW2rSpz6AxS4BwtunpFHma.jpg",
    certification: "G",
    vote_average: 6.4,
    release_date: "1975",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 11,
    title: "Star Wars",
    overview: "Classic sci-fi adventure.",
    poster_path: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
    certification: "PG",
    vote_average: 8.2,
    release_date: "1977",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 862,
    title: "Toy Story",
    overview: "Animated family classic.",
    poster_path: "/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
    certification: "G",
    vote_average: 8.3,
    release_date: "1995",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 19490,
    title: "The Bishop's Wife",
    overview: "Classic Christmas fantasy.",
    poster_path: "/2sMpffmvoJlW7WBcvyHTPR9DEsj.jpg",
    certification: "G",
    vote_average: 7.4,
    release_date: "1947",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 1585,
    title: "It's a Wonderful Life",
    overview: "Holiday classic.",
    poster_path: "/bSqt9rhDZx1Q7UZ86dBPKdNomp2.jpg",
    certification: "PG",
    vote_average: 8.3,
    release_date: "1946",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
  {
    id: 8587,
    title: "The Lion King",
    overview: "Disney classic.",
    poster_path: "/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
    certification: "G",
    vote_average: 8.3,
    release_date: "1994",
    source: "tmdb",
    providers: [{ name: "Catalog", type: "stream" }],
  },
];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleItems<T>(items: T[]): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function cleanMovieTitle(title?: string) {
  if (!title) return "Untitled";

  return title
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\.(html|php|aspx?|jsp)$/i, "")
    .replace(/[-_/]+/g, " ")
    .replace(
      /\b(home|index|movie|movies|watch|stream|title|detail|details)\b/gi,
      " "
    )
    .replace(/\b(www|http|https|com|org|net)\b/gi, " ")
    .replace(/\s+\|\s+.*$/g, "")
    .replace(/\s+-\s+.*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanOverview(text?: string) {
  if (!text) return "";

  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\b(read more|click here|watch now|view details)\b/gi, "")
    .trim();
}

function normalizeMovie(movie: Movie): Movie {
  return {
    ...movie,
    title: cleanMovieTitle(movie.title),
    overview: cleanOverview(movie.overview),
    providers: Array.isArray(movie.providers) ? movie.providers : [],
    providerLink:
      typeof movie.providerLink === "string" && movie.providerLink.trim()
        ? movie.providerLink.trim()
        : undefined,
    priceStatus:
      typeof movie.priceStatus === "string" && movie.priceStatus.trim()
        ? movie.priceStatus.trim()
        : undefined,
  };
}

function getPosterUrl(path?: string) {
  if (!path) return FAMILY_SAFE_POSTER_PLACEHOLDER;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/images/")) return path;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeLocalStorageSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function getNormalizedRating(movie: Movie) {
  return String(movie.certification || movie.customRating || "")
    .toUpperCase()
    .trim();
}

function isNotRatedLike(movie: Movie) {
  const rating = getNormalizedRating(movie);

  return (
    rating === "" ||
    rating === "NR" ||
    rating === "UNRATED" ||
    rating === "NOT RATED" ||
    rating === "UNR"
  );
}

function shouldUseFamilyPlaceholderPoster(
  movie: Movie,
  familyFriendlyOn: boolean
) {
  if (!familyFriendlyOn) return false;
  return isNotRatedLike(movie);
}

function getDisplayPosterUrl(movie: Movie, familyFriendlyOn: boolean) {
  if (shouldUseFamilyPlaceholderPoster(movie, familyFriendlyOn)) {
    return FAMILY_SAFE_POSTER_PLACEHOLDER;
  }
  return getPosterUrl(movie.poster_path);
}

function isExcludedBySafetyFilters(
  movie: Movie,
  options: {
    noRRatedOn: boolean;
    noPg13On: boolean;
  }
) {
  const rating = getNormalizedRating(movie);

  if (options.noRRatedOn) {
    if (
      rating === "R" ||
      rating === "NC-17" ||
      rating === "TV-MA" ||
      rating === "MA"
    ) {
      return true;
    }
  }

  if (options.noPg13On && rating === "PG-13") {
    return true;
  }

  return false;
}

function getRippleConfidence(
  movie: Movie,
  options: {
    familyFriendlyOn: boolean;
    activeMode: ActiveMode;
    gOnly: boolean;
  }
) {
  const hasProviders = Boolean(movie.providers && movie.providers.length > 0);
  const cert = getNormalizedRating(movie);

  if (
    hasProviders &&
    (cert === "G" ||
      cert === "PG" ||
      cert === "NR" ||
      options.familyFriendlyOn ||
      options.gOnly ||
      options.activeMode === "familyNight")
  ) {
    return {
      label: "Ripple Approved",
      className: "border-emerald-500/30 bg-emerald-600/20 text-emerald-300",
    };
  }

  if (!hasProviders) {
    return {
      label: "Ripple Uncertain",
      className: "border-amber-500/30 bg-amber-600/20 text-amber-200",
    };
  }

  return {
    label: "Ripple Reviewed",
    className: "border-cyan-500/30 bg-cyan-600/20 text-cyan-200",
  };
}

function mergeUniqueMovies(primary: Movie[], secondary: Movie[]) {
  const seen = new Set<string>();
  const merged: Movie[] = [];

  for (const rawMovie of [...primary, ...secondary]) {
    const movie = normalizeMovie(rawMovie);
    const cleanTitle = cleanMovieTitle(movie.title).toLowerCase();
    const year = (movie.release_date || "").slice(0, 4);
    const key = year ? `${cleanTitle}-${year}` : cleanTitle;

    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(movie);
  }

  return merged;
}

function getCategoryPlaceholderFallback(
  category: CategoryKey | null,
  limit: number
): Movie[] {
  if (!category) {
    return PLACEHOLDER_MOVIES.slice(0, limit);
  }

  const filtered = PLACEHOLDER_MOVIES.filter((movie) => {
    const title = movie.title.toLowerCase();
    const overview = (movie.overview || "").toLowerCase();

    switch (category) {
      case "animals":
        return (
          title.includes("lion") ||
          overview.includes("animal") ||
          overview.includes("wild")
        );
      case "childrensnook":
      case "preschool":
        return movie.certification === "G" || title.includes("toy");
      case "christian":
        return (
          title.includes("bishop") ||
          title.includes("wonderful") ||
          overview.includes("christmas")
        );
      case "sports":
        return false;
      case "western":
        return title.includes("chisum") || title.includes("apple dumpling");
      case "fantasy":
        return title.includes("wizard") || title.includes("bishop");
      case "animation":
        return title.includes("toy") || title.includes("lion");
      case "scifi":
        return title.includes("star wars");
      case "mystery":
        return (
          title.includes("wizard") ||
          title.includes("wonderful") ||
          overview.includes("mystery")
        );
      case "documentary":
        return overview.includes("classic") || overview.includes("family");
      default:
        return true;
    }
  });

  return (filtered.length > 0 ? filtered : PLACEHOLDER_MOVIES).slice(0, limit);
}

function getCategoryFallbackQuery(
  category: Category | null,
  familyFriendlyOn: boolean
) {
  if (!category) return "";

  if (category.key === "anygenre") {
    return familyFriendlyOn
      ? "popular family movies adventure fantasy comedy animation"
      : "popular movies adventure comedy drama action fantasy";
  }

  return category.fallbackQuery;
}

function getSortedProviders(providers?: ProviderInfo[]) {
  return [...(providers || [])]
    .filter((provider) => provider.name?.trim())
    .sort((a, b) => {
      const priorityDiff =
        PROVIDER_PRIORITY[b.type] - PROVIDER_PRIORITY[a.type];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
}

function getGroupedProviders(providers?: ProviderInfo[]) {
  const grouped: Record<ProviderInfo["type"], string[]> = {
    free: [],
    stream: [],
    rent: [],
    buy: [],
  };

  for (const provider of getSortedProviders(providers)) {
    if (!grouped[provider.type].includes(provider.name)) {
      grouped[provider.type].push(provider.name);
    }
  }

  return grouped;
}

function getProviderPriorityValue(movie: Movie) {
  const providers = getSortedProviders(movie.providers);

  if (providers.some((provider) => provider.type === "free")) return 4;
  if (providers.some((provider) => provider.type === "stream")) return 3;
  if (providers.some((provider) => provider.type === "rent")) return 2;
  if (providers.some((provider) => provider.type === "buy")) return 1;
  return 0;
}

function getProviderTypeChips(movie: Movie) {
  const providers = getSortedProviders(movie.providers);
  const presentTypes = new Set<ProviderInfo["type"]>();

  for (const provider of providers) {
    presentTypes.add(provider.type);
  }

  return (["free", "stream", "rent", "buy"] as ProviderInfo["type"][]).filter(
    (type) => presentTypes.has(type)
  );
}

function getBestProviderSummary(movie: Movie) {
  const topProvider = getSortedProviders(movie.providers)[0];

  if (!topProvider) {
    return movie.priceStatus || "Provider data unavailable";
  }

  switch (topProvider.type) {
    case "free":
      return `Best way to watch: Free on ${topProvider.name}`;
    case "stream":
      return `Best way to watch: Subscription on ${topProvider.name}`;
    case "rent":
      return `Best way to watch: Rent on ${topProvider.name}`;
    case "buy":
      return `Best way to watch: Buy on ${topProvider.name}`;
    default:
      return movie.priceStatus || "Provider data unavailable";
  }
}

function getPrimaryActionLabel(movie: Movie) {
  const topProvider = getSortedProviders(movie.providers)[0];

  switch (topProvider?.type) {
    case "free":
      return "Watch Free";
    case "stream":
      return "Stream Now";
    case "rent":
      return "Rent";
    case "buy":
      return "Buy";
    default:
      return "Watch Now";
  }
}

function sortMoviesForDisplay(
  items: Movie[],
  options: { randomize: boolean; mode: ActiveMode }
) {
  const normalized = items.map((movie) => normalizeMovie(movie));

  if (
    options.randomize &&
    options.mode !== "watchNow" &&
    options.mode !== "bestDeal"
  ) {
    return shuffleItems(normalized);
  }

  return [...normalized].sort((a, b) => {
    const providerDiff =
      getProviderPriorityValue(b) - getProviderPriorityValue(a);
    if (providerDiff !== 0) return providerDiff;

    const voteDiff = (b.vote_average || 0) - (a.vote_average || 0);
    if (voteDiff !== 0) return voteDiff;

    return cleanMovieTitle(a.title)
      .toLowerCase()
      .localeCompare(cleanMovieTitle(b.title).toLowerCase());
  });
}

function shouldUseTextFallback(
  category: Category | null,
  typedQuery: string,
  mongoCategory?: string
) {
  if (typedQuery) return true;
  if (mongoCategory) return true;
  if (!category) return true;
  if (category.anyGenre) return true;
  if (!category.genreId) return true;
  return false;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [familyFriendlyOn, setFamilyFriendlyOn] = useState(false);
  const [noRRatedOn, setNoRRatedOn] = useState(false);
  const [noPg13On, setNoPg13On] = useState(false);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState<ActiveMode>("idle");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryKey | null>(null);
  const [rippleJumpSeed, setRippleJumpSeed] = useState(0);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Movie[]>([]);
  const [hiddenTitles, setHiddenTitles] = useState<string[]>([]);
  const [hiddenMovieIds, setHiddenMovieIds] = useState<number[]>([]);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const [userReviews, setUserReviews] = useState<Record<number, UserReview>>(
    {}
  );
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, string>>({});
  const [reviewLoadingMovieId, setReviewLoadingMovieId] = useState<number | null>(null);
  const [reviewExpanded, setReviewExpanded] = useState<Record<number, boolean>>({});
  const [providerExpanded, setProviderExpanded] = useState<Record<number, boolean>>({});
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const pondRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pondTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentlyViewed(
      safeLocalStorageGet<Movie[]>("clearstream_recently_viewed", [])
    );
    setHiddenTitles(
      safeLocalStorageGet<string[]>("clearstream_hidden_titles", [])
    );
    setHiddenMovieIds(
      safeLocalStorageGet<number[]>("clearstream_hidden_movie_ids", [])
    );

    const loadFavorites = async () => {
      try {
        const res = await fetch(
          `/api/favorites?userId=${encodeURIComponent(DEV_USER_ID)}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load favorites");
        }

        const favoriteMovies: Movie[] = Array.isArray(data.favorites)
          ? (data.favorites as FavoriteApiRecord[]).map((fav) => ({
              id: fav.movieId,
              title: fav.title,
              poster_path: fav.poster_path,
              release_date: fav.release_date,
              source: "mongo",
            }))
          : [];

        setFavorites(favoriteMovies);
      } catch (err) {
        console.error("Failed to load favorites:", err);
        setFavorites([]);
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    safeLocalStorageSet("clearstream_recently_viewed", recentlyViewed);
  }, [recentlyViewed]);

  useEffect(() => {
    safeLocalStorageSet("clearstream_hidden_titles", hiddenTitles);
  }, [hiddenTitles]);

  useEffect(() => {
    safeLocalStorageSet("clearstream_hidden_movie_ids", hiddenMovieIds);
  }, [hiddenMovieIds]);

  const displayedResults = useMemo(() => {
    const baseResults = hasSearched ? results : PLACEHOLDER_MOVIES;
    const hiddenTitleSet = new Set(hiddenTitles.map((title) => title.trim().toLowerCase()));
    const hiddenIdSet = new Set(hiddenMovieIds);

    return baseResults.filter((movie) => {
      if (hiddenIdSet.has(movie.id)) return false;
      return !hiddenTitleSet.has(movie.title.trim().toLowerCase());
    });
  }, [hasSearched, results, hiddenMovieIds, hiddenTitles]);

  const selectedCategoryData = useMemo(() => {
    return CATEGORIES.find((category) => category.key === selectedCategory) || null;
  }, [selectedCategory]);

  const statusBadges = useMemo(() => {
    const badges: string[] = [];
    if (familyFriendlyOn) badges.push("Family friendly mode ON");
    if (noRRatedOn) badges.push("No R rated titles");
    if (noPg13On) badges.push("No PG-13 titles");
    return badges;
  }, [familyFriendlyOn, noPg13On, noRRatedOn]);

  useEffect(() => {
    if (!selectedCategory) {
      setRipplePosition({ x: 0, y: 0 });
      return;
    }

    const pondEl = pondRefs.current[selectedCategory];
    const trackEl = pondTrackRef.current;

    if (!pondEl || !trackEl) return;

    const pondRect = pondEl.getBoundingClientRect();
    const trackRect = trackEl.getBoundingClientRect();

    setRipplePosition({
      x: pondRect.left - trackRect.left + pondRect.width / 2 - 28,
      y: pondRect.top - trackRect.top - 56,
    });
  }, [selectedCategory, rippleJumpSeed]);

  const toggleFavorite = async (movie: Movie) => {
    const exists = favorites.some((item) => item.id === movie.id);

    try {
      if (exists) {
        const res = await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: DEV_USER_ID,
            movieId: movie.id,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to remove favorite");

        setFavorites((prev) => prev.filter((item) => item.id !== movie.id));
        return;
      }

      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEV_USER_ID,
          movieId: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add favorite");

      setFavorites((prev) =>
        [movie, ...prev.filter((item) => item.id !== movie.id)].slice(0, 40)
      );
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      setError(err instanceof Error ? err.message : "Favorite action failed");
    }
  };

  const addRecentlyViewed = async (movie: Movie) => {
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEV_USER_ID,
          movieId: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update history");

      setRecentlyViewed((prev) => {
        const deduped = prev.filter((item) => item.id !== movie.id);
        return [movie, ...deduped].slice(0, 16);
      });
    } catch (err) {
      console.error("History update failed:", err);
      setError(err instanceof Error ? err.message : "History action failed");
    }
  };

  const hideMovie = (movie: Movie) => {
    const normalizedTitle = movie.title.trim().toLowerCase();

    setHiddenTitles((prev) =>
      prev.some((title) => title.trim().toLowerCase() === normalizedTitle)
        ? prev
        : [...prev, movie.title]
    );
    setHiddenMovieIds((prev) => (prev.includes(movie.id) ? prev : [...prev, movie.id]));
    setResults((prev) => prev.filter((item) => item.id !== movie.id));
    setFavorites((prev) => prev.filter((item) => item.id !== movie.id));
    setRecentlyViewed((prev) => prev.filter((item) => item.id !== movie.id));
  };

  const restoreHiddenTitles = () => {
    setHiddenTitles([]);
    setHiddenMovieIds([]);
  };

  const isFavorite = (movieId: number) => {
    return favorites.some((movie) => movie.id === movieId);
  };

  const getMovieRating = (movieId: number) => {
    return userReviews[movieId]?.rating || 0;
  };

  const getMovieReviewText = (movieId: number) => {
    if (reviewDrafts[movieId] !== undefined) {
      return reviewDrafts[movieId];
    }
    return userReviews[movieId]?.review || "";
  };

  const setMovieReviewDraft = (movieId: number, value: string) => {
    setReviewDrafts((prev) => ({ ...prev, [movieId]: value }));
  };

  const toggleReviewExpanded = (movieId: number) => {
    setReviewExpanded((prev) => ({ ...prev, [movieId]: !prev[movieId] }));
  };

  const toggleProviderExpanded = (movieId: number) => {
    setProviderExpanded((prev) => ({ ...prev, [movieId]: !prev[movieId] }));
  };

  const saveMovieReview = async (
    movie: Movie,
    rating: number,
    reviewText?: string
  ) => {
    try {
      setReviewLoadingMovieId(movie.id);

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEV_USER_ID,
          movieId: movie.id,
          title: movie.title,
          rating,
          review: reviewText ?? getMovieReviewText(movie.id),
          poster_path: movie.poster_path,
          release_date: movie.release_date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save review");

      const savedReview: UserReview = data.review;

      setUserReviews((prev) => ({
        ...prev,
        [movie.id]: savedReview,
      }));
      setReviewDrafts((prev) => ({
        ...prev,
        [movie.id]: savedReview.review || "",
      }));
      setReviewExpanded((prev) => ({
        ...prev,
        [movie.id]: true,
      }));
    } catch (err) {
      console.error("Review save failed:", err);
      setError(err instanceof Error ? err.message : "Review save failed");
    } finally {
      setReviewLoadingMovieId(null);
    }
  };

  const deleteMovieReview = async (movieId: number) => {
    try {
      setReviewLoadingMovieId(movieId);

      const res = await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEV_USER_ID,
          movieId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete review");

      setUserReviews((prev) => {
        const next = { ...prev };
        delete next[movieId];
        return next;
      });
      setReviewDrafts((prev) => ({ ...prev, [movieId]: "" }));
      setReviewExpanded((prev) => ({ ...prev, [movieId]: false }));
    } catch (err) {
      console.error("Review delete failed:", err);
      setError(err instanceof Error ? err.message : "Review delete failed");
    } finally {
      setReviewLoadingMovieId(null);
    }
  };

  const fetchMovies = async ({
    searchTerm,
    genreId,
    mongoCategory,
    mode,
    limit,
    message,
    forceFamily = false,
    gOnly = false,
    excludedGenreIds = [],
    anyGenre = false,
    randomize = false,
  }: {
    searchTerm?: string;
    genreId?: string;
    mongoCategory?: string;
    mode: ActiveMode;
    limit: number;
    message: string;
    forceFamily?: boolean;
    gOnly?: boolean;
    excludedGenreIds?: string[];
    anyGenre?: boolean;
    randomize?: boolean;
  }) => {
    try {
      setLoading(true);
      setError("");
      setActiveMode(mode);
      setHasSearched(true);
      setSearchMessage(message);
      setResults([]);

      const effectiveFamily = forceFamily || familyFriendlyOn;
      let mongoResults: Movie[] = [];

      if (mongoCategory) {
        try {
          const mongoParams = new URLSearchParams();
          mongoParams.set("category", mongoCategory);
          mongoParams.set("limit", String(limit * 4));

          if (effectiveFamily) mongoParams.set("family", "true");
          if (gOnly) mongoParams.set("gOnly", "true");
          if (randomize) mongoParams.set("randomize", "true");
          if (hiddenTitles.length > 0) {
            mongoParams.set("excludeTitles", hiddenTitles.join(","));
          }
          if (hiddenMovieIds.length > 0) {
            mongoParams.set("excludeIds", hiddenMovieIds.join(","));
          }

          const mongoRes = await fetch(`/api/movies?${mongoParams.toString()}`, {
            cache: "no-store",
          });
          const mongoData = await mongoRes.json().catch(() => null);

          if (!mongoRes.ok) {
            throw new Error(mongoData?.error || "Database search failed");
          }

          const dbMovies: MongoMovie[] = Array.isArray(mongoData?.movies)
            ? mongoData.movies
            : [];

          mongoResults = dbMovies.map((movie, index) => {
            const matchedPlaceholder = PLACEHOLDER_MOVIES.find(
              (placeholder) => placeholder.id === movie.tmdbId
            );

            return normalizeMovie({
              id: movie.tmdbId || index + 1,
              title: movie.title || "Untitled",
              overview:
                movie.notes ||
                matchedPlaceholder?.overview ||
                "Curated from the ClearStream faith and family database.",
              notes: movie.notes,
              poster_path: matchedPlaceholder?.poster_path,
              release_date: matchedPlaceholder?.release_date,
              certification:
                matchedPlaceholder?.certification ||
                movie.customRating ||
                (movie.familySafe ? "NR" : undefined),
              customRating: movie.customRating,
              familySafe: movie.familySafe,
              vote_average: matchedPlaceholder?.vote_average,
              providers: [],
              providerLink: undefined,
              priceStatus: movie.customRating || "Curated by ClearStream.",
              source: "mongo",
            });
          });
        } catch (err) {
          console.error("Mongo fetch failed", err);
          mongoResults = [];
        }
      }

      const params = new URLSearchParams();
      const nonce = Date.now().toString();

      if (searchTerm?.trim()) params.set("q", searchTerm.trim());
      if (!anyGenre && genreId?.trim()) params.set("genre", genreId.trim());
      if (excludedGenreIds.length > 0) {
        params.set("excludeGenres", excludedGenreIds.join(","));
      }

      const excludedRatings: string[] = [];
      if (noRRatedOn) excludedRatings.push("R", "NC-17", "MA", "TV-MA");
      if (noPg13On) excludedRatings.push("PG-13");
      if (excludedRatings.length > 0) {
        params.set("excludeRatings", excludedRatings.join(","));
      }
      if (hiddenTitles.length > 0) {
        params.set("excludeTitles", hiddenTitles.join(","));
      }
      if (hiddenMovieIds.length > 0) {
        params.set("excludeIds", hiddenMovieIds.join(","));
      }

      params.set("family", effectiveFamily ? "true" : "false");
      params.set("mode", mode);
      if (gOnly) params.set("allowedRatings", "G");
      if (randomize) params.set("randomize", "true");
      params.set("region", "US");
      params.set("limit", String(limit * 2));
      params.set("minVoteCount", "3");
      params.set("minVoteAverage", "4.0");
      params.set("nonce", nonce);

      const res = await fetch(`/api/search?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Search failed");
      }

      const searchResults = Array.isArray(data?.results)
        ? (data.results as Movie[]).map((movie) =>
            normalizeMovie({
              ...movie,
              source:
                movie.source === "christian-ai"
                  ? "christian-ai"
                  : movie.source === "mongo"
                    ? "mongo"
                    : "tmdb",
            })
          )
        : [];

      const combinedResults =
        mode === "watchNow" || mode === "bestDeal"
          ? mergeUniqueMovies(searchResults, mongoResults)
          : mongoResults.length > 0
            ? mergeUniqueMovies(mongoResults, searchResults)
            : searchResults;

      const filteredBySafety = combinedResults.filter(
        (movie) =>
          !isExcludedBySafetyFilters(movie, { noRRatedOn, noPg13On })
      );

      const finalResults = sortMoviesForDisplay(filteredBySafety, {
        randomize,
        mode,
      });

      if (finalResults.length === 0) {
        setResults(getCategoryPlaceholderFallback(selectedCategory, limit));
        return;
      }

      setResults(finalResults.slice(0, limit));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setResults(getCategoryPlaceholderFallback(selectedCategory, 8));
    } finally {
      setLoading(false);
    }
  };

  const getFallbackSearchTerm = () => {
    if (query.trim()) return query.trim();
    return getCategoryFallbackQuery(selectedCategoryData, familyFriendlyOn);
  };

  const getMongoCategoryForSelection = (category?: Category | null) => {
    if (!category) return undefined;
    if (query.trim()) return undefined;
    return MONGO_CATEGORY_MAP[category.key];
  };

  const handleSearch = async () => {
    const typedQuery = query.trim();
    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);
    const fallbackSearch = getCategoryFallbackQuery(
      selectedCategoryData,
      familyFriendlyOn
    );

    const useTextFallback = shouldUseTextFallback(
      selectedCategoryData,
      typedQuery,
      mongoCategory
    );

    const genreId =
      !typedQuery &&
      !selectedCategoryData?.anyGenre &&
      !mongoCategory
        ? selectedCategoryData?.genreId
        : undefined;

    const gOnly = Boolean(
      selectedCategoryData?.gOnly ||
        (selectedCategoryData?.anyGenre && familyFriendlyOn)
    );

    const searchTerm =
      typedQuery || (useTextFallback ? fallbackSearch : undefined);

    if (
      !searchTerm &&
      !genreId &&
      !selectedCategoryData?.anyGenre &&
      !mongoCategory
    ) {
      return;
    }

    await fetchMovies({
      searchTerm,
      genreId: mongoCategory ? undefined : genreId,
      mongoCategory,
      mode: "search",
      limit: 12,
      message: searchTerm
        ? `Searching thousands of titles for the best matches for "${searchTerm}"...`
        : `Searching thousands of titles in ${
            selectedCategoryData?.label || "the selected category"
          }...`,
      gOnly,
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !typedQuery),
      randomize: true,
    });
  };

  const handleWatchNow = async () => {
    const typedQuery = query.trim();
    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);
    const categoryFallback = getCategoryFallbackQuery(
      selectedCategoryData,
      familyFriendlyOn
    );

    const fallbackTerm = familyFriendlyOn
      ? randomFrom([
          "toy story",
          "frozen",
          "finding nemo",
          "paddington",
          "winnie the pooh",
          "mary poppins",
          "the lion king",
        ])
      : randomFrom([
          "avengers",
          "avatar",
          "inception",
          "gladiator",
          "interstellar",
          "top gun",
          "mission impossible",
        ]);

    const useTextFallback = shouldUseTextFallback(
      selectedCategoryData,
      typedQuery,
      mongoCategory
    );

    await fetchMovies({
      searchTerm:
        typedQuery ||
        (useTextFallback ? categoryFallback || fallbackTerm : undefined),
      genreId:
        mongoCategory || typedQuery || selectedCategoryData?.anyGenre
          ? undefined
          : selectedCategoryData?.genreId,
      mongoCategory,
      mode: "watchNow",
      limit: 12,
      message: `Searching thousands of titles for the best Watch Now picks in ${
        selectedCategoryData?.label || "all categories"
      }...`,
      gOnly: Boolean(
        selectedCategoryData?.gOnly ||
          (selectedCategoryData?.anyGenre && familyFriendlyOn)
      ),
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !typedQuery),
      randomize: true,
    });
  };

  const handleBestDeal = async () => {
    const typedQuery = query.trim();
    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);
    const categoryFallback = getCategoryFallbackQuery(
      selectedCategoryData,
      familyFriendlyOn
    );

    const fallbackTerm =
      getFallbackSearchTerm() ||
      (familyFriendlyOn
        ? randomFrom([
            "frozen",
            "toy story",
            "paddington",
            "finding nemo",
            "shrek",
          ])
        : randomFrom([
            "batman",
            "rocky",
            "indiana jones",
            "mission impossible",
            "the matrix",
          ]));

    const useTextFallback = shouldUseTextFallback(
      selectedCategoryData,
      typedQuery,
      mongoCategory
    );

    await fetchMovies({
      searchTerm:
        typedQuery ||
        (useTextFallback ? categoryFallback || fallbackTerm : undefined),
      genreId:
        mongoCategory || typedQuery || selectedCategoryData?.anyGenre
          ? undefined
          : selectedCategoryData?.genreId,
      mongoCategory,
      mode: "bestDeal",
      limit: 8,
      message: `Searching thousands of titles for the best Best Deal picks in ${
        selectedCategoryData?.label || "all categories"
      }...`,
      gOnly: Boolean(
        selectedCategoryData?.gOnly ||
          (selectedCategoryData?.anyGenre && familyFriendlyOn)
      ),
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !typedQuery),
      randomize: true,
    });
  };

  const handleFamilyMovieNight = async () => {
    const typedQuery = query.trim();
    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);
    const categoryFallback = getCategoryFallbackQuery(selectedCategoryData, true);

    const fallbackTerm =
      typedQuery ||
      categoryFallback ||
      randomFrom([
        "great family movies",
        "best family adventure movies",
        "family movie night favorites",
        "great G rated family movies",
      ]);

    const useTextFallback = shouldUseTextFallback(
      selectedCategoryData,
      typedQuery,
      mongoCategory
    );

    await fetchMovies({
      searchTerm:
        typedQuery ||
        (useTextFallback ? categoryFallback || fallbackTerm : undefined),
      genreId:
        mongoCategory || typedQuery || selectedCategoryData?.anyGenre
          ? undefined
          : selectedCategoryData?.genreId || "10751",
      mongoCategory,
      mode: "familyNight",
      limit: 8,
      message: `Searching thousands of titles for the best Family Movie Night recommendations in ${
        selectedCategoryData?.label || "family favorites"
      }...`,
      forceFamily: true,
      gOnly: Boolean(
        selectedCategoryData?.gOnly || selectedCategoryData?.anyGenre
      ),
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !typedQuery),
      randomize: true,
    });
  };

  const handleSurpriseMe = async () => {
    const typedQuery = query.trim();
    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);
    const categoryFallback = getCategoryFallbackQuery(
      selectedCategoryData,
      familyFriendlyOn
    );

    const fallbackTerm =
      getFallbackSearchTerm() ||
      (familyFriendlyOn
        ? randomFrom([
            "toy story",
            "frozen",
            "finding nemo",
            "shrek",
            "paddington",
          ])
        : randomFrom([
            "inception",
            "interstellar",
            "the dark knight",
            "gladiator",
            "avatar",
          ]));

    const useTextFallback = shouldUseTextFallback(
      selectedCategoryData,
      typedQuery,
      mongoCategory
    );

    await fetchMovies({
      searchTerm:
        typedQuery ||
        (useTextFallback ? categoryFallback || fallbackTerm : undefined),
      genreId:
        mongoCategory || typedQuery || selectedCategoryData?.anyGenre
          ? undefined
          : selectedCategoryData?.genreId,
      mongoCategory,
      mode: "surprise",
      limit: 8,
      message: `Searching thousands of titles for a great surprise recommendation in ${
        selectedCategoryData?.label || "all categories"
      }...`,
      gOnly: Boolean(
        selectedCategoryData?.gOnly ||
          (selectedCategoryData?.anyGenre && familyFriendlyOn)
      ),
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !typedQuery),
      randomize: true,
    });
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category.key);
    setRippleJumpSeed((prev) => prev + 1);

    const typedQuery = query.trim();
    const mongoCategory = !typedQuery
      ? MONGO_CATEGORY_MAP[category.key]
      : undefined;
    const categoryFallback = getCategoryFallbackQuery(
      category,
      familyFriendlyOn
    );

    const useTextFallback = shouldUseTextFallback(
      category,
      typedQuery,
      mongoCategory
    );

    await fetchMovies({
      searchTerm:
        typedQuery || (useTextFallback ? categoryFallback || undefined : undefined),
      genreId:
        mongoCategory || category.anyGenre || typedQuery
          ? undefined
          : category.genreId,
      mongoCategory,
      mode: "search",
      limit: 8,
      message: `Ripple is searching thousands of titles in ${category.label}...`,
      forceFamily: familyFriendlyOn,
      gOnly: Boolean(category.gOnly || (category.anyGenre && familyFriendlyOn)),
      excludedGenreIds: category.excludedGenreIds || [],
      anyGenre: Boolean(category.anyGenre && !typedQuery),
      randomize: true,
    });
  };

  const handleAuthSubmit = (mode: "signin" | "signup") => {
    setError(
      mode === "signup"
        ? "Sign-up UI is ready. Backend account creation still needs to be connected."
        : "Sign-in UI is ready. Backend authentication still needs to be connected."
    );
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#123a73_0%,_#0b1f47_32%,_#07152f_68%,_#050d1e_100%)] text-white">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-8 md:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0">
            <div className="text-center lg:text-left">
              <img
                src="/images/clearstream-wordmark.png"
                alt="ClearStream"
                className="mx-auto mb-2 h-[20rem] w-auto max-w-full md:h-[28rem] lg:mx-0 lg:h-[36rem] xl:h-[40rem]"
              />

              <p className="mt-2 text-lg text-slate-200 md:text-xl">
                Find where movies are streaming instantly
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 md:flex-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Search for a movie or click a pond category..."
                className="min-w-0 flex-1 rounded-full border border-cyan-400/20 bg-white px-6 py-4 text-lg text-black outline-none focus:border-cyan-400"
              />

              <button
                onClick={handleSearch}
                className="shrink-0 rounded-full bg-cyan-600 px-8 py-4 text-lg font-semibold transition hover:bg-cyan-500"
              >
                Search
              </button>
            </div>

            {statusBadges.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {statusBadges.map((badge) => (
                  <div
                    key={badge}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-[0_0_20px_rgba(74,222,128,0.18)]"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <div
                ref={pondTrackRef}
                className="relative rounded-[28px] border border-cyan-500/15 bg-cyan-950/15 p-4 md:p-5"
              >
                {selectedCategory && (
                  <div
                    className="pointer-events-none absolute z-20 transition-all duration-500"
                    style={{
                      transform: `translate(${ripplePosition.x}px, ${ripplePosition.y}px)`,
                    }}
                  >
                    <img
                      key={rippleJumpSeed}
                      src="/images/ripple-jump.png"
                      alt="Ripple"
                      className="h-16 w-16 object-contain drop-shadow-[0_0_24px_rgba(34,211,238,0.55)] md:h-20 md:w-20"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-8 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {CATEGORIES.map((category) => {
                    const active = selectedCategory === category.key;

                    return (
                      <button
                        key={category.key}
                        ref={(el: HTMLButtonElement | null) => {
                          pondRefs.current[category.key] = el;
                        }}
                        onClick={() => handleCategoryClick(category)}
                        className={`relative min-h-[74px] rounded-full border px-5 py-4 text-center text-sm font-bold shadow-lg transition md:text-base ${
                          active
                            ? "scale-[1.02] border-cyan-200 bg-cyan-500 text-white shadow-[0_0_0_2px_rgba(125,211,252,0.45),0_0_28px_rgba(34,211,238,0.55),0_0_60px_rgba(59,130,246,0.22)]"
                            : "border-cyan-400/30 bg-cyan-700/35 text-cyan-100 hover:bg-cyan-600/45 hover:shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <FeatureButton
                label="Watch Now"
                image="/images/ripple-watchnow.png"
                active={activeMode === "watchNow"}
                onClick={handleWatchNow}
              />
              <FeatureButton
                label="Best Deal"
                image="/images/ripple-bestdeal.png"
                active={activeMode === "bestDeal"}
                onClick={handleBestDeal}
              />
              <FeatureButton
                label="Family Movie Night"
                image="/images/ripple-family.png"
                active={activeMode === "familyNight"}
                onClick={handleFamilyMovieNight}
              />
              <FeatureButton
                label="Surprise Me"
                image="/images/ripple-surpriseme.png"
                active={activeMode === "surprise"}
                onClick={handleSurpriseMe}
              />
            </div>

            {loading && (
              <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-cyan-200">
                {searchMessage}
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="mt-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {hasSearched ? "Results" : "Featured Picks"}
                    </h2>
                    <div className="mt-1 text-sm text-slate-300">
                      {hasSearched
                        ? `${displayedResults.length} title${
                            displayedResults.length === 1 ? "" : "s"
                          } shown${
                            selectedCategoryData
                              ? ` in ${selectedCategoryData.label}`
                              : ""
                          }`
                        : "Start with a search or choose a category"}
                    </div>
                  </div>

                  {hasSearched && searchMessage && (
                    <div className="text-sm text-cyan-200">{searchMessage}</div>
                  )}
                  {hiddenTitles.length > 0 && (
                    <button
                      onClick={restoreHiddenTitles}
                      className="rounded-full border border-slate-600 bg-slate-900/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/70"
                    >
                      Restore hidden titles ({hiddenTitles.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {displayedResults.map((movie) => {
                    const favorite = isFavorite(movie.id);
                    const rating = getMovieRating(movie.id);
                    const reviewText = getMovieReviewText(movie.id);
                    const reviewBusy = reviewLoadingMovieId === movie.id;
                    const rippleBadge = getRippleConfidence(movie, {
                      familyFriendlyOn,
                      activeMode,
                      gOnly: Boolean(
                        selectedCategoryData?.gOnly ||
                          (selectedCategoryData?.anyGenre && familyFriendlyOn)
                      ),
                    });
                    const displayRating = getNormalizedRating(movie);
                    const posterUrl = getDisplayPosterUrl(
                      movie,
                      familyFriendlyOn
                    );
                    const groupedProviders = getGroupedProviders(movie.providers);
                    const providerChips = getProviderTypeChips(movie);
                    const bestSummary = getBestProviderSummary(movie);
                    const providerOpen = Boolean(providerExpanded[movie.id]);
                    const reviewOpen =
                      Boolean(reviewExpanded[movie.id]) ||
                      Boolean(userReviews[movie.id]) ||
                      Boolean(reviewDrafts[movie.id]);
                    const primaryActionLabel = getPrimaryActionLabel(movie);

                    return (
                      <div
                        key={`${movie.id}-${movie.title}`}
                        className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#10244b]/95 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                      >
                        <img
                          src={posterUrl}
                          alt={movie.title}
                          className="h-[270px] w-full cursor-pointer object-cover md:h-[300px]"
                          onClick={() => addRecentlyViewed(movie)}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (
                              !target.src.endsWith(FAMILY_SAFE_POSTER_PLACEHOLDER)
                            ) {
                              target.src = FAMILY_SAFE_POSTER_PLACEHOLDER;
                            }
                          }}
                        />

                        <div className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="line-clamp-2 text-lg font-bold text-white">
                                {movie.title}
                              </h2>

                              {movie.release_date && (
                                <div className="mt-0.5 text-sm text-slate-400">
                                  {movie.release_date}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => toggleFavorite(movie)}
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                                favorite
                                  ? "bg-pink-600 text-white"
                                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                              }`}
                            >
                              {favorite ? "★ Favorite" : "☆ Favorite"}
                            </button>
                          </div>

                          <div className="mb-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${rippleBadge.className}`}
                            >
                              {rippleBadge.label}
                            </span>

                            {displayRating && (
                              <span className="rounded-full bg-cyan-900/60 px-3 py-1 text-[11px] text-cyan-100">
                                Rated {displayRating}
                              </span>
                            )}

                            {typeof movie.vote_average === "number" && (
                              <span className="rounded-full bg-amber-900/50 px-3 py-1 text-[11px] text-amber-200">
                                TMDB {movie.vote_average.toFixed(1)}
                              </span>
                            )}
                          </div>

                          <p className="line-clamp-2 text-sm text-slate-300">
                            {movie.overview || "Overview unavailable"}
                          </p>

                          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                            <div className="text-sm font-semibold text-emerald-200">
                              {bestSummary}
                            </div>

                            {providerChips.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {providerChips.map((type) => (
                                  <span
                                    key={`${movie.id}-${type}`}
                                    className="rounded-full border border-slate-600/60 bg-slate-900/35 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                                  >
                                    {PROVIDER_LABELS[type]}
                                  </span>
                                ))}
                              </div>
                            )}

                            {movie.priceStatus &&
                              movie.priceStatus !== bestSummary && (
                                <div className="mt-2 text-xs text-emerald-100/80">
                                  {movie.priceStatus}
                                </div>
                              )}
                          </div>

                          {(movie.providers?.length || 0) > 0 && (
                            <div className="mt-3">
                              <button
                                onClick={() => toggleProviderExpanded(movie.id)}
                                className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                              >
                                {providerOpen
                                  ? "Hide providers"
                                  : "More ways to watch"}
                              </button>

                              {providerOpen && (
                                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/25 p-3 text-sm">
                                  {(["free", "stream", "rent", "buy"] as const).map(
                                    (type) =>
                                      groupedProviders[type].length > 0 ? (
                                        <div
                                          key={`${movie.id}-${type}`}
                                          className="mb-2 last:mb-0"
                                        >
                                          <div className="font-semibold text-slate-100">
                                            {PROVIDER_LABELS[type]}
                                          </div>
                                          <div className="mt-1 text-slate-300">
                                            {groupedProviders[type].join(", ")}
                                          </div>
                                        </div>
                                      ) : null
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-3">
                            <a
                              href={
                                movie.providerLink && movie.providerLink.trim()
                                  ? movie.providerLink
                                  : `https://www.themoviedb.org/movie/${movie.id}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => addRecentlyViewed(movie)}
                              className="inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                            >
                              {primaryActionLabel}
                            </a>

                            <button
                              onClick={() => addRecentlyViewed(movie)}
                              className="rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
                            >
                              Viewed
                            </button>

                            <button
                              onClick={() => toggleReviewExpanded(movie.id)}
                              className="rounded-full border border-slate-600 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
                            >
                              {reviewOpen ? "Hide Review" : "Write Review"}
                            </button>

                            <button
                              onClick={() => hideMovie(movie)}
                              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
                            >
                              Don&apos;t Show Again
                            </button>
                          </div>

                          {reviewOpen && (
                            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/30 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <div className="text-sm font-semibold text-white">
                                  Your Review
                                </div>

                                {userReviews[movie.id] && (
                                  <button
                                    onClick={() => deleteMovieReview(movie.id)}
                                    disabled={reviewBusy}
                                    className="text-xs text-red-300 hover:text-red-200 disabled:opacity-60"
                                  >
                                    Delete Review
                                  </button>
                                )}
                              </div>

                              <div className="mb-3 flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() =>
                                      saveMovieReview(
                                        movie,
                                        star,
                                        getMovieReviewText(movie.id)
                                      )
                                    }
                                    disabled={reviewBusy}
                                    className={`text-2xl leading-none transition ${
                                      star <= rating
                                        ? "text-yellow-400"
                                        : "text-slate-500 hover:text-yellow-300"
                                    } disabled:opacity-60`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>

                              <textarea
                                value={reviewText}
                                onChange={(e) =>
                                  setMovieReviewDraft(movie.id, e.target.value)
                                }
                                placeholder="Write a short review..."
                                className="min-h-[88px] w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                              />

                              <div className="mt-3 flex gap-3">
                                <button
                                  onClick={() =>
                                    saveMovieReview(
                                      movie,
                                      Math.max(rating, 1),
                                      reviewText
                                    )
                                  }
                                  disabled={reviewBusy}
                                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                                >
                                  {reviewBusy ? "Saving..." : "Save Review"}
                                </button>
                              </div>
                            </div>
                          )}

                          {familyFriendlyOn && isNotRatedLike(movie) && (
                            <div className="mt-3 rounded-full bg-emerald-900/50 px-3 py-1 text-[11px] text-emerald-200">
                              Family-safe poster shown
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-4 text-lg font-bold text-white">
                  Your Favorites
                </h3>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                  {favorites.map((movie) => (
                    <button
                      key={`favorite-${movie.id}`}
                      onClick={() => addRecentlyViewed(movie)}
                      className="overflow-hidden rounded-xl border border-slate-700 bg-[#10244b]"
                    >
                      <img
                        src={getDisplayPosterUrl(movie, familyFriendlyOn)}
                        alt={movie.title}
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (
                            !target.src.endsWith(FAMILY_SAFE_POSTER_PLACEHOLDER)
                          ) {
                            target.src = FAMILY_SAFE_POSTER_PLACEHOLDER;
                          }
                        }}
                      />
                      <div className="p-2 text-sm text-white">
                        {movie.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recentlyViewed.length > 0 && (
              <div className="mt-10">
                <h3 className="mb-4 text-lg font-bold text-white">
                  Recently Viewed
                </h3>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
                  {recentlyViewed.map((movie) => (
                    <div
                      key={`recent-${movie.id}`}
                      className="overflow-hidden rounded-xl border border-slate-700 bg-[#10244b]"
                    >
                      <img
                        src={getDisplayPosterUrl(movie, familyFriendlyOn)}
                        alt={movie.title}
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (
                            !target.src.endsWith(FAMILY_SAFE_POSTER_PLACEHOLDER)
                          ) {
                            target.src = FAMILY_SAFE_POSTER_PLACEHOLDER;
                          }
                        }}
                      />
                      <div className="p-2 text-sm text-white">
                        {movie.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-8 space-y-6">
              <FamilyFriendlyPanel
                familyFriendlyOn={familyFriendlyOn}
                onToggle={() => setFamilyFriendlyOn((prev) => !prev)}
                noRRatedOn={noRRatedOn}
                onToggleNoRRated={() => setNoRRatedOn((prev) => !prev)}
                noPg13On={noPg13On}
                onToggleNoPg13={() => setNoPg13On((prev) => !prev)}
              />

              <AuthPanel
                authMode={authMode}
                setAuthMode={setAuthMode}
                authName={authName}
                setAuthName={setAuthName}
                authEmail={authEmail}
                setAuthEmail={setAuthEmail}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                onSubmit={handleAuthSubmit}
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

type FeatureButtonProps = {
  label: string;
  image: string;
  active: boolean;
  onClick: () => void;
};

function FeatureButton({
  label,
  image,
  active,
  onClick,
}: FeatureButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 transition ${
        active
          ? "border-cyan-400 bg-cyan-600/20 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
          : "border-slate-700 bg-[#10244b] hover:border-cyan-500/30 hover:bg-[#12305f]"
      }`}
    >
      <img src={image} alt={label} className="mx-auto h-12" />
      <div className="mt-2 font-semibold text-white">{label}</div>
    </button>
  );
}

function FamilyFriendlyPanel({
  familyFriendlyOn,
  onToggle,
  noRRatedOn,
  onToggleNoRRated,
  noPg13On,
  onToggleNoPg13,
}: {
  familyFriendlyOn: boolean;
  onToggle: () => void;
  noRRatedOn: boolean;
  onToggleNoRRated: () => void;
  noPg13On: boolean;
  onToggleNoPg13: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onToggle}
        className={`h-[260px] w-[260px] overflow-hidden rounded-full transition ${
          familyFriendlyOn
            ? "ring-8 ring-emerald-300 shadow-[0_0_55px_rgba(34,197,94,0.95)]"
            : "ring-0"
        }`}
      >
        <img
          src="/images/ripple-choosefamily.png"
          alt={familyFriendlyOn ? "Family Friendly On" : "Family Friendly Off"}
          className="h-full w-full object-cover"
        />
      </button>

      {familyFriendlyOn && (
        <div className="mt-3 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-center text-sm font-semibold text-emerald-200">
          Family friendly mode ON
        </div>
      )}

      <button
        onClick={onToggleNoRRated}
        className={`mt-4 rounded-xl border px-4 py-2 transition ${
          noRRatedOn
            ? "border-cyan-400 bg-cyan-600/20 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
            : "border-slate-600 text-white"
        }`}
      >
        No R Rated
      </button>

      {noRRatedOn && (
        <div className="mt-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
          No R rated titles
        </div>
      )}

      <button
        onClick={onToggleNoPg13}
        className={`mt-3 rounded-xl border px-4 py-2 transition ${
          noPg13On
            ? "border-cyan-400 bg-cyan-600/20 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
            : "border-slate-600 text-white"
        }`}
      >
        No PG-13
      </button>

      {noPg13On && (
        <div className="mt-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
          No PG-13 titles
        </div>
      )}
    </div>
  );
}

function AuthPanel({
  authMode,
  setAuthMode,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  onSubmit,
}: {
  authMode: "signin" | "signup";
  setAuthMode: (mode: "signin" | "signup") => void;
  authName: string;
  setAuthName: (value: string) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  onSubmit: (mode: "signin" | "signup") => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-[#10244b]/90 p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">Account</h3>
        <p className="mt-1 text-sm text-slate-300">
          Save watched titles, hidden titles, banned titles, ratings, and future Ripple rewards.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setAuthMode("signin")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
            authMode === "signin"
              ? "bg-cyan-600 text-white"
              : "bg-slate-800 text-slate-200"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setAuthMode("signup")}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
            authMode === "signup"
              ? "bg-cyan-600 text-white"
              : "bg-slate-800 text-slate-200"
          }`}
        >
          Sign Up
        </button>
      </div>

      <div className="space-y-3">
        {authMode === "signup" && (
          <input
            type="text"
            value={authName}
            onChange={(e) => setAuthName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        )}

        <input
          type="email"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400"
        />

        <input
          type="password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400"
        />

        <button
          onClick={() => onSubmit(authMode)}
          className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          {authMode === "signup" ? "Create Account" : "Sign In"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-100">
        Planned account features: watch history, banned movie list, favorites,
        highly rated movies, Ripple points, and reward redemption.
      </div>
    </div>
  );
}
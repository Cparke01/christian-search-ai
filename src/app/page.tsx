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
  vote_average?: number;
  providers?: ProviderInfo[];
  providerLink?: string;
  priceStatus?: string;
  source?: "tmdb" | "mongo";
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
    fallbackQuery: "",
    anyGenre: true,
    gOnly: true,
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
    fallbackQuery: "best family animal adventure movies",
  },
  {
    key: "childrensnook",
    label: "Children's Nook",
    fallbackQuery: "best G rated kids movies ages 5 to 12",
    gOnly: true,
  },
  {
    key: "preschool",
    label: "Preschool Playground",
    fallbackQuery: "best G rated preschool movies for little kids",
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
    fallbackQuery: "best christian family movies and documentaries",
  },
  {
    key: "sports",
    label: "Sports",
    fallbackQuery: "best sports movies and documentaries",
  },
  {
    key: "mystery",
    label: "Mystery",
    fallbackQuery: "family mystery adventure movies",
    excludedGenreIds: ["27", "53", "80"],
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

function getPosterUrl(path?: string) {
  if (!path) return "/images/poster-fallback.png";
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

function getRippleConfidence(
  movie: Movie,
  options: {
    familyFriendlyOn: boolean;
    activeMode: ActiveMode;
    gOnly: boolean;
  }
) {
  const hasProviders = Boolean(movie.providers && movie.providers.length > 0);
  const cert = (movie.certification || "").toUpperCase();

  if (
    hasProviders &&
    (cert === "G" ||
      cert === "PG" ||
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
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [rippleJumpSeed, setRippleJumpSeed] = useState(0);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Movie[]>([]);
  const [rippleOffset, setRippleOffset] = useState(0);
  const [userReviews, setUserReviews] = useState<Record<number, UserReview>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, string>>({});
  const [reviewLoadingMovieId, setReviewLoadingMovieId] = useState<number | null>(null);
  const pondRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pondTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentlyViewed(
      safeLocalStorageGet<Movie[]>("clearstream_recently_viewed", [])
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

  const displayedResults = useMemo(() => {
    return hasSearched ? results : PLACEHOLDER_MOVIES;
  }, [hasSearched, results]);

  const selectedCategoryData = useMemo(() => {
    return CATEGORIES.find((category) => category.key === selectedCategory) || null;
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) {
      setRippleOffset(0);
      return;
    }

    const pondEl = pondRefs.current[selectedCategory];
    const trackEl = pondTrackRef.current;

    if (!pondEl || !trackEl) return;

    const pondRect = pondEl.getBoundingClientRect();
    const trackRect = trackEl.getBoundingClientRect();

    const center = pondRect.left - trackRect.left + pondRect.width / 2 - 28;
    setRippleOffset(center);
  }, [selectedCategory, rippleJumpSeed]);

  const toggleFavorite = async (movie: Movie) => {
    const exists = favorites.some((item) => item.id === movie.id);

    try {
      if (exists) {
        const res = await fetch("/api/favorites", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: DEV_USER_ID,
            movieId: movie.id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to remove favorite");
        }

        setFavorites((prev) => prev.filter((item) => item.id !== movie.id));
        return;
      }

      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: DEV_USER_ID,
          movieId: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add favorite");
      }

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: DEV_USER_ID,
        movieId: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to update history");
    }

    setRecentlyViewed((prev) => {
      const deduped = prev.filter((item) => item.id !== movie.id);
      return [movie, ...deduped].slice(0, 16);
    });
  } catch (err) {
    console.error("History update failed:", err);
    setError(err instanceof Error ? err.message : "History action failed");
  }
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
  setReviewDrafts((prev) => ({
    ...prev,
    [movieId]: value,
  }));
};

const saveMovieReview = async (movie: Movie, rating: number, reviewText?: string) => {
  try {
    setReviewLoadingMovieId(movie.id);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

    if (!res.ok) {
      throw new Error(data.error || "Failed to save review");
    }

    const savedReview: UserReview = data.review;

    setUserReviews((prev) => ({
      ...prev,
      [movie.id]: savedReview,
    }));

    setReviewDrafts((prev) => ({
      ...prev,
      [movie.id]: savedReview.review || "",
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: DEV_USER_ID,
        movieId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete review");
    }

    setUserReviews((prev) => {
      const next = { ...prev };
      delete next[movieId];
      return next;
    });

    setReviewDrafts((prev) => ({
      ...prev,
      [movieId]: "",
    }));
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

      const effectiveFamily = forceFamily || familyFriendlyOn;

      if (mongoCategory) {
        const mongoParams = new URLSearchParams();
        mongoParams.set("category", mongoCategory);

        if (effectiveFamily) {
          mongoParams.set("family", "true");
        }

        const mongoRes = await fetch(`/api/movies?${mongoParams.toString()}`);
        const mongoData = await mongoRes.json();

        if (!mongoRes.ok) {
          throw new Error(mongoData.error || "Database search failed");
        }

        const dbMovies: MongoMovie[] = Array.isArray(mongoData.movies)
          ? mongoData.movies
          : [];

        let normalizedMovies: Movie[] = dbMovies.map((movie, index) => {
          const matchedPlaceholder = PLACEHOLDER_MOVIES.find(
            (placeholder) => placeholder.id === movie.tmdbId
          );

          return {
            id: movie.tmdbId || index + 1,
            title: movie.title || "Untitled",
            overview:
              movie.notes ||
              matchedPlaceholder?.overview ||
              "Curated from the ClearStream faith and family database.",
            poster_path: matchedPlaceholder?.poster_path,
            release_date: matchedPlaceholder?.release_date,
            certification:
              matchedPlaceholder?.certification ||
              (movie.familySafe ? "G" : undefined),
            vote_average: matchedPlaceholder?.vote_average,
            providers: [],
            providerLink: undefined,
            priceStatus: movie.customRating || "Curated by ClearStream.",
            source: "mongo",
          };
        });

        if (randomize || mode === "surprise" || mode === "familyNight") {
          normalizedMovies = shuffleItems(normalizedMovies);
        }

        setResults(normalizedMovies.slice(0, limit));
        return;
      }

      const params = new URLSearchParams();
      const nonce = Date.now().toString();

      if (!anyGenre && searchTerm?.trim()) {
        params.set("q", searchTerm.trim());
      }

      if (!anyGenre && genreId?.trim()) {
        params.set("genre", genreId.trim());
      }

      if (excludedGenreIds.length > 0) {
        params.set("excludeGenres", excludedGenreIds.join(","));
      }

      const excludedRatings: string[] = [];

      if (noRRatedOn) {
        excludedRatings.push("R", "NC-17", "MA", "TV-MA");
      }

      if (noPg13On) {
        excludedRatings.push("PG-13");
      }

      if (excludedRatings.length > 0) {
        params.set("excludeRatings", excludedRatings.join(","));
      }

      params.set("family", effectiveFamily ? "true" : "false");

      if (mode === "watchNow") params.set("mode", "watchNow");
      if (mode === "bestDeal") params.set("mode", "bestDeal");
      if (mode === "familyNight") {
        params.set("mode", "family");
        params.set("family", "true");
      }
      if (mode === "surprise") params.set("mode", "surprise");

      if (gOnly) {
        params.set("allowedRatings", "G");
      }

      if (randomize) {
        params.set("randomize", "true");
      }

      params.set("region", "US");
      params.set("limit", String(limit));
      params.set("minVoteCount", "5");
      params.set("minVoteAverage", "4.8");
      params.set("nonce", nonce);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      const nextResults = Array.isArray(data.results)
        ? (data.results as Movie[]).map((movie) => ({
            ...movie,
            source: "tmdb" as const,
          }))
        : [];

      setResults(nextResults);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackSearchTerm = () => {
    if (query.trim()) return query.trim();
    if (selectedCategoryData) return selectedCategoryData.fallbackQuery;
    return "";
  };

  const getMongoCategoryForSelection = (category?: Category | null) => {
    if (!category) return undefined;
    if (query.trim()) return undefined;
    return MONGO_CATEGORY_MAP[category.key];
  };

  const handleSearch = async () => {
    const searchTerm = getFallbackSearchTerm();
    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);
    const shouldUseMysteryFallback = selectedCategoryData?.key === "mystery";

    const genreId =
      !query.trim() &&
      !selectedCategoryData?.anyGenre &&
      !mongoCategory &&
      !shouldUseMysteryFallback
        ? selectedCategoryData?.genreId
        : undefined;

    const gOnly = Boolean(
      selectedCategoryData?.gOnly ||
        (selectedCategoryData?.anyGenre && familyFriendlyOn)
    );

    if (
      !searchTerm &&
      !genreId &&
      !selectedCategoryData?.anyGenre &&
      !mongoCategory
    ) {
      return;
    }

    await fetchMovies({
      searchTerm:
        mongoCategory || (selectedCategoryData?.anyGenre && !query.trim())
          ? undefined
          : query.trim()
            ? searchTerm
            : shouldUseMysteryFallback || !selectedCategoryData?.genreId
              ? searchTerm
              : undefined,
      genreId: mongoCategory ? undefined : genreId,
      mongoCategory,
      mode: "search",
      limit: 12,
      message: searchTerm
        ? `Searching thousands of titles for the best matches for "${searchTerm}"...`
        : `Searching thousands of titles in ${selectedCategoryData?.label || "the selected category"}...`,
      gOnly,
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !query.trim()),
      randomize: true,
    });
  };

  const handleWatchNow = async () => {
    const fallbackTerm =
      getFallbackSearchTerm() ||
      (familyFriendlyOn
        ? randomFrom(["toy story", "frozen", "finding nemo", "shrek", "paddington"])
        : randomFrom(["avengers", "avatar", "inception", "gladiator", "interstellar"]));

    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);

    await fetchMovies({
      searchTerm:
        mongoCategory ||
        (query.trim() ||
        (!selectedCategoryData?.genreId && !selectedCategoryData?.anyGenre))
          ? mongoCategory
            ? undefined
            : fallbackTerm
          : undefined,
      genreId:
        mongoCategory || (!query.trim() && !selectedCategoryData?.anyGenre)
          ? mongoCategory
            ? undefined
            : selectedCategoryData?.genreId
          : undefined,
      mongoCategory,
      mode: "watchNow",
      limit: 8,
      message: `Searching thousands of titles for the best Watch Now picks in ${
        selectedCategoryData?.label || "all categories"
      }...`,
      gOnly: Boolean(
        selectedCategoryData?.gOnly ||
          (selectedCategoryData?.anyGenre && familyFriendlyOn)
      ),
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !query.trim()),
      randomize: true,
    });
  };

  const handleBestDeal = async () => {
    const fallbackTerm =
      getFallbackSearchTerm() ||
      (familyFriendlyOn
        ? randomFrom(["frozen", "toy story", "paddington", "finding nemo", "shrek"])
        : randomFrom([
            "batman",
            "rocky",
            "indiana jones",
            "mission impossible",
            "the matrix",
          ]));

    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);

    await fetchMovies({
      searchTerm:
        mongoCategory ||
        (query.trim() ||
        (!selectedCategoryData?.genreId && !selectedCategoryData?.anyGenre))
          ? mongoCategory
            ? undefined
            : fallbackTerm
          : undefined,
      genreId:
        mongoCategory || (!query.trim() && !selectedCategoryData?.anyGenre)
          ? mongoCategory
            ? undefined
            : selectedCategoryData?.genreId
          : undefined,
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
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !query.trim()),
      randomize: true,
    });
  };

  const handleFamilyMovieNight = async () => {
    const fallbackTerm =
      query.trim() ||
      selectedCategoryData?.fallbackQuery ||
      randomFrom([
        "great family movies",
        "best family adventure movies",
        "family movie night favorites",
        "great G rated family movies",
      ]);

    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);

    await fetchMovies({
      searchTerm:
        mongoCategory ||
        (query.trim() ||
        (!selectedCategoryData?.genreId && !selectedCategoryData?.anyGenre))
          ? mongoCategory
            ? undefined
            : fallbackTerm
          : undefined,
      genreId:
        mongoCategory || (!query.trim() && !selectedCategoryData?.anyGenre)
          ? mongoCategory
            ? undefined
            : selectedCategoryData?.genreId || "10751"
          : undefined,
      mongoCategory,
      mode: "familyNight",
      limit: 8,
      message: `Searching thousands of titles for the best Family Movie Night recommendations in ${
        selectedCategoryData?.label || "family favorites"
      }...`,
      forceFamily: true,
      gOnly: Boolean(selectedCategoryData?.gOnly || selectedCategoryData?.anyGenre),
      excludedGenreIds: selectedCategoryData?.excludedGenreIds || [],
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !query.trim()),
      randomize: true,
    });
  };

  const handleSurpriseMe = async () => {
    const fallbackTerm =
      getFallbackSearchTerm() ||
      (familyFriendlyOn
        ? randomFrom(["toy story", "frozen", "finding nemo", "shrek", "paddington"])
        : randomFrom([
            "inception",
            "interstellar",
            "the dark knight",
            "gladiator",
            "avatar",
          ]));

    const mongoCategory = getMongoCategoryForSelection(selectedCategoryData);

    await fetchMovies({
      searchTerm:
        mongoCategory ||
        (query.trim() ||
        (!selectedCategoryData?.genreId && !selectedCategoryData?.anyGenre))
          ? mongoCategory
            ? undefined
            : fallbackTerm
          : undefined,
      genreId:
        mongoCategory || (!query.trim() && !selectedCategoryData?.anyGenre)
          ? mongoCategory
            ? undefined
            : selectedCategoryData?.genreId
          : undefined,
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
      anyGenre: Boolean(selectedCategoryData?.anyGenre && !query.trim()),
      randomize: true,
    });
  };

  const handleCategoryClick = async (category: Category) => {
    setSelectedCategory(category.key);
    setRippleJumpSeed((prev) => prev + 1);

    const mongoCategory = !query.trim()
      ? MONGO_CATEGORY_MAP[category.key]
      : undefined;

    const shouldUseFallbackOnly =
      !mongoCategory && !category.anyGenre && !category.genreId;

    const shouldUseMysteryFallback = category.key === "mystery";

    await fetchMovies({
      searchTerm:
        mongoCategory || category.anyGenre
          ? undefined
          : shouldUseMysteryFallback || shouldUseFallbackOnly
            ? category.fallbackQuery
            : undefined,
      genreId:
        mongoCategory || category.anyGenre || shouldUseMysteryFallback
          ? undefined
          : category.genreId,
      mongoCategory,
      mode: "search",
      limit: 8,
      message: `Ripple is searching thousands of titles in ${category.label}...`,
      forceFamily: familyFriendlyOn,
      gOnly: Boolean(category.gOnly || (category.anyGenre && familyFriendlyOn)),
      excludedGenreIds: category.excludedGenreIds || [],
      anyGenre: Boolean(category.anyGenre),
      randomize: true,
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#123a73_0%,_#0b1f47_32%,_#07152f_68%,_#050d1e_100%)] text-white">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-8 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="text-center lg:text-left">
              <img
                src="/images/clearstream-wordmark.png"
                alt="ClearStream"
                className="mb-2 mx-auto h-[12rem] w-auto max-w-full lg:mx-0 md:h-[16rem] lg:h-[22rem] xl:h-[26rem]"
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

            {recentlyViewed.length > 0 && (
              <div className="mt-8 rounded-[28px] border border-cyan-400/15 bg-[#0d1f42]/80 p-5 backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Recently Viewed</h2>
                    <p className="text-sm text-slate-300">
                      Quick return to titles you checked recently.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2">
                  {recentlyViewed.map((movie) => (
                    <button
                      key={`recent-${movie.id}`}
                      onClick={() => {
                        setResults([movie, ...results.filter((m) => m.id !== movie.id)]);
                        setHasSearched(true);
                      }}
                      className="w-[140px] shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-[#10244b] text-left transition hover:border-cyan-400/40"
                    >
                      <img
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="h-[190px] w-full object-cover"
                      />
                      <div className="p-3 text-sm font-semibold text-white">
                        {movie.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#0d1f42]/80 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <img
                  src="/images/ripple-jump.png"
                  alt="Ripple category guide"
                  className="h-12 w-auto shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white">
                    Ripple&apos;s Genre Ponds
                  </h2>
                  <p className="text-sm text-slate-300">
                    Click a pond and Ripple will jump across to search that category.
                  </p>
                </div>
              </div>

              <div className="pond-scroll relative overflow-x-auto pb-4">
                <div
                  ref={pondTrackRef}
                  className="relative inline-flex min-w-max gap-4 px-2 pt-24"
                >
                  <div
                    className="pointer-events-none absolute left-0 top-0 h-24 w-full"
                    style={{
                      transform: `translateX(${rippleOffset}px)`,
                      transition: "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <img
                      key={`${selectedCategory || "idle"}-${rippleJumpSeed}`}
                      src="/images/ripple-jump.png"
                      alt="Ripple jumping"
                      className="ripple-jump h-20 w-auto drop-shadow-[0_10px_18px_rgba(14,165,233,0.45)]"
                    />
                  </div>

                  {CATEGORIES.map((category) => (
                    <button
                      key={category.key}
                      ref={(el) => {
                        pondRefs.current[category.key] = el;
                      }}
                      onClick={() => handleCategoryClick(category)}
                      className={`pond-button relative h-[98px] w-[130px] shrink-0 overflow-hidden border transition ${
                        selectedCategory === category.key
                          ? "border-cyan-100 shadow-[0_0_30px_rgba(103,232,249,0.38)]"
                          : "border-cyan-950/60 hover:border-cyan-400/50"
                      }`}
                      title={category.label}
                    >
                      <span className="pond-depth absolute inset-0" />
                      <span className="pond-waterline absolute inset-[6px]" />
                      <span className="pond-shine absolute inset-0" />
                      <span className="pond-reeds-left absolute left-2 top-3" />
                      <span className="pond-reeds-right absolute right-2 top-2" />
                      <span
                        className={`absolute inset-0 ${
                          selectedCategory === category.key
                            ? "bg-cyan-300/10"
                            : "bg-transparent"
                        }`}
                      />
                      <span className="relative z-10 flex h-full w-full items-center justify-center px-3 text-center text-sm font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                        {category.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

            <div className="mt-6 xl:hidden">
              <FamilyFriendlyPanel
                familyFriendlyOn={familyFriendlyOn}
                onToggle={() => setFamilyFriendlyOn((prev) => !prev)}
                noRRatedOn={noRRatedOn}
                onToggleNoRRated={() => setNoRRatedOn((prev) => !prev)}
                noPg13On={noPg13On}
                onToggleNoPg13={() => setNoPg13On((prev) => !prev)}
              />
            </div>

            {(familyFriendlyOn || noRRatedOn || noPg13On || selectedCategoryData?.gOnly) && (
              <div className="mt-4 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                <div className="font-semibold">Safety filters active:</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {familyFriendlyOn && (
                    <span className="rounded-full border border-green-400/40 bg-green-500/10 px-3 py-1">
                      Family Friendly active
                    </span>
                  )}
                  {noRRatedOn && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1">
                      No R / NC-17 / MA / TV-MA
                    </span>
                  )}
                  {noPg13On && (
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1">
                      No PG-13
                    </span>
                  )}
                  {selectedCategoryData?.gOnly && (
                    <span className="rounded-full border border-pink-400/40 bg-pink-500/10 px-3 py-1">
                      {selectedCategoryData.label}: G only
                    </span>
                  )}
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div className="mt-6 rounded-xl border border-cyan-400/15 bg-[#0d1f42]/80 px-4 py-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Your Favorites</h3>
                    <p className="text-sm text-slate-400">
                      Saved to your ClearStream dev account.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {favorites.map((movie) => (
                    <button
                      key={`favorite-${movie.id}`}
                      onClick={() => {
                        addRecentlyViewed(movie);
                        setResults([movie, ...results.filter((m) => m.id !== movie.id)]);
                        setHasSearched(true);
                      }}
                      className="w-[130px] shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-[#10244b] text-left transition hover:border-cyan-400/50"
                    >
                      <img
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="h-[170px] w-full object-cover"
                      />
                      <div className="p-2 text-sm font-semibold text-white">
                        {movie.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-4">
                <p className="animate-pulse font-semibold text-cyan-200">
                  {searchMessage}
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:240ms]" />
                </div>
              </div>
            )}

            {error && <p className="mt-6 text-red-400">{error}</p>}

            {!loading && !error && hasSearched && results.length > 0 && (
              <div className="mt-6 text-sm text-slate-400">
                Showing {results.length} result{results.length !== 1 ? "s" : ""}
              </div>
            )}

            {!loading && !error && (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3">
                {displayedResults.map((movie) => {
                  const rippleConfidence = getRippleConfidence(movie, {
                    familyFriendlyOn,
                    activeMode,
                    gOnly: Boolean(selectedCategoryData?.gOnly),
                  });

                  return (
                    <div
                      key={movie.id}
                      className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#10244b]/95 shadow-lg backdrop-blur-sm"
                    >
                      <button
                        type="button"
                        onClick={() => addRecentlyViewed(movie)}
                        className="block w-full text-left"
                      >
                        <img
                          src={getPosterUrl(movie.poster_path)}
                          alt={movie.title}
                          className="h-[320px] w-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallbackApplied) {
                              target.dataset.fallbackApplied = "true";
                              target.src = "/images/poster-fallback.png";
                            }
                          }}
                        />
                      </button>

                      <div className="min-h-[380px] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-xl font-bold text-white">
                            {movie.title}
                          </h2>

                          <button
                            type="button"
                            onClick={() => toggleFavorite(movie)}
                            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition ${
                              isFavorite(movie.id)
                                ? "border-yellow-300/50 bg-yellow-500/15 text-yellow-200"
                                : "border-slate-600 bg-slate-800 text-slate-200 hover:border-cyan-400/50"
                            }`}
                            title="Save to favorites"
                          >
                            {isFavorite(movie.id) ? "★ Saved" : "☆ Favorite"}
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {movie.certification && (
                            <span className="inline-block rounded-full border border-green-500/30 bg-green-600/20 px-3 py-1 text-sm font-semibold text-green-300">
                              Rated {movie.certification}
                            </span>
                          )}

                          {typeof movie.vote_average === "number" &&
                            movie.vote_average > 0 && (
                              <span className="inline-block rounded-full border border-blue-500/30 bg-blue-600/20 px-3 py-1 text-sm font-semibold text-blue-300">
                                TMDB {movie.vote_average.toFixed(1)}/10
                              </span>
                            )}

                          {movie.release_date && (
                            <span className="inline-block rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300">
                              {movie.release_date}
                            </span>
                          )}

                          {hasSearched && (
                            <span
                              className={`inline-block rounded-full border px-3 py-1 text-sm font-semibold ${rippleConfidence.className}`}
                            >
                              {rippleConfidence.label}
                            </span>
                          )}
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-300">
                          {movie.overview && movie.overview.trim().length > 0
                            ? movie.overview
                            : "Overview unavailable."}
                        </p>

                        {hasSearched && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-slate-200">
                              Provider Status
                            </p>

                            {movie.providers && movie.providers.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {movie.providers.map((provider, index) => (
                                  <span
                                    key={`${movie.id}-${provider.name}-${index}`}
                                    className="inline-block rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200"
                                  >
                                    {provider.type === "stream" && `Stream on ${provider.name}`}
                                    {provider.type === "free" && `Free on ${provider.name}`}
                                    {provider.type === "rent" && `Rent on ${provider.name}`}
                                    {provider.type === "buy" && `Buy on ${provider.name}`}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-slate-400">
                                  Provider data not available.
                                </p>
                                <p className="text-sm text-amber-200">
                                  Ripple is uncertain about watch options for this movie.
                                </p>
                              </div>
                            )}

                            <p className="mt-3 text-sm text-slate-400">
                              {movie.providers && movie.providers.length > 0
                                ? movie.priceStatus ||
                                  "Price unavailable from current data source."
                                : "Watch availability has not been confirmed."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-3">
                              {movie.providerLink && (
                                <a
                                  href={movie.providerLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => addRecentlyViewed(movie)}
                                  className="inline-flex items-center rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                                >
                                  View Watch Options
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => addRecentlyViewed(movie)}
                                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/50"
                              >
                                Mark Viewed
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && hasSearched && results.length === 0 && (
              <p className="mt-8 text-slate-300">No results found for this mode.</p>
            )}
          </section>

          <aside className="hidden xl:block">
            <div className="sticky top-8">
              <FamilyFriendlyPanel
                familyFriendlyOn={familyFriendlyOn}
                onToggle={() => setFamilyFriendlyOn((prev) => !prev)}
                noRRatedOn={noRRatedOn}
                onToggleNoRRated={() => setNoRRatedOn((prev) => !prev)}
                noPg13On={noPg13On}
                onToggleNoPg13={() => setNoPg13On((prev) => !prev)}
              />
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .pond-scroll::-webkit-scrollbar {
          height: 10px;
        }

        .pond-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 999px;
        }

        .pond-scroll::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.35);
          border-radius: 999px;
        }

        .pond-button {
          border-radius: 41% 59% 55% 45% / 50% 40% 60% 50%;
          background:
            radial-gradient(
              circle at 52% 50%,
              rgba(45, 125, 170, 0.5),
              rgba(10, 34, 61, 0.9) 68%,
              rgba(5, 15, 35, 0.98) 100%
            );
          box-shadow:
            inset 0 16px 24px rgba(186, 230, 253, 0.08),
            inset 0 -18px 26px rgba(7, 31, 53, 0.82),
            0 14px 24px rgba(2, 6, 23, 0.5),
            0 0 0 2px rgba(12, 74, 110, 0.15);
        }

        .pond-depth {
          border-radius: inherit;
          background:
            radial-gradient(
              circle at 28% 20%,
              rgba(255, 255, 255, 0.18),
              transparent 16%
            ),
            radial-gradient(
              circle at 72% 58%,
              rgba(103, 232, 249, 0.12),
              transparent 18%
            ),
            radial-gradient(
              circle at 50% 52%,
              rgba(34, 211, 238, 0.14),
              rgba(8, 47, 73, 0.3) 52%,
              rgba(8, 23, 38, 0.82) 78%
            );
          animation: pondShimmer 4.6s ease-in-out infinite;
        }

        .pond-waterline {
          border-radius: inherit;
          border: 1px solid rgba(186, 230, 253, 0.12);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            0 0 22px rgba(34, 211, 238, 0.08);
        }

        .pond-shine {
          border-radius: inherit;
          background:
            radial-gradient(
              circle at 30% 22%,
              rgba(255, 255, 255, 0.18),
              transparent 16%
            ),
            radial-gradient(
              circle at 65% 26%,
              rgba(255, 255, 255, 0.08),
              transparent 12%
            );
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .pond-reeds-left,
        .pond-reeds-right {
          width: 20px;
          height: 28px;
          pointer-events: none;
        }

        .pond-reeds-left::before,
        .pond-reeds-left::after,
        .pond-reeds-right::before,
        .pond-reeds-right::after {
          content: "";
          position: absolute;
          bottom: 0;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(
            to top,
            rgba(101, 163, 13, 0.95),
            rgba(190, 242, 100, 0.85)
          );
          box-shadow: 0 0 4px rgba(132, 204, 22, 0.2);
        }

        .pond-reeds-left::before {
          left: 4px;
          height: 20px;
          transform: rotate(-10deg);
        }

        .pond-reeds-left::after {
          left: 10px;
          height: 24px;
          transform: rotate(8deg);
        }

        .pond-reeds-right::before {
          right: 4px;
          height: 18px;
          transform: rotate(9deg);
        }

        .pond-reeds-right::after {
          right: 10px;
          height: 23px;
          transform: rotate(-7deg);
        }

        .ripple-jump {
          animation: rippleJump 720ms ease-out;
        }

        @keyframes rippleJump {
          0% {
            transform: translateY(18px) scale(0.94);
          }
          22% {
            transform: translateY(-36px) scale(1.05);
          }
          55% {
            transform: translateY(-18px) scale(1.02);
          }
          100% {
            transform: translateY(8px) scale(1);
          }
        }

        @keyframes pondShimmer {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.94;
          }
          50% {
            transform: scale(1.03);
            opacity: 1;
          }
        }
      `}</style>
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
      className={`min-w-0 overflow-hidden rounded-2xl border transition ${
        active
          ? "border-cyan-400 bg-cyan-600/15 shadow-[0_0_20px_rgba(34,211,238,0.26)]"
          : "border-slate-700 bg-[#10244b]/90 hover:bg-slate-800"
      }`}
      title={label}
    >
      <div className="flex min-h-[132px] flex-col items-center justify-center p-4">
        <img
          src={image}
          alt={label}
          className="mb-3 h-14 w-auto object-contain"
        />
        <span className="text-center text-base font-semibold text-white">
          {label}
        </span>
      </div>
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
        aria-pressed={familyFriendlyOn}
        className={`relative h-[280px] w-full max-w-[280px] overflow-hidden rounded-full transition-all duration-300 ${
          familyFriendlyOn
            ? "scale-105 ring-8 ring-green-400 shadow-[0_0_40px_12px_rgba(74,222,128,0.75)]"
            : "ring-2 ring-slate-700 hover:scale-105"
        }`}
        title="Choose Family Friendly Options"
      >
        <img
          src="/images/ripple-choosefamily.png"
          alt="Choose Family Friendly Options"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-x-0 bottom-0 bg-black/50 px-4 py-3">
          <span className="block text-center text-lg font-extrabold leading-tight text-white">
            Choose Family Friendly Options
          </span>
        </div>
      </button>

      <p className="mt-4 max-w-[260px] text-center text-sm text-slate-300">
        Click to turn strict family-safe filtering on or off.
      </p>

      <div className="mt-5 flex w-full max-w-[280px] flex-col gap-3">
        <button
          onClick={onToggleNoRRated}
          aria-pressed={noRRatedOn}
          className={`min-h-[68px] rounded-2xl border px-4 py-3 text-sm font-bold transition ${
            noRRatedOn
              ? "border-amber-300 bg-amber-500/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.28)]"
              : "border-slate-700 bg-[#10244b]/90 text-slate-100 hover:bg-slate-800"
          }`}
          title="Exclude R rated and stronger content"
        >
          No R Rated
        </button>

        <button
          onClick={onToggleNoPg13}
          aria-pressed={noPg13On}
          className={`min-h-[68px] rounded-2xl border px-4 py-3 text-sm font-bold transition ${
            noPg13On
              ? "border-cyan-300 bg-cyan-500/15 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.28)]"
              : "border-slate-700 bg-[#10244b]/90 text-slate-100 hover:bg-slate-800"
          }`}
          title="Exclude PG-13 titles"
        >
          No PG-13
        </button>
      </div>

      <p className="mt-3 max-w-[260px] text-center text-xs text-slate-400">
        These filters stay active even when Family Friendly mode is off.
      </p>
    </div>
  );
}
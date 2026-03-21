import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderInfo = {
  name: string;
  type: "stream" | "rent" | "buy" | "free";
};

type FaithMovie = {
  _id?: unknown;
  title?: string;
  source?: string;
  link?: string | null;
  poster?: string | null;
  familySafe?: boolean;
  tags?: string[];
};

type FaithOutputMovie = {
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
  source?: "christian-ai";
  familySafe?: boolean;
  tags?: string[];
};

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const familyOnly = searchParams.get("familyOnly") === "true";
    const randomize = searchParams.get("randomize") === "true";
    const sourceFilter = (searchParams.get("source") || "").trim().toLowerCase();
    const tagFilter = (searchParams.get("tag") || "").trim().toLowerCase();

    const limitParam = Number(searchParams.get("limit") || "20");
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 100))
      : 20;

    const client = await clientPromise;
    const db = client.db("clearstream");

    const filter: Record<string, unknown> = {};

    if (familyOnly) {
      filter.familySafe = true;
    }

    if (q) {
      filter.title = { $regex: q, $options: "i" };
    }

    if (sourceFilter) {
      filter.source = { $regex: `^${sourceFilter}$`, $options: "i" };
    }

    if (tagFilter) {
      filter.tags = { $in: [new RegExp(tagFilter, "i")] };
    }

    const movies = await db
      .collection<FaithMovie>("faith_movies")
      .find(filter)
      .limit(Math.max(limit * 3, 50))
      .toArray();

    let cleaned: FaithOutputMovie[] = movies.map((movie, index) => ({
      id: 900000 + index,
      title: movie.title || "Untitled",
      overview: `Faith and family title from ${movie.source || "ClearStream library"}.`,
      poster_path: movie.poster || undefined,
      release_date: "",
      certification: movie.familySafe ? "Family Safe" : undefined,
      vote_average: 0,
      providers: movie.link
        ? [
            {
              name: movie.source || "ClearStream",
              type: "free",
            },
          ]
        : [],
      providerLink: movie.link || undefined,
      priceStatus: "Faith Library",
      source: "christian-ai",
      familySafe: !!movie.familySafe,
      tags: movie.tags || [],
    }));

    if (randomize) {
      cleaned = shuffleArray(cleaned);
    }

    cleaned = cleaned.slice(0, limit);

    return NextResponse.json({
      movies: cleaned,
      count: cleaned.length,
      filters: {
        q,
        familyOnly,
        randomize,
        source: sourceFilter || null,
        tag: tagFilter || null,
        limit,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DB error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
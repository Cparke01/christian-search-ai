import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type FavoriteRecord = {
  userId: string;
  movieId: number;
  title: string;
  poster_path?: string;
  release_date?: string;
  addedAt: Date;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return badRequest("Missing userId");
    }

    const client = await clientPromise;
    const db = client.db("clearstream");

    const favorites = await db
      .collection<FavoriteRecord>("favorites")
      .find({ userId })
      .sort({ addedAt: -1 })
      .toArray();

    return NextResponse.json({ favorites }, { status: 200 });
  } catch (error) {
    console.error("GET /api/favorites error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch favorites",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      userId,
      movieId,
      title,
      poster_path = "",
      release_date = "",
    } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return badRequest("Missing or invalid userId");
    }

    if (typeof movieId !== "number") {
      return badRequest("Missing or invalid movieId");
    }

    if (!title || typeof title !== "string") {
      return badRequest("Missing or invalid title");
    }

    const client = await clientPromise;
    const db = client.db("clearstream");
    const favoritesCollection = db.collection<FavoriteRecord>("favorites");

    const existing = await favoritesCollection.findOne({ userId, movieId });

    if (existing) {
      return NextResponse.json(
        { message: "Movie is already in favorites", favorite: existing },
        { status: 200 }
      );
    }

    const favorite: FavoriteRecord = {
      userId,
      movieId,
      title,
      poster_path,
      release_date,
      addedAt: new Date(),
    };

    const result = await favoritesCollection.insertOne(favorite);

    return NextResponse.json(
      {
        message: "Favorite added successfully",
        favorite: {
          _id: result.insertedId,
          ...favorite,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/favorites error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add favorite",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, movieId } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return badRequest("Missing or invalid userId");
    }

    if (typeof movieId !== "number") {
      return badRequest("Missing or invalid movieId");
    }

    const client = await clientPromise;
    const db = client.db("clearstream");

    const result = await db.collection("favorites").deleteOne({
      userId,
      movieId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Favorite removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/favorites error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove favorite",
      },
      { status: 500 }
    );
  }
}
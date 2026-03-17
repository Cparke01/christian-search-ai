import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type HistoryRecord = {
  userId: string;
  movieId: number;
  title: string;
  poster_path?: string;
  release_date?: string;
  viewedAt: Date;
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

    const history = await db
      .collection<HistoryRecord>("history")
      .find({ userId })
      .sort({ viewedAt: -1 })
      .limit(16)
      .toArray();

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    console.error("GET /api/history error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch history",
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
    const historyCollection = db.collection<HistoryRecord>("history");

    await historyCollection.deleteMany({
      userId,
      movieId,
    });

    const historyItem: HistoryRecord = {
      userId,
      movieId,
      title,
      poster_path,
      release_date,
      viewedAt: new Date(),
    };

    const result = await historyCollection.insertOne(historyItem);

    const allHistory = await historyCollection
      .find({ userId })
      .sort({ viewedAt: -1 })
      .toArray();

    if (allHistory.length > 16) {
      const idsToRemove = allHistory.slice(16).map((item) => item._id);
      await historyCollection.deleteMany({
        _id: { $in: idsToRemove },
      });
    }

    return NextResponse.json(
      {
        message: "History updated successfully",
        historyItem: {
          _id: result.insertedId,
          ...historyItem,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/history error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update history",
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

    const result = await db.collection("history").deleteOne({
      userId,
      movieId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "History item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "History item removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/history error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove history",
      },
      { status: 500 }
    );
  }
}
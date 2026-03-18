import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type ReviewRecord = {
  _id?: unknown;
  userId: string;
  movieId: number;
  title: string;
  rating: number;
  review?: string;
  poster_path?: string;
  release_date?: string;
  createdAt: Date;
  updatedAt: Date;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const movieIdParam = searchParams.get("movieId");

    const client = await clientPromise;
    const db = client.db("clearstream");
    const reviewsCollection = db.collection<ReviewRecord>("reviews");

    if (userId && movieIdParam) {
      const movieId = Number(movieIdParam);

      if (Number.isNaN(movieId)) {
        return badRequest("Invalid movieId");
      }

      const review = await reviewsCollection.findOne({ userId, movieId });

      return NextResponse.json({ review }, { status: 200 });
    }

    if (userId) {
      const reviews = await reviewsCollection
        .find({ userId })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({ reviews }, { status: 200 });
    }

    if (movieIdParam) {
      const movieId = Number(movieIdParam);

      if (Number.isNaN(movieId)) {
        return badRequest("Invalid movieId");
      }

      const reviews = await reviewsCollection
        .find({ movieId })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json({ reviews }, { status: 200 });
    }

    return badRequest("Missing userId or movieId");
  } catch (error) {
    console.error("GET /api/reviews error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch reviews",
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
      rating,
      review = "",
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

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return badRequest("Rating must be a number from 1 to 5");
    }

    if (review && typeof review !== "string") {
      return badRequest("Invalid review");
    }

    const client = await clientPromise;
    const db = client.db("clearstream");
    const reviewsCollection = db.collection<ReviewRecord>("reviews");

    const now = new Date();
    const existing = await reviewsCollection.findOne({ userId, movieId });

    if (existing) {
      await reviewsCollection.updateOne(
        { userId, movieId },
        {
          $set: {
            title,
            rating,
            review,
            poster_path,
            release_date,
            updatedAt: now,
          },
        }
      );

      const updatedReview = await reviewsCollection.findOne({ userId, movieId });

      return NextResponse.json(
        {
          message: "Review updated successfully",
          review: updatedReview,
        },
        { status: 200 }
      );
    }

    const newReview: ReviewRecord = {
      userId,
      movieId,
      title,
      rating,
      review,
      poster_path,
      release_date,
      createdAt: now,
      updatedAt: now,
    };

    const result = await reviewsCollection.insertOne(newReview);

    return NextResponse.json(
      {
        message: "Review created successfully",
        review: {
          _id: result.insertedId,
          ...newReview,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/reviews error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save review",
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
    const reviewsCollection = db.collection<ReviewRecord>("reviews");

    const result = await reviewsCollection.deleteOne({
      userId,
      movieId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Review removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/reviews error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove review",
      },
      { status: 500 }
    );
  }
}
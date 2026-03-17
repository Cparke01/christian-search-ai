import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;

    const db = client.db("clearstream");

    const movies = await db
      .collection("faith_movies")
      .find({})
      .limit(20)
      .toArray();

    return NextResponse.json({ movies });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DB error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
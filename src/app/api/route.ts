import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category");
    const family = searchParams.get("family");

    const client = await clientPromise;
    const db = client.db("clearstream");

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (family === "true") {
      query.familySafe = true;
    }

    const movies = await db
      .collection("faith_movies")
      .find(query)
      .limit(20)
      .toArray();

    return NextResponse.json({ movies });
  } catch (err) {
    return NextResponse.json(
      { error: "DB error" },
      { status: 500 }
    );
  }
}
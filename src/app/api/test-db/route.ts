import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("clearstream");

    const count = await db.collection("movies").countDocuments();

    return NextResponse.json({
      ok: true,
      movieCount: count,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { ok: false, error: "DB failed" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Movie from "@/models/Movie";

export async function GET() {
  try {
    await dbConnect();

    const count = await Movie.countDocuments();

    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully",
      movieCount: count,
    });

  } catch (error) {
    console.error("Database error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
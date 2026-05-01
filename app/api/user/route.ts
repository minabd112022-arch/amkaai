import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const user = auth();
  const userId = await auth();

  if (!userId) {
    return NextResponse.json({
      plan: "FREE",
      credits: 0,
    });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  return NextResponse.json({
    plan: user?.plan || "FREE",
    credits: user?.credits || 0,
  });
}
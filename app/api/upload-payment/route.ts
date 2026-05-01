import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const payment = await db.manualPayment.create({
    data: {
      userId,
      plan: body.plan,
      method: body.method,
      amount: body.amount,
      screenshot: body.screenshot,
    },
  });

  return NextResponse.json({ ok: true, payment });
}
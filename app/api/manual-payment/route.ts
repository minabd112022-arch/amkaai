import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadImage } from "@/lib/upload";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File;
  const plan = form.get("plan") as string;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const url = await uploadImage(file);

  await db.manualPayment.create({
    data: {
      userId,
      plan,
      amount: plan === "PRO" ? 1500 : 2500,
      rip: process.env.BARIDI_RIP!,
      screenshotUrl: url,
    },
  });

  return NextResponse.json({ ok: true });
}
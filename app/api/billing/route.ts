import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user?.customerId) {
    return NextResponse.json({ error: "No customer" }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
  });

  return NextResponse.json({ url: portal.url });
}
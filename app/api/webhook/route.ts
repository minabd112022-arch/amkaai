import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  console.log("🔥 WEBHOOK HIT");

  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("❌ Signature verification failed:", err.message);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  console.log("📦 Event:", event.type);

  try {
    // =============================
    // ✅ CHECKOUT SUCCESS
    // =============================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId; // 🔥 الأفضل
      const email = session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      console.log("💰 Payment success");
      console.log("👤 userId:", userId);
      console.log("📧 Email:", email);

      // 📦 معرفة الخطة
      const items = await stripe.checkout.sessions.listLineItems(
        session.id,
        { limit: 1 }
      );

      const priceId = items.data[0]?.price?.id;

      let plan = "FREE";
      let credits = 10;

      if (priceId === process.env.STRIPE_PRICE_PRO) {
        plan = "PRO";
        credits = 100;
      }

      if (priceId === process.env.STRIPE_PRICE_PREMIUM) {
        plan = "PREMIUM";
        credits = 300;
      }

      // ✅ تحديث المستخدم (باستخدام userId أفضل)
      if (userId) {
        await db.user.update({
          where: { clerkId: userId },
          data: {
            plan,
            credits,
            customerId,
            subscriptionId,
          },
        });
      } else if (email) {
        // fallback
        await db.user.updateMany({
          where: { email },
          data: {
            plan,
            credits,
            customerId,
            subscriptionId,
          },
        });
      }

      // 💾 تسجيل الدفع
      await db.payment.create({
        data: {
          amount: session.amount_total! / 100,
          currency: session.currency!,
          userId: userId || email!,
          stripeId: session.id,
        },
      });

      // 🔥 تحديث abandoned → recovered
      await db.abandonedCheckout.updateMany({
        where: {
          stripeSessionId: session.id,
        },
        data: {
          recovered: true,
        },
      });

      console.log(`✅ User upgraded to ${plan}`);
    }

    // =============================
    // ❌ CANCEL SUBSCRIPTION
    // =============================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const customerId = subscription.customer as string;

      await db.user.updateMany({
        where: { customerId },
        data: {
          plan: "FREE",
          subscriptionId: null,
        },
      });

      console.log("❌ Subscription cancelled");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook handler error:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
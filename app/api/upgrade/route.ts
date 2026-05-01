import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // ✅ تحديث المستخدم
    await db.user.update({
      where: { clerkId: userId },
      data: {
        plan: "PRO",
      },
    });

    // 🚀 تسريع كل الطلبات الحالية
    await db.videoJob.updateMany({
      where: {
        userId,
        status: {
          in: ["pending", "processing"],
        },
      },
      data: {
        priority: 1,
      },
    });

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.log("UPGRADE ERROR:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
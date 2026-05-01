import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Replicate from "replicate";
import { auth } from "@clerk/nextjs/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { jobId } = await req.json();

    const job = await db.videoJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job not found", { status: 404 });
    }

    if (job.status === "cancelled") {
      return NextResponse.json({ status: "cancelled" });
    }

    // 🔥 حساب queue حسب priority
    const jobsAhead = await db.videoJob.findMany({
      where: {
        status: { in: ["pending", "processing"] },
        OR: [
          { priority: { gt: job.priority } },
          {
            priority: job.priority,
            createdAt: { lt: job.createdAt },
          },
        ],
      },
      select: { priority: true },
    });

    const position = jobsAhead.length;

    // ⏱️ estimated time
    let estimatedSeconds = 0;
    for (const j of jobsAhead) {
      estimatedSeconds += j.priority === 1 ? 15 : 25;
    }

    // ✅ finished
    if (job.status === "done") {
      return NextResponse.json({
        status: "done",
        video: job.videoUrl,
        position: 0,
        estimatedTime: 0,
      });
    }

    // 🔍 next job (priority queue)
    const nextJob = await db.videoJob.findFirst({
      where: { status: "pending" },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
    });

    // ⏳ ليس دوره
    if (nextJob?.id !== job.id) {
      return NextResponse.json({
        status: "pending",
        position,
        estimatedTime: estimatedSeconds,
      });
    }

    // 🔄 تشغيل
    await db.videoJob.update({
      where: { id: job.id },
      data: { status: "processing" },
    });

    let steps = 20;
    if (job.quality === "medium") steps = 30;
    if (job.quality === "high") steps = 50;

    const output = await replicate.run(
      "cerspense/zeroscope-v2-xl",
      {
        input: {
          prompt: job.prompt,
          num_inference_steps: steps,
          guidance_scale: 7.5,
        },
      }
    );

    const videoUrl = Array.isArray(output) ? output[0] : output;

    let cost = 2;
    if (job.quality === "medium") cost = 3;
    if (job.quality === "high") cost = 5;

    await db.$transaction([
      db.video.create({
        data: {
          url: videoUrl,
          prompt: job.prompt,
          userId: job.userId,
        },
      }),
      db.user.update({
        where: { clerkId: job.userId },
        data: {
          credits: { decrement: cost },
        },
      }),
      db.videoJob.update({
        where: { id: job.id },
        data: {
          status: "done",
          videoUrl,
        },
      }),
    ]);

    return NextResponse.json({
      status: "done",
      video: videoUrl,
      position: 0,
      estimatedTime: 0,
    });

  } catch (error) {
    console.log("STATUS ERROR:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
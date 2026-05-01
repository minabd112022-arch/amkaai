import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendAbandonedEmail(email: string) {
  try {
    await resend.emails.send({
      from: "AI SaaS <onboarding@resend.dev>",
      to: email,
      subject: "🔥 You forgot your 20% discount",
      html: `
        <div style="font-family:sans-serif">
          <h2>Don't miss your offer 😱</h2>

          <p>You started upgrading but didn’t finish.</p>

          <h3 style="color:green;">20% OFF still waiting for you</h3>

          <a href="${process.env.NEXT_PUBLIC_URL}/dashboard"
            style="display:inline-block;margin-top:10px;padding:12px 20px;background:black;color:white;border-radius:8px;text-decoration:none;">
            Complete Upgrade 🚀
          </a>

          <p style="margin-top:20px;color:gray">
            Limited time offer ⏳
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("EMAIL ERROR:", err);
  }
}
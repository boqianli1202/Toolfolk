import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Rate limit: 3 resends per 15 minutes per email
  const rl = rateLimit(`resend:${email}`, 3, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    // Check user exists and is not already verified
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json({ success: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Delete old tokens for this email
    await prisma.verificationToken.deleteMany({ where: { email } });

    await prisma.verificationToken.create({
      data: { token, email, expires },
    });

    await sendVerificationEmail(email, token);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to resend email" }, { status: 500 });
  }
}

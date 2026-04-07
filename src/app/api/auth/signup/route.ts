import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  // Rate limit: 5 signups per 15 minutes per IP
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many signups. Please try again later." }, { status: 429 });
  }

  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);
    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({ where: { email } });

    await prisma.verificationToken.create({
      data: { token, email, expires },
    });

    // Send verification email
    await sendVerificationEmail(email, token);

    return NextResponse.json({ needsVerification: true });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

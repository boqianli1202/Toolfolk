import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

// Simple JWT-like token for desktop app auth
function createToken(userId: string): string {
  const payload = { userId, iat: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }; // 30 days
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret";
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const [data, sig] = token.split(".");
    const secret = process.env.NEXTAUTH_SECRET || "dev-secret";
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    if (sig !== expected) return null;

    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp < Date.now()) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Rate limit
  const rl = rateLimit(`token:${email}`, 10, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.emailVerified) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createToken(user.id);

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

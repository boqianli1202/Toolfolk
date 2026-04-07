import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing", req.url));
  }

  try {
    // Find the token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));
    }

    // Check expiry
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.redirect(new URL("/verify-email?error=expired", req.url));
    }

    // Verify the user
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { emailVerified: new Date() },
    });

    // Delete the token
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    // Redirect to login with success
    return NextResponse.redirect(new URL("/login?verified=true", req.url));
  } catch {
    return NextResponse.redirect(new URL("/verify-email?error=failed", req.url));
  }
}

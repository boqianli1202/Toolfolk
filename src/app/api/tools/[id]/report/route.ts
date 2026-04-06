import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Rate limit: 5 reports per hour
  const rl = rateLimit(`report:${userId}`, 5, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 });
  }

  const { id } = await params;
  const { reason } = await req.json();

  if (!reason?.trim() || reason.length > 500) {
    return NextResponse.json({ error: "Please provide a reason (max 500 characters)" }, { status: 400 });
  }

  try {
    await prisma.report.create({
      data: { reason: reason.trim(), toolId: id, userId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "You have already reported this tool" }, { status: 400 });
  }
}

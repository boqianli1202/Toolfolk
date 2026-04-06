import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { put } from "@vercel/blob";

const MAX_CODE_SIZE = 500 * 1024; // 500KB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Rate limit: 10 uploads per hour
  const rl = rateLimit(`upload:${userId}`, 10, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  try {
    const { title, description, category, instructions, code } = await req.json();

    if (!title || !description || !category || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate code size
    if (code.length > MAX_CODE_SIZE) {
      return NextResponse.json({ error: "Code too large. Maximum size is 500KB." }, { status: 400 });
    }

    // Upload to Vercel Blob
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.html`;
    const blob = await put(filename, code, {
      access: "public",
      contentType: "text/html",
    });
    const fileUrl = blob.url;

    const tool = await prisma.tool.create({
      data: {
        title,
        description,
        category,
        fileUrl,
        isBrowserRunnable: true,
        instructions: instructions || null,
        authorId: userId,
      },
    });

    return NextResponse.json({ id: tool.id });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

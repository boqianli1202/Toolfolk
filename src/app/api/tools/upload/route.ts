import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".html", ".htm", ".js", ".css", ".json", ".txt", ".py", ".zip", ".pdf"];

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
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const isBrowserRunnable = formData.get("isBrowserRunnable") === "true";
    const instructions = formData.get("instructions") as string;
    const file = formData.get("file") as File;

    if (!title || !description || !category || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
      return NextResponse.json(
        { error: `File type ".${ext}" not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const blob = await put(filename, file, { access: "public" });
    const fileUrl = blob.url;

    const tool = await prisma.tool.create({
      data: {
        title,
        description,
        category,
        fileUrl,
        isBrowserRunnable,
        instructions: instructions || null,
        authorId: userId,
      },
    });

    return NextResponse.json({ id: tool.id });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

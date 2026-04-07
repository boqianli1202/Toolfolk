import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Step 2: After client-side upload to Blob, create the Tool record
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const rl = rateLimit(`upload:${userId}`, 10, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  try {
    const { title, description, category, instructions, blobUrl, fileSize, language, entryFile, dependencies } = await req.json();

    if (!title || !description || !category || !blobUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tool = await prisma.tool.create({
      data: {
        title,
        description,
        category,
        fileUrl: blobUrl,
        toolType: "desktop",
        isBrowserRunnable: false,
        language: language || "unknown",
        entryFile: entryFile || null,
        dependencies: dependencies || null,
        fileSize: fileSize || null,
        instructions: instructions || null,
        authorId: userId,
      },
    });

    return NextResponse.json({ id: tool.id });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

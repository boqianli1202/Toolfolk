import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Use PUT with raw body streaming — bypasses Vercel's body size limit
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filename = req.headers.get("x-filename") || `${Date.now()}.zip`;

    // Stream raw body directly to Vercel Blob — no buffering
    const blob = await put(filename, req.body!, {
      access: "public",
      contentType: "application/zip",
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

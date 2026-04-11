import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Generate a client upload token — no callback needed
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pathname } = await req.json();

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      pathname: pathname || `upload-${Date.now()}.zip`,
    });

    return NextResponse.json({ clientToken });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token generation failed" },
      { status: 500 }
    );
  }
}

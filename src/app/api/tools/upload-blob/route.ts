import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          maximumSizeInBytes: 50 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // no-op — client handles everything after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload handler failed" },
      { status: 400 }
    );
  }
}

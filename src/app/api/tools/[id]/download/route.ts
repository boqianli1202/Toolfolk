import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.tool.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true });
}

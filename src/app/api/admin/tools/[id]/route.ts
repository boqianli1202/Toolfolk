import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Get tool to find its file URL for blob deletion
  const tool = await prisma.tool.findUnique({ where: { id } });
  if (tool?.fileUrl) {
    try {
      await del(tool.fileUrl);
    } catch {
      // Blob deletion failure shouldn't block tool deletion
    }
  }

  await prisma.tool.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

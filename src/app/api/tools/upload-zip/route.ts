import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { put } from "@vercel/blob";
import JSZip from "jszip";

const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB

interface ProjectMeta {
  language: string;
  entryFile: string | null;
  dependencies: string | null;
}

async function detectProject(zipBuffer: ArrayBuffer): Promise<ProjectMeta> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const files = Object.keys(zip.files);

  // Normalize: strip top-level folder if all files are in one
  const stripPrefix = (paths: string[]) => {
    const parts = paths.filter((p) => !p.endsWith("/"));
    if (parts.length === 0) return paths;
    const first = parts[0].split("/");
    if (first.length > 1) {
      const prefix = first[0] + "/";
      if (parts.every((p) => p.startsWith(prefix))) {
        return paths.map((p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p));
      }
    }
    return paths;
  };

  const normalized = stripPrefix(files);

  // Check Python
  if (normalized.includes("requirements.txt") || normalized.some((f) => f === "requirements.txt")) {
    const pyFiles = normalized.filter((f) => f.endsWith(".py") && !f.includes("/"));
    const entry =
      pyFiles.find((f) => f === "main.py") ||
      pyFiles.find((f) => f === "app.py") ||
      pyFiles.find((f) => f === "run.py") ||
      pyFiles.find((f) => f === "clock.py") ||
      pyFiles[0] ||
      null;
    return { language: "python", entryFile: entry, dependencies: "requirements.txt" };
  }

  // Check if any .py files exist (even without requirements.txt)
  const anyPy = normalized.filter((f) => f.endsWith(".py") && !f.includes("/"));
  if (anyPy.length > 0) {
    const entry =
      anyPy.find((f) => f === "main.py") ||
      anyPy.find((f) => f === "app.py") ||
      anyPy.find((f) => f === "run.py") ||
      anyPy[0];
    return { language: "python", entryFile: entry || null, dependencies: null };
  }

  // Check Node.js
  if (normalized.includes("package.json")) {
    try {
      const pkgFile = zip.file(files.find((f) => f.endsWith("package.json"))!);
      if (pkgFile) {
        const content = await pkgFile.async("text");
        const pkg = JSON.parse(content);
        const entry = pkg.main || "index.js";
        return { language: "node", entryFile: entry, dependencies: "package.json" };
      }
    } catch {
      // fall through
    }
    return { language: "node", entryFile: "index.js", dependencies: "package.json" };
  }

  // Check HTML
  if (normalized.includes("index.html")) {
    return { language: "html", entryFile: "index.html", dependencies: null };
  }

  return { language: "unknown", entryFile: null, dependencies: null };
}

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
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const instructions = formData.get("instructions") as string;
    const file = formData.get("file") as File;

    if (!title || !description || !category || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Only ZIP files are accepted for desktop programs." }, { status: 400 });
    }

    // Scan ZIP for project detection
    const buffer = await file.arrayBuffer();
    const meta = await detectProject(buffer);

    // Upload to Vercel Blob
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.zip`;
    const blob = await put(filename, file, { access: "public" });

    const tool = await prisma.tool.create({
      data: {
        title,
        description,
        category,
        fileUrl: blob.url,
        toolType: "desktop",
        isBrowserRunnable: false,
        language: meta.language,
        entryFile: meta.entryFile,
        dependencies: meta.dependencies,
        fileSize: file.size,
        instructions: instructions || null,
        authorId: userId,
      },
    });

    return NextResponse.json({
      id: tool.id,
      language: meta.language,
      entryFile: meta.entryFile,
      dependencies: meta.dependencies,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

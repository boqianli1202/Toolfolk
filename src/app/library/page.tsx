import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BookOpen, Monitor, ExternalLink } from "lucide-react";
import Link from "next/link";

const LANG_LABELS: Record<string, { label: string; color: string }> = {
  python: { label: "Python", color: "bg-yellow-100 text-yellow-700" },
  node: { label: "Node.js", color: "bg-green-100 text-green-700" },
  html: { label: "HTML", color: "bg-blue-100 text-blue-700" },
};

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const installed = await prisma.installedTool.findMany({
    where: { userId },
    include: {
      tool: {
        include: { author: { select: { name: true } } },
      },
    },
    orderBy: { installedAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-7 w-7 text-indigo-600" />
        <h1 className="text-3xl font-bold text-gray-900">My Library</h1>
      </div>

      {installed.length > 0 ? (
        <div className="space-y-3">
          {installed.map((item) => {
            const lang = item.tool.language
              ? LANG_LABELS[item.tool.language]
              : null;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/tool/${item.tool.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-600 truncate"
                    >
                      {item.tool.title}
                    </Link>
                    {lang && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${lang.color}`}
                      >
                        {lang.label}
                      </span>
                    )}
                    {item.tool.toolType === "desktop" && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Desktop
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    by {item.tool.author.name} &middot; Installed{" "}
                    {item.installedAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/tool/${item.tool.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No programs installed
          </h2>
          <p className="text-gray-500 mb-6">
            Browse tools and install desktop programs to see them here.
          </p>
          <Link
            href="/browse"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Browse Tools
          </Link>
        </div>
      )}
    </div>
  );
}

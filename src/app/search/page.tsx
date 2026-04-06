import { prisma } from "@/lib/prisma";
import ToolCard from "@/components/ToolCard";
import { Search } from "lucide-react";
import SearchBar from "@/components/SearchBar";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";

  const tools = q
    ? await prisma.tool.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          author: { select: { name: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-xl mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search</h1>
        <SearchBar />
      </div>

      {q && (
        <p className="text-sm text-gray-500 mb-6">
          {tools.length} result{tools.length !== 1 ? "s" : ""} for &quot;{q}&quot;
        </p>
      )}

      {tools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const avg =
              tool.reviews.length > 0
                ? tool.reviews.reduce((s, r) => s + r.rating, 0) /
                  tool.reviews.length
                : 0;
            return (
              <ToolCard
                key={tool.id}
                id={tool.id}
                title={tool.title}
                description={tool.description}
                category={tool.category}
                authorName={tool.author.name}
                avgRating={avg}
                reviewCount={tool.reviews.length}
                downloadCount={tool.downloadCount}
                viewCount={tool.viewCount}
                isBrowserRunnable={tool.isBrowserRunnable}
              />
            );
          })}
        </div>
      ) : q ? (
        <div className="text-center py-20">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tools found for &quot;{q}&quot;</p>
        </div>
      ) : null}
    </div>
  );
}

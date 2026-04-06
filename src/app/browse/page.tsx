import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import ToolCard from "@/components/ToolCard";
import Link from "next/link";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort || "newest";
  const category = params.category;

  const orderBy =
    sort === "trending"
      ? [{ viewCount: "desc" as const }, { downloadCount: "desc" as const }]
      : sort === "top-rated"
        ? [{ viewCount: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const tools = await prisma.tool.findMany({
    where: category ? { category } : undefined,
    orderBy,
    include: {
      author: { select: { name: true } },
      reviews: { select: { rating: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Tools</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex gap-2">
          {[
            { value: "newest", label: "Newest" },
            { value: "trending", label: "Trending" },
            { value: "top-rated", label: "Top Rated" },
          ].map((s) => (
            <Link
              key={s.value}
              href={`/browse?sort=${s.value}${category ? `&category=${category}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                sort === s.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <div className="w-px bg-gray-200 hidden sm:block" />
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/browse?sort=${sort}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              !category
                ? "bg-indigo-100 text-indigo-700"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/browse?sort=${sort}&category=${cat.slug}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                category === cat.slug
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
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
      ) : (
        <p className="text-center text-gray-500 py-20">
          No tools found. Try a different filter.
        </p>
      )}
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import ToolCard from "@/components/ToolCard";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const tools = await prisma.tool.findMany({
    where: { category: slug },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      reviews: { select: { rating: true } },
    },
  });

  const Icon = category.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-3 rounded-xl ${category.color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{category.label}</h1>
          <p className="text-gray-500">{tools.length} tools</p>
        </div>
      </div>

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
                toolType={tool.toolType}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">No tools in this category yet.</p>
          <Link
            href="/upload"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Be the first to share one!
          </Link>
        </div>
      )}
    </div>
  );
}

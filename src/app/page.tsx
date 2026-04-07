import Link from "next/link";
import { ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import ToolCard from "@/components/ToolCard";
import SearchBar from "@/components/SearchBar";

async function getTrendingTools() {
  const tools = await prisma.tool.findMany({
    take: 6,
    orderBy: [{ viewCount: "desc" }, { downloadCount: "desc" }],
    include: {
      author: { select: { name: true } },
      reviews: { select: { rating: true } },
    },
  });
  return tools;
}

async function getRecentTools() {
  const tools = await prisma.tool.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      reviews: { select: { rating: true } },
    },
  });
  return tools;
}

export default async function Home() {
  const [trendingTools, recentTools] = await Promise.all([
    getTrendingTools(),
    getRecentTools(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Everyone Can Create
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Share and discover simple tools made by people like you. No tech
            background needed — ideas matter most.
          </p>
          <SearchBar />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Browse Categories
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${cat.color} hover:shadow-md transition`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{cat.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Trending */}
        {trendingTools.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
                Trending
              </h2>
              <Link
                href="/browse?sort=trending"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {trendingTools.map((tool) => {
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
          </section>
        )}

        {/* Recent */}
        {recentTools.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-indigo-600" />
                Recently Added
              </h2>
              <Link
                href="/browse?sort=newest"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentTools.map((tool) => {
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
          </section>
        )}

        {/* Empty State */}
        {trendingTools.length === 0 && recentTools.length === 0 && (
          <section className="text-center py-20">
            <Sparkles className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No tools yet
            </h2>
            <p className="text-gray-500 mb-6">
              Be the first to share a tool with the community!
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Share Your First Tool
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

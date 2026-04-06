import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Star, Download, Eye, User, Calendar } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import ToolTabs from "@/components/ToolTabs";
import ReviewSection from "@/components/ReviewSection";
import ReportButton from "@/components/ReportButton";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tool = await prisma.tool.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    include: {
      author: { select: { id: true, name: true } },
      reviews: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tool) notFound();

  const avgRating =
    tool.reviews.length > 0
      ? tool.reviews.reduce((s, r) => s + r.rating, 0) / tool.reviews.length
      : 0;

  const category = CATEGORIES.find((c) => c.slug === tool.category);
  const categoryLabel = category?.label || tool.category;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <span className="text-sm font-medium text-indigo-600 mb-1 block">
              {categoryLabel}
            </span>
            <h1 className="text-3xl font-bold text-gray-900">{tool.title}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {tool.reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-gray-900 text-lg">
                  {avgRating.toFixed(1)}
                </span>
                <span>({tool.reviews.length})</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-600 mb-6 whitespace-pre-wrap">{tool.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {tool.author.name}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {tool.createdAt.toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {tool.viewCount} views
          </span>
          <span className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            {tool.downloadCount} downloads
          </span>
          <div className="ml-auto">
            <ReportButton toolId={tool.id} />
          </div>
        </div>
      </div>

      {/* Try It / Download Tabs */}
      <ToolTabs
        toolId={tool.id}
        fileUrl={tool.fileUrl}
        isBrowserRunnable={tool.isBrowserRunnable}
        instructions={tool.instructions}
      />

      {/* Reviews */}
      <ReviewSection
        toolId={tool.id}
        reviews={tool.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          userName: r.user.name,
          userId: r.user.id,
        }))}
        avgRating={avgRating}
      />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { User, Calendar, Wrench, Star } from "lucide-react";
import ToolCard from "@/components/ToolCard";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tools: {
        include: {
          reviews: { select: { rating: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        include: {
          tool: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {user.createdAt.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="h-4 w-4" />
                {user.tools.length} tools shared
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User's tools */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Tools</h2>
        {user.tools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {user.tools.map((tool) => {
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
          <p className="text-gray-500 text-sm">No tools shared yet.</p>
        )}
      </section>

      {/* User's reviews */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
        {user.reviews.length > 0 ? (
          <div className="space-y-3">
            {user.reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <a
                    href={`/tool/${review.tool.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    {review.tool.title}
                  </a>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{review.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {review.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}

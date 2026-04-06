import Link from "next/link";
import { Star, Download, Eye } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "personal-helper": "bg-green-100 text-green-700",
  academic: "bg-blue-100 text-blue-700",
  music: "bg-purple-100 text-purple-700",
  history: "bg-amber-100 text-amber-700",
  games: "bg-red-100 text-red-700",
  utilities: "bg-gray-100 text-gray-700",
  creative: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-700",
};

interface ToolCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  authorName: string;
  avgRating: number;
  reviewCount: number;
  downloadCount: number;
  viewCount: number;
  isBrowserRunnable: boolean;
}

export default function ToolCard({
  id,
  title,
  description,
  category,
  authorName,
  avgRating,
  reviewCount,
  downloadCount,
  viewCount,
  isBrowserRunnable,
}: ToolCardProps) {
  const categoryLabel = category.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

  return (
    <Link
      href={`/tool/${id}`}
      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow p-5 flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorClass}`}>
          {categoryLabel}
        </span>
        {isBrowserRunnable && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
            Try Online
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">{description}</p>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span className="text-gray-600">by {authorName}</span>
        <div className="flex items-center gap-3">
          {reviewCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              {avgRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {downloadCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {viewCount}
          </span>
        </div>
      </div>
    </Link>
  );
}

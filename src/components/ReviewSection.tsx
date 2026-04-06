"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  userId: string;
}

interface ReviewSectionProps {
  toolId: string;
  reviews: Review[];
  avgRating: number;
}

function StarRating({
  rating,
  onRate,
  interactive = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`h-5 w-5 ${
              star <= (hovered || rating)
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewSection({
  toolId,
  reviews,
  avgRating,
}: ReviewSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = (session?.user as { id?: string })?.id;
  const hasReviewed = reviews.some((r) => r.userId === userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setError("");
    setSubmitting(true);

    const res = await fetch(`/api/tools/${toolId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });

    setSubmitting(false);

    if (res.ok) {
      setRating(0);
      setComment("");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit review");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm text-gray-500">
              {avgRating.toFixed(1)} ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {/* Write a review */}
      {session && !hasReviewed && (
        <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Write a review
          </h3>
          {error && (
            <p className="text-sm text-red-600 mb-2">{error}</p>
          )}
          <div className="mb-3">
            <StarRating rating={rating} onRate={setRating} interactive />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {!session && (
        <div className="mb-8 p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-sm text-gray-500">
            <Link href="/login" className="text-indigo-600 font-medium">
              Log in
            </Link>{" "}
            to leave a review
          </p>
        </div>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-gray-100 pb-4 last:border-0"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 text-sm">
                  {review.userName}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <StarRating rating={review.rating} />
              <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">
          No reviews yet. Be the first!
        </p>
      )}
    </div>
  );
}

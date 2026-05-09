import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

interface Review {
  id: string;
  user_id: string;
  booking_id: string;
  rating: number;
  review_text: string;
  created_at: string;
}

type SortMode = "newest" | "highest";

const MAX_CHARS = 500;

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fetchLoading, setFetchLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Form state
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");
  const [bookingId, setBookingId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Interactive list state
  const [search, setSearch] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState<number>(1);
  const pageSize = 6;

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const fetchReviews = async () => {
    setFetchLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("trip_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Failed to fetch reviews");
      setReviews([]);
    } else {
      setReviews(data || []);
    }

    setFetchLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = reviews.filter((r) => {
      const matchesSearch = !q || r.review_text.toLowerCase().includes(q);
      const matchesMinRating = !minRating || r.rating >= minRating;
      return matchesSearch && matchesMinRating;
    });

    if (sortMode === "highest") {
      list = [...list].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return list;
  }, [reviews, search, minRating, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));

  const paged = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, minRating, sortMode]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const canSubmit = rating >= 1 && rating <= 5 && !!reviewText.trim() && !!bookingId.trim() && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5");
      return;
    }

    if (!reviewText.trim()) {
      setError("Please enter a review");
      return;
    }

    if (!bookingId.trim()) {
      setError("Please enter booking ID");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in to submit a review");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("trip_reviews").insert([
      {
        user_id: user.id,
        booking_id: bookingId,
        rating,
        review_text: reviewText,
      },
    ]);

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setRating(0);
    setReviewText("");
    setBookingId("");

    await fetchReviews();

    toast({
      title: "Review submitted",
      description: "Your review is now visible to other passengers.",
    });

    setLoading(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderStarsInteractive = (selectedRating: number) => {
    return (
      <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= selectedRating;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setRating(star)}
              className={`text-2xl transition ${isActive ? "text-yellow-400" : "text-gray-300"}`}
            >
              ★
            </button>
          );
        })}
      </div>
    );
  };

  const StarsReadOnly = ({ ratingValue }: { ratingValue: number }) => {
    return (
      <div className="flex mb-2" aria-label={`Rating: ${ratingValue} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xl ${star <= ratingValue ? "text-yellow-400" : "text-gray-300"}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderReviewText = (r: Review) => {
    const isExpanded = !!expandedIds[r.id];
    const text = r.review_text || "";

    if (text.length <= 180) return <p className="text-gray-700 mb-3">{text}</p>;

    const shown = isExpanded ? text : text.slice(0, 180).trim() + "…";

    return (
      <div className="mb-3">
        <p className="text-gray-700">{shown}</p>
        <button
          type="button"
          onClick={() => toggleExpanded(r.id)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Bus Reviews & Ratings</h1>
          <p className="text-gray-500">
            Share your travel experience with other passengers.
          </p>
        </div>

        {/* Review Form */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Write a Review</h2>

          {error && (
            <div className="mb-4 bg-red-100 text-red-600 px-4 py-3 rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 font-medium text-gray-700">Booking ID</label>
              <input
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="Enter booking ID"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Rating</label>
              {renderStarsInteractive(rating)}
              {rating === 0 ? (
                <p className="text-sm text-gray-500 mt-2">Select a star rating to continue.</p>
              ) : null}
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Write your experience..."
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">Tip: keep it short and helpful.</span>
                <span className="text-sm text-gray-500">{reviewText.length}/{MAX_CHARS}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>

        {/* Reviews List */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Passenger Reviews</h2>
              <p className="text-gray-500 text-sm mt-1">
                {reviews.length ? (
                  <>
                    Avg: <span className="font-semibold">{avgRating.toFixed(1)}</span>/5 • {reviews.length} total
                  </>
                ) : (
                  "No reviews available yet."
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reviews..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={0}>Any rating</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}+ stars
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rated</option>
                </select>
              </div>
            </div>
          </div>

          {fetchLoading ? (
            <div className="space-y-4">
              {Array.from({ length: pageSize }).map((_, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-5">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3 animate-pulse" />
                  <div className="h-24 bg-gray-200 rounded w-full mb-3 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-2/5 animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredSorted.length === 0 ? (
            <p className="text-gray-500">No reviews match your filters.</p>
          ) : (
            <>
              <div className="space-y-5">
                {paged.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-xl p-5">
                    <StarsReadOnly ratingValue={review.rating} />
                    {renderReviewText(review)}

                    <div className="text-sm text-gray-400 flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span>Booking ID: {review.booking_id}</span>
                      <span>{new Date(review.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50"
                >
                  Prev
                </button>

                <div className="text-sm text-gray-600">
                  Page <span className="font-semibold">{Math.min(page, totalPages)}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


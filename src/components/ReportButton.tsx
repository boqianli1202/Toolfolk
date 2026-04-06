"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Flag, X } from "lucide-react";

export default function ReportButton({ toolId }: { toolId: string }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!session || done) {
    return done ? (
      <span className="text-xs text-gray-400">Reported</span>
    ) : null;
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason");
      return;
    }
    setError("");
    setSubmitting(true);

    const res = await fetch(`/api/tools/${toolId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    setSubmitting(false);

    if (res.ok) {
      setDone(true);
      setOpen(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to report");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-4 w-72">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Report this tool</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you reporting this?"
            maxLength={500}
            rows={3}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-2"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-red-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      )}
    </div>
  );
}

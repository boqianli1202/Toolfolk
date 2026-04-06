"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, X } from "lucide-react";

export default function AdminActions({
  reportId,
  toolId,
}: {
  reportId: string;
  toolId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  const handleDeleteTool = async () => {
    if (!confirm("Delete this tool? This cannot be undone.")) return;
    setLoading("tool");
    await fetch(`/api/admin/tools/${toolId}`, { method: "DELETE" });
    router.refresh();
  };

  const handleDismiss = async () => {
    setLoading("dismiss");
    await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={handleDismiss}
        disabled={!!loading}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        {loading === "dismiss" ? "..." : "Dismiss"}
      </button>
      <button
        onClick={handleDeleteTool}
        disabled={!!loading}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {loading === "tool" ? "..." : "Delete Tool"}
      </button>
    </div>
  );
}

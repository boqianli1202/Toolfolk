"use client";

import { useState } from "react";
import { Play, Download, FileText } from "lucide-react";

interface ToolTabsProps {
  toolId: string;
  fileUrl: string;
  isBrowserRunnable: boolean;
  instructions: string | null;
}

export default function ToolTabs({
  toolId,
  fileUrl,
  isBrowserRunnable,
  instructions,
}: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState(
    isBrowserRunnable ? "try" : "download"
  );

  const handleDownload = async () => {
    // Increment download count
    await fetch(`/api/tools/${toolId}/download`, { method: "POST" });
    window.open(fileUrl, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
      <div className="flex border-b border-gray-200">
        {isBrowserRunnable && (
          <button
            onClick={() => setActiveTab("try")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition ${
              activeTab === "try"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Play className="h-4 w-4" />
            Try It
          </button>
        )}
        <button
          onClick={() => setActiveTab("download")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition ${
            activeTab === "download"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        {instructions && (
          <button
            onClick={() => setActiveTab("instructions")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition ${
              activeTab === "instructions"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            Instructions
          </button>
        )}
      </div>

      <div className="p-6">
        {activeTab === "try" && isBrowserRunnable && (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <iframe
              src={fileUrl}
              sandbox="allow-scripts"
              className="w-full h-[500px] border-0"
              title="Tool Preview"
            />
          </div>
        )}

        {activeTab === "download" && (
          <div className="text-center py-10">
            <Download className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Download this tool to use it on your computer
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              <Download className="h-4 w-4" />
              Download Tool
            </button>
          </div>
        )}

        {activeTab === "instructions" && instructions && (
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
            {instructions}
          </div>
        )}
      </div>
    </div>
  );
}

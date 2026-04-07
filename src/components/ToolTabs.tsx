"use client";

import { useState } from "react";
import { Play, Download, FileText, Monitor, Apple, Globe } from "lucide-react";
import Link from "next/link";

interface ToolTabsProps {
  toolId: string;
  fileUrl: string;
  isBrowserRunnable: boolean;
  toolType: string;
  language?: string | null;
  entryFile?: string | null;
  dependencies?: string | null;
  fileSize?: number | null;
  instructions: string | null;
}

const LANG_LABELS: Record<string, { label: string; color: string }> = {
  python: { label: "Python", color: "bg-yellow-100 text-yellow-700" },
  node: { label: "Node.js", color: "bg-green-100 text-green-700" },
  html: { label: "HTML", color: "bg-blue-100 text-blue-700" },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-600" },
};

export default function ToolTabs({
  toolId,
  fileUrl,
  isBrowserRunnable,
  toolType,
  language,
  entryFile,
  fileSize,
  instructions,
}: ToolTabsProps) {
  const isDesktop = toolType === "desktop";

  const [activeTab, setActiveTab] = useState(
    isBrowserRunnable ? "try" : isDesktop ? "install" : "download"
  );

  const handleDownload = async () => {
    await fetch(`/api/tools/${toolId}/download`, { method: "POST" });
    window.open(fileUrl, "_blank");
  };

  const lang = language ? LANG_LABELS[language] || LANG_LABELS.unknown : null;

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
        {isDesktop && (
          <button
            onClick={() => setActiveTab("install")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition ${
              activeTab === "install"
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Monitor className="h-4 w-4" />
            Install
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

        {activeTab === "install" && isDesktop && (
          <div className="text-center py-8">
            <Monitor className="h-14 w-14 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Install via Toolfolk App
            </h3>
            <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
              Download the Toolfolk desktop app to install and run this program
              with one click. It handles all dependencies automatically.
            </p>

            {/* Platform badges */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                <Apple className="h-4 w-4" /> macOS
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                <Globe className="h-4 w-4" /> Windows
              </span>
            </div>

            {/* Project info */}
            {lang && (
              <div className="flex items-center justify-center gap-3 mb-6 text-sm">
                <span className={`px-2.5 py-1 rounded-full font-medium ${lang.color}`}>
                  {lang.label}
                </span>
                {entryFile && (
                  <span className="text-gray-400">
                    Entry: <code className="text-gray-600">{entryFile}</code>
                  </span>
                )}
                {fileSize && (
                  <span className="text-gray-400">
                    {(fileSize / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
            )}

            <Link
              href="/desktop-app"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              <Download className="h-4 w-4" />
              Get Toolfolk App
            </Link>
          </div>
        )}

        {activeTab === "download" && (
          <div className="text-center py-10">
            <Download className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {isDesktop
                ? "Download the ZIP file to set up manually"
                : "Download this tool to use it on your computer"}
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              <Download className="h-4 w-4" />
              {isDesktop ? "Download ZIP" : "Download Tool"}
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

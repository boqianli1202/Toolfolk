"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, Code, Eye, EyeOff, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import Link from "next/link";

type UploadMode = "paste" | "file";

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<UploadMode>("paste");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [instructions, setInstructions] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Paste mode
  const [code, setCode] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // File mode
  const [file, setFile] = useState<File | null>(null);
  const [isBrowserRunnable, setIsBrowserRunnable] = useState(false);

  // Update preview when code changes
  useEffect(() => {
    if (showPreview && iframeRef.current && code) {
      const blob = new Blob([code], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [code, showPreview]);

  if (status === "loading") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Sign in to share
        </h2>
        <p className="text-gray-500 mb-6">
          You need an account to upload tools.
        </p>
        <Link
          href="/login"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Log in
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "paste" && !code.trim()) {
      setError("Please paste your code");
      return;
    }
    if (mode === "file" && !file) {
      setError("Please select a file");
      return;
    }

    setError("");
    setUploading(true);

    try {
      if (mode === "paste") {
        // Send code as JSON
        const res = await fetch("/api/tools/upload-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            category,
            instructions,
            code,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          router.push(`/tool/${data.id}`);
        } else {
          setError(data.error || "Upload failed");
          setUploading(false);
        }
      } else {
        // Send file as FormData
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("isBrowserRunnable", String(isBrowserRunnable));
        formData.append("instructions", instructions);
        formData.append("file", file!);

        const res = await fetch("/api/tools/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          router.push(`/tool/${data.id}`);
        } else {
          setError(data.error || "Upload failed");
          setUploading(false);
        }
      }
    } catch {
      setError("Something went wrong");
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Share a Tool</h1>
      <p className="text-gray-500 mb-8">
        Share your creation with the community. Paste code from AI or upload a
        file — others can try it instantly.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-8">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
            mode === "paste"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Code className="h-4 w-4" />
          Paste Code
          <span className="text-xs opacity-75">(Easiest)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
            mode === "file"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <FileUp className="h-4 w-4" />
          Upload File
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Simple Calculator"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            placeholder="Describe what your tool does and how to use it..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Paste Code mode */}
        {mode === "paste" && (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-sm text-indigo-700">
                  <p className="font-medium mb-1">Tip: Use AI to create your tool</p>
                  <p>
                    Ask ChatGPT or Claude something like &quot;Make me a single HTML
                    page that does X&quot; — then paste the code below. It will
                    run directly in the browser!
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  HTML Code
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4" /> Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" /> Live Preview
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                placeholder='Paste your HTML code here...&#10;&#10;Example:&#10;<!DOCTYPE html>&#10;<html>&#10;<head><title>My Tool</title></head>&#10;<body>&#10;  <h1>Hello World</h1>&#10;</body>&#10;</html>'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                spellCheck={false}
              />
            </div>

            {/* Live Preview */}
            {showPreview && code && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preview
                </label>
                <div className="rounded-lg border border-gray-300 overflow-hidden bg-white">
                  <iframe
                    ref={iframeRef}
                    sandbox="allow-scripts"
                    className="w-full h-[400px] border-0"
                    title="Code Preview"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* File Upload mode */}
        {mode === "file" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition">
                <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Choose a file
                </label>
                {file && (
                  <p className="text-sm text-gray-500 mt-2">{file.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="browser-runnable"
                checked={isBrowserRunnable}
                onChange={(e) => setIsBrowserRunnable(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="browser-runnable" className="text-sm text-gray-700">
                This is a browser-runnable tool (HTML/JS file)
              </label>
            </div>
          </>
        )}

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructions (optional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder="How to use this tool..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Publishing..." : "Publish Tool"}
        </button>
      </form>
    </div>
  );
}

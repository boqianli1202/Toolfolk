"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, Code, Eye, EyeOff, Sparkles, Monitor } from "lucide-react";
import JSZip from "jszip";
import { CATEGORIES } from "@/lib/categories";
import Link from "next/link";

type UploadMode = "paste" | "file" | "desktop";
type CodeTab = "html" | "css" | "js";

const TAB_CONFIG: { key: CodeTab; label: string; icon: string; placeholder: string }[] = [
  {
    key: "html",
    label: "HTML",
    icon: "🌐",
    placeholder: '<h1>Hello World</h1>\n<p>Your content here...</p>\n<button id="btn">Click me</button>',
  },
  {
    key: "css",
    label: "CSS",
    icon: "🎨",
    placeholder: "body {\n  font-family: system-ui, sans-serif;\n  padding: 20px;\n  background: #f8fafc;\n}\n\nh1 {\n  color: #1e293b;\n}",
  },
  {
    key: "js",
    label: "JavaScript",
    icon: "⚡",
    placeholder: 'document.getElementById("btn").addEventListener("click", () => {\n  alert("Hello!");\n});',
  },
];

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

  // Multi-file paste mode
  const [activeTab, setActiveTab] = useState<CodeTab>("html");
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // File mode
  const [file, setFile] = useState<File | null>(null);
  const [isBrowserRunnable, setIsBrowserRunnable] = useState(false);

  // Desktop mode
  const [zipFile, setZipFile] = useState<File | null>(null);

  // Combine files into a single HTML document
  const buildCombinedCode = useCallback(() => {
    const hasCSS = cssCode.trim().length > 0;
    const hasJS = jsCode.trim().length > 0;
    const htmlContent = htmlCode.trim();

    // If the HTML already has a full document structure, inject CSS/JS into it
    if (htmlContent.toLowerCase().includes("<!doctype") || htmlContent.toLowerCase().includes("<html")) {
      let combined = htmlContent;
      if (hasCSS) {
        const styleTag = `<style>\n${cssCode}\n</style>`;
        if (combined.includes("</head>")) {
          combined = combined.replace("</head>", `${styleTag}\n</head>`);
        } else if (combined.includes("<body")) {
          combined = combined.replace(/<body/i, `${styleTag}\n<body`);
        } else {
          combined = styleTag + "\n" + combined;
        }
      }
      if (hasJS) {
        const scriptTag = `<script>\n${jsCode}\n</script>`;
        if (combined.includes("</body>")) {
          combined = combined.replace("</body>", `${scriptTag}\n</body>`);
        } else {
          combined += "\n" + scriptTag;
        }
      }
      return combined;
    }

    // Otherwise, wrap everything in a clean HTML document
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || "Tool"}</title>${hasCSS ? `\n<style>\n${cssCode}\n</style>` : ""}
</head>
<body>
${htmlContent || ""}${hasJS ? `\n<script>\n${jsCode}\n</script>` : ""}
</body>
</html>`;
  }, [htmlCode, cssCode, jsCode, title]);

  // Update preview
  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const combined = buildCombinedCode();
      if (combined.trim()) {
        const blob = new Blob([combined], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        iframeRef.current.src = url;
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [htmlCode, cssCode, jsCode, showPreview, buildCombinedCode]);

  const codeValues: Record<CodeTab, string> = { html: htmlCode, css: cssCode, js: jsCode };
  const codeSetters: Record<CodeTab, (v: string) => void> = {
    html: setHtmlCode,
    css: setCssCode,
    js: setJsCode,
  };

  const hasAnyCode = htmlCode.trim() || cssCode.trim() || jsCode.trim();

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

    if (!category) {
      setError("Please select a category");
      return;
    }
    if (mode === "paste" && !hasAnyCode) {
      setError("Please add some code in at least one tab");
      return;
    }
    if (mode === "file" && !file) {
      setError("Please select a file");
      return;
    }
    if (mode === "desktop" && !zipFile) {
      setError("Please select a ZIP folder");
      return;
    }

    setError("");
    setUploading(true);

    try {
      let res: Response;

      if (mode === "paste") {
        const combined = buildCombinedCode();
        res = await fetch("/api/tools/upload-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, category, instructions, code: combined }),
        });
      } else if (mode === "desktop") {
        // Step 1: Detect project type from ZIP
        const zipBuffer = await zipFile!.arrayBuffer();
        const zip = await JSZip.loadAsync(zipBuffer);
        const files = Object.keys(zip.files);
        const normalized = files.filter(f => !f.endsWith("/"));

        let language = "unknown", entryFile: string | null = null, dependencies: string | null = null;

        // Strip top-level folder
        let stripped = normalized;
        if (normalized.length > 0) {
          const first = normalized[0].split("/");
          if (first.length > 1) {
            const prefix = first[0] + "/";
            if (normalized.every(p => p.startsWith(prefix))) {
              stripped = normalized.map(p => p.slice(prefix.length));
            }
          }
        }

        if (stripped.some(f => f === "requirements.txt") || stripped.some(f => f.endsWith(".py"))) {
          language = "python";
          dependencies = stripped.includes("requirements.txt") ? "requirements.txt" : null;
          const pyFiles = stripped.filter(f => f.endsWith(".py") && !f.includes("/"));
          entryFile = pyFiles.find(f => f === "main.py") || pyFiles.find(f => f === "app.py") || pyFiles.find(f => f === "clock.py") || pyFiles[0] || null;
        } else if (stripped.includes("package.json")) {
          language = "node";
          dependencies = "package.json";
          entryFile = "index.js";
        } else if (stripped.includes("index.html")) {
          language = "html";
          entryFile = "index.html";
        }

        // Step 2: Upload ZIP directly via streaming PUT (bypasses body size limit)
        const blobFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}.zip`;
        const blobRes = await fetch("/api/tools/upload-blob", {
          method: "PUT",
          headers: { "x-filename": blobFilename },
          body: zipFile!,
        });
        const blobData = await blobRes.json();
        if (!blobRes.ok) throw new Error(blobData.error || "Blob upload failed");

        // Step 3: Create Tool record with metadata
        res = await fetch("/api/tools/upload-zip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title, description, category, instructions,
            blobUrl: blobData.url,
            fileSize: zipFile!.size,
            language, entryFile, dependencies,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("isBrowserRunnable", String(isBrowserRunnable));
        formData.append("instructions", instructions);
        formData.append("file", file!);
        res = await fetch("/api/tools/upload", { method: "POST", body: formData });
      }

      const data = await res.json();
      if (res.ok) {
        router.push(`/tool/${data.id}`);
      } else {
        setError(data.error || "Upload failed");
        setUploading(false);
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
        <button
          type="button"
          onClick={() => setMode("desktop")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
            mode === "desktop"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <Monitor className="h-4 w-4" />
          Desktop Program
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setCategory(cat.slug)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? "text-indigo-600" : ""}`} />
                  <span className="text-xs font-medium leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="category" value={category} required />
        </div>

        {/* Paste Code mode — Multi-file editor */}
        {mode === "paste" && (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-sm text-indigo-700">
                  <p className="font-medium mb-1">Tip: Use AI to create your tool</p>
                  <p>
                    Ask ChatGPT or Claude to build you a tool — paste the HTML, CSS, and
                    JavaScript into separate tabs below. Or paste everything into the HTML tab
                    if it&apos;s a single file.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Code
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

              {/* Tab bar */}
              <div className="flex border border-gray-300 border-b-0 rounded-t-lg overflow-hidden">
                {TAB_CONFIG.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const hasContent = codeValues[tab.key].trim().length > 0;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-r border-gray-300 last:border-r-0 ${
                        isActive
                          ? "bg-white text-gray-900 border-b-2 border-b-indigo-500"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      <span className="text-xs">{tab.icon}</span>
                      {tab.label}
                      {hasContent && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-indigo-500" : "bg-gray-400"}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Code textarea */}
              {TAB_CONFIG.map((tab) => (
                <textarea
                  key={tab.key}
                  value={codeValues[tab.key]}
                  onChange={(e) => codeSetters[tab.key](e.target.value)}
                  rows={14}
                  placeholder={tab.placeholder}
                  className={`w-full px-3 py-3 border border-gray-300 rounded-b-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y ${
                    activeTab === tab.key ? "" : "hidden"
                  }`}
                  spellCheck={false}
                />
              ))}
            </div>

            {/* Live Preview */}
            {showPreview && hasAnyCode && (
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

        {/* Desktop Program mode */}
        {mode === "desktop" && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Monitor className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div className="text-sm text-green-700">
                  <p className="font-medium mb-1">Upload your project folder as a ZIP</p>
                  <p>
                    ZIP your entire project folder (Python, Node.js, or HTML) and upload it.
                    We&apos;ll auto-detect the language and entry point. Users can install and
                    run it with one click via the Toolfolk desktop app.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ZIP File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition">
                <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="zip-upload"
                />
                <label
                  htmlFor="zip-upload"
                  className="cursor-pointer text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Choose a ZIP file
                </label>
                <p className="text-xs text-gray-400 mt-1">Max 50MB</p>
                {zipFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
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

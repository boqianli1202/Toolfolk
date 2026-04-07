"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Search, Upload, LogOut, User, Wrench, Shield, BookOpen, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Wrench className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Toolfolk</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </form>

          <div className="flex items-center gap-3">
            <Link
              href="/browse"
              className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block"
            >
              Browse
            </Link>
            <Link
              href="/desktop-app"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hidden sm:block"
            >
              <Download className="h-4 w-4 inline" /> App
            </Link>

            {session ? (
              <>
                <Link
                  href="/library"
                  className="text-gray-600 hover:text-gray-900 hidden sm:block"
                  title="My Library"
                >
                  <BookOpen className="h-5 w-5" />
                </Link>
                <Link
                  href="/upload"
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  <Upload className="h-4 w-4" />
                  Share Tool
                </Link>
                {(session.user as Record<string, unknown>)?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="text-gray-600 hover:text-gray-900"
                    title="Admin"
                  >
                    <Shield className="h-5 w-5" />
                  </Link>
                )}
                <Link
                  href={`/profile/${(session.user as Record<string, unknown>)?.id}`}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

import { Download, Monitor, Apple, Globe, Zap, Trash2, Play } from "lucide-react";

export default function DesktopAppPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-600 via-emerald-700 to-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Monitor className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Toolfolk Desktop App
          </h1>
          <p className="text-lg sm:text-xl text-green-100 mb-10 max-w-2xl mx-auto">
            Install and run desktop programs from Toolfolk with one click.
            Dependencies are handled automatically — just click and go.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/boqianli1202/Toolfolk/releases/download/v1.0.0/Toolfolk-1.0.0-arm64.dmg"
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-lg"
            >
              <Apple className="h-6 w-6" />
              Download for macOS
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition opacity-60 cursor-not-allowed"
            >
              <Globe className="h-6 w-6" />
              Windows — Coming Soon
            </a>
          </div>
          <p className="text-sm text-green-200 mt-4">v1.0.0 &middot; macOS (Apple Silicon) &middot; 94 MB</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="h-14 w-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-7 w-7 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              One-click install
            </h3>
            <p className="text-sm text-gray-500">
              Find a tool on Toolfolk, click Install in the desktop app.
              Dependencies (Python packages, npm modules) are installed
              automatically.
            </p>
          </div>
          <div className="text-center">
            <div className="h-14 w-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Play className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              One-click run
            </h3>
            <p className="text-sm text-gray-500">
              Click Run and the program launches. Python scripts, Node.js apps,
              HTML tools — they all just work.
            </p>
          </div>
          <div className="text-center">
            <div className="h-14 w-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Clean uninstall
            </h3>
            <p className="text-sm text-gray-500">
              Don&apos;t need a program anymore? Click Uninstall. The program and all
              its files are completely removed from your computer.
            </p>
          </div>
        </div>
      </section>

      {/* Setup note */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">
            First-time setup note (macOS)
          </h3>
          <p className="text-sm text-amber-700">
            Since the app isn&apos;t signed with an Apple Developer certificate yet,
            macOS may block it the first time. Right-click the app and select
            &quot;Open&quot; to bypass the warning. You only need to do this once.
          </p>
        </div>
      </section>
    </div>
  );
}

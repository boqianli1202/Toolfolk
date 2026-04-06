import {
  Heart,
  GraduationCap,
  Music,
  Clock,
  Gamepad2,
  Settings,
  Palette,
  MoreHorizontal,
} from "lucide-react";

export const CATEGORIES = [
  { slug: "personal-helper", label: "Personal Helper", icon: Heart, color: "bg-green-50 text-green-600 border-green-200" },
  { slug: "academic", label: "Academic", icon: GraduationCap, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { slug: "music", label: "Music", icon: Music, color: "bg-purple-50 text-purple-600 border-purple-200" },
  { slug: "history", label: "History", icon: Clock, color: "bg-amber-50 text-amber-600 border-amber-200" },
  { slug: "games", label: "Games", icon: Gamepad2, color: "bg-red-50 text-red-600 border-red-200" },
  { slug: "utilities", label: "Utilities", icon: Settings, color: "bg-gray-50 text-gray-600 border-gray-200" },
  { slug: "creative", label: "Creative", icon: Palette, color: "bg-pink-50 text-pink-600 border-pink-200" },
  { slug: "other", label: "Other", icon: MoreHorizontal, color: "bg-slate-50 text-slate-600 border-slate-200" },
] as const;

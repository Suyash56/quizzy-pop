"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    updated_at: string;
    view_timestamp?: string | null;
  };
  variant?: "horizontal" | "grid";
}

export function QuizCard({ quiz, variant = "grid" }: QuizCardProps) {
  const [formattedDate, setFormattedDate] = useState<string>("Recently");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) {
          return "Just now";
        } else if (diffInMinutes < 60) {
          return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
        } else if (diffInHours < 24) {
          return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
        } else if (diffInDays === 1) {
          return "Yesterday";
        } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
        } else if (diffInDays < 30) {
          const weeks = Math.floor(diffInDays / 7);
          return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
        } else {
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
        }
      } catch {
        return "Recently";
      }
    };

    setFormattedDate(formatDate(quiz.updated_at));
  }, [quiz.updated_at]);

  if (variant === "horizontal") {
    return (
      <Link href={`/quiz/${quiz.id}`} className="block">
        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 min-w-[320px] max-w-[400px] h-[240px] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg group overflow-hidden">
          {/* Chart Icon */}
          <div className="absolute top-4 right-4">
            <BarChart3 className="w-6 h-6 text-gray-400" />
          </div>

          {/* Title */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="text-sm text-gray-300 line-clamp-2">
                {quiz.description}
              </p>
            )}
          </div>

          {/* Simple Chart Visualization */}
          <div className="my-4 flex items-end gap-2 h-12">
            <div className="flex-1 bg-gray-700 rounded-t" style={{ height: "60%" }}></div>
            <div className="flex-1 bg-red-500 rounded-t" style={{ height: "100%" }}></div>
            <div className="flex-1 bg-gray-700 rounded-t" style={{ height: "40%" }}></div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                  {quiz.title.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-gray-400">My quiz</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Edited {isMounted ? formattedDate : "Recently"}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  // Grid variant
  return (
    <Link href={`/quiz/${quiz.id}`}>
      <div className="border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {quiz.description}
              </p>
            )}
          </div>
          <BarChart3 className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {quiz.title.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-500">My quiz</span>
          </div>
          <p className="text-xs text-gray-500">
            Edited {isMounted ? formattedDate : "Recently"}
          </p>
        </div>
      </div>
    </Link>
  );
}


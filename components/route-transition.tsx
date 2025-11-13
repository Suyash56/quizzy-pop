"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function RouteTransition() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reset loading state when pathname changes
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    // This will be handled by Next.js loading states
    // But we can add a small delay indicator for perceived performance
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    // Listen to route changes
    window.addEventListener("beforeunload", handleStart);

    return () => {
      window.removeEventListener("beforeunload", handleStart);
      handleComplete();
    };
  }, []);

  // Next.js handles loading states automatically with loading.tsx files
  // This component is mainly for additional visual feedback if needed
  return null;
}


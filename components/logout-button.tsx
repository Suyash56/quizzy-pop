"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
      } else {
        // Redirect to login page
        router.push("/auth/login");
        // Force a hard reload to clear any cached state
        router.refresh();
      }
    } catch (err) {
      console.error("Unexpected error during logout:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant="outline"
      className="w-full"
    >
      {loading ? "Logging out..." : "Logout"}
    </Button>
  );
}


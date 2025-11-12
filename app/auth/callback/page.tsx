"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      console.log("=== Client-side OAuth Callback ===");
      console.log("Window location:", window.location.href);
      console.log("Hash:", window.location.hash);
      console.log("Search params:", Object.fromEntries(searchParams.entries()));

      // Check for code in query params (server-side flow)
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Check for hash fragment (client-side flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashCode = hashParams.get("code");
      const hashError = hashParams.get("error");
      const hashErrorDescription = hashParams.get("error_description");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      console.log("Hash params:", {
        code: hashCode ? `${hashCode.substring(0, 20)}...` : null,
        error: hashError,
        accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
        refreshToken: refreshToken ? "exists" : null,
      });

      // Handle errors
      if (error || hashError) {
        const errorMsg = errorDescription || hashErrorDescription || error || hashError;
        console.error("OAuth error:", errorMsg);
        router.push(`/auth/login?error=${encodeURIComponent(errorMsg || "Authentication failed")}`);
        return;
      }

      // First, check if we already have a session (might be set automatically)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        console.log("✅ Session already exists, redirecting to dashboard...");
        console.log("Session user:", existingSession.user?.email);
        window.location.href = "/dashboard";
        return;
      }

      // If we have tokens in hash, set the session directly (preferred method)
      if (accessToken && refreshToken) {
        console.log("✅ Setting session from hash tokens...");
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Error setting session:", sessionError);
          router.push(`/auth/login?error=${encodeURIComponent(sessionError.message)}`);
          return;
        }

        if (sessionData.session) {
          console.log("✅ Session set successfully from tokens!");
          console.log("Session user:", sessionData.session.user?.email);
          window.location.href = "/dashboard";
          return;
        } else {
          console.error("❌ Session data missing after setSession");
        }
      }

      // Only try code exchange if we don't have tokens and don't have a session
      // This avoids PKCE errors when tokens are already available
      if ((hashCode || code) && !accessToken && !refreshToken) {
        const codeToExchange = hashCode || code;
        console.log("Code found (no tokens), attempting to exchange...");
        
        // Wait a bit for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to exchange the code - Supabase SSR should handle PKCE automatically
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeToExchange);
        
        if (exchangeError) {
          console.error("Error exchanging code:", exchangeError);
          
          // Check if it's a PKCE error
          if (exchangeError.message.includes("code verifier") || exchangeError.message.includes("code_verifier")) {
            console.warn("⚠️ PKCE error: Code verifier not found");
            console.log("Checking if session was set automatically...");
            
            // Try getting session one more time - sometimes Supabase sets it automatically
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log("✅ Found session via getSession after PKCE error, redirecting...");
              window.location.href = "/dashboard";
              return;
            }
            
            router.push(`/auth/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`);
            return;
          }
          
          router.push(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`);
          return;
        }

        if (exchangeData?.session) {
          console.log("✅ Code exchanged successfully!");
          console.log("Session user:", exchangeData.session.user?.email);
          window.location.href = "/dashboard";
          return;
        } else {
          console.error("❌ No session in exchange response");
          router.push(`/auth/login?error=${encodeURIComponent("Failed to create session")}`);
          return;
        }
      }

      // No code or tokens found
      console.error("❌ No authorization code or tokens found");
      router.push("/auth/login?error=No authorization code received");
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}


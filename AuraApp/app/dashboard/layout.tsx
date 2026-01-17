"use client";

import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = useActiveAccount();
  const router = useRouter();

  // Track if we've ever had an account connected in this session
  // This prevents redirecting on momentary wallet disconnections (e.g., during signing)
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (account) {
      wasConnectedRef.current = true;
    }
  }, [account]);

  useEffect(() => {
    // Only redirect if wallet was NEVER connected in this session
    // If wallet was connected before, don't redirect - the user may be in the middle of
    // a long-running operation (e.g., image generation which takes 15+ seconds)
    // and thirdweb can momentarily report account as undefined during wallet operations
    if (!account && !wasConnectedRef.current) {
      // Small delay to allow wallet to initialize on page load
      const timer = setTimeout(() => {
        if (!account && !wasConnectedRef.current) {
          console.log("[DashboardLayout] Redirecting to landing - wallet never connected");
          router.push("/");
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [account, router]);

  // If wallet was previously connected, always render children even if account is momentarily undefined
  // This prevents losing component state during wallet operations (signing, etc.)
  if (!account && !wasConnectedRef.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Authentication Required
          </h2>
          <p className="text-muted-foreground">
            Please connect your wallet to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-background text-foreground overflow-hidden">
      {children}
    </div>
  );
}


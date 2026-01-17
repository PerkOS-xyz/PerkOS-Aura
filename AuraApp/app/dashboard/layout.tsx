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
    if (!account) {
      // Different delays based on whether wallet was previously connected
      // - If never connected: redirect quickly (first load without wallet)
      // - If was connected: wait longer (wallet operations can cause momentary disconnection)
      const delay = wasConnectedRef.current ? 3000 : 500;

      const timer = setTimeout(() => {
        // Double-check account is still not connected before redirecting
        if (!account) {
          console.log("[DashboardLayout] Redirecting to landing - no wallet connected");
          router.push("/");
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [account, router]);

  if (!account) {
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


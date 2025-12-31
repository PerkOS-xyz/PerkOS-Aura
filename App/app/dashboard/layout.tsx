"use client";

import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "../components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = useActiveAccount();
  const router = useRouter();

  useEffect(() => {
    if (!account) {
      router.push("/");
    }
  }, [account, router]);

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-400">
            Please connect your wallet to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <Header />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}


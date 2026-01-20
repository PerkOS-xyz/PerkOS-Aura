"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";

interface SubscriptionStats {
  totalUsers: number;
  activeSubscriptions: number;
  byTier: Record<string, number>;
  totalRevenue: number;
}

interface UserCredits {
  walletAddress: string;
  balance: number;
  tier: string;
  subscriptionActive: boolean;
  subscriptionExpiresAt: string | null;
  lastMonthlyClaim: string | null;
  lifetimeEarned: number;
  lifetimeSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: string;
  walletAddress: string;
  tier: string;
  priceUsd: number;
  transactionHash?: string;
  paymentNetwork?: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

type ViewTab = "stats" | "users" | "subscriptions";

export default function AdminMembershipPage() {
  const account = useActiveAccount();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("stats");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [users, setUsers] = useState<UserCredits[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Action modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"grant-credits" | "set-tier" | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [actionAmount, setActionAmount] = useState<number>(0);
  const [actionTier, setActionTier] = useState<string>("starter");
  const [actionReason, setActionReason] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!account?.address) {
        setIsAuthorized(false);
        return;
      }
      try {
        const response = await fetch(`/api/admin/wallet/check?wallet=${account.address}`);
        if (response.ok) {
          const data = await response.json();
          setIsAuthorized(data.isAdmin || false);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        setIsAuthorized(false);
      }
    };
    checkAdmin();
  }, [account?.address]);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    if (!account?.address || !isAuthorized) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/membership?adminWallet=${account.address}&action=${activeTab}`
      );
      const data = await response.json();

      if (data.success) {
        switch (activeTab) {
          case "stats":
            setStats(data.stats);
            break;
          case "users":
            setUsers(data.users || []);
            break;
          case "subscriptions":
            setSubscriptions(data.subscriptions || []);
            break;
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [account?.address, isAuthorized, activeTab]);

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  // Handle admin action
  const handleAction = async () => {
    if (!account?.address || !actionType || !selectedUser) return;

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminWallet: account.address,
          action: actionType,
          walletAddress: selectedUser,
          ...(actionType === "grant-credits" && { amount: actionAmount, reason: actionReason }),
          ...(actionType === "set-tier" && { tier: actionTier }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || "Action completed successfully");
        setShowActionModal(false);
        fetchData();
      } else {
        alert(data.error || "Action failed");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open action modal
  const openActionModal = (type: "grant-credits" | "set-tier", userWallet?: string) => {
    setActionType(type);
    setSelectedUser(userWallet || "");
    setActionAmount(100);
    setActionTier("starter");
    setActionReason("");
    setShowActionModal(true);
  };

  if (!account?.address) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Admin - Membership Management</h1>
        <p className="text-muted-foreground">Please connect your wallet.</p>
      </div>
    );
  }

  if (isAuthorized === null) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">Unauthorized</h1>
        <p className="text-muted-foreground">You are not authorized to access this page.</p>
        <Link href="/admin" className="mt-4 inline-block text-primary hover:underline">
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Membership Management</h1>
          <p className="text-muted-foreground mt-1">View users, subscriptions, and revenue</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openActionModal("grant-credits")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
          >
            Grant Credits
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(["stats", "users", "subscriptions"] as ViewTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          {/* Stats View */}
          {activeTab === "stats" && stats && (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-3xl font-bold mt-1 text-green-400">{stats.activeSubscriptions}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold mt-1 text-amber-400">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground">By Tier</p>
                <div className="mt-2 space-y-1">
                  {Object.entries(stats.byTier).map(([tier, count]) => (
                    <div key={tier} className="flex justify-between text-sm">
                      <span className="capitalize">{tier}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users View */}
          {activeTab === "users" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Wallet</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Balance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Expires</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.walletAddress}>
                      <td className="px-4 py-3 text-sm font-mono">
                        {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{user.tier}</td>
                      <td className="px-4 py-3 text-sm">
                        {user.balance === -1 ? "Unlimited" : user.balance}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.tier !== "free" && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date() ? (
                          <span className="text-green-400">Active</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {user.subscriptionExpiresAt
                          ? new Date(user.subscriptionExpiresAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openActionModal("grant-credits", user.walletAddress)}
                            className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                          >
                            +Credits
                          </button>
                          <button
                            onClick={() => openActionModal("set-tier", user.walletAddress)}
                            className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30"
                          >
                            Set Tier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No users found</p>
              )}
            </div>
          )}

          {/* Subscriptions View */}
          {activeTab === "subscriptions" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Wallet</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Network</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {sub.walletAddress.slice(0, 6)}...{sub.walletAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{sub.tier}</td>
                      <td className="px-4 py-3 text-sm">${sub.priceUsd}</td>
                      <td className="px-4 py-3 text-sm">{sub.paymentNetwork || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(sub.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {subscriptions.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === "grant-credits" ? "Grant Credits" : "Set User Tier"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                />
              </div>

              {actionType === "grant-credits" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount</label>
                    <input
                      type="number"
                      value={actionAmount}
                      onChange={(e) => setActionAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason</label>
                    <input
                      type="text"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Promotional bonus"
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                    />
                  </div>
                </>
              )}

              {actionType === "set-tier" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tier</label>
                  <select
                    value={actionTier}
                    onChange={(e) => setActionTier(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowActionModal(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || !selectedUser}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

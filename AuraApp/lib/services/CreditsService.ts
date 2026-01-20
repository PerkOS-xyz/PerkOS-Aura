/**
 * Credits Service
 * Manages user credits, subscriptions, and transaction history
 */

import { getFirestoreInstance, COLLECTIONS } from "@/lib/db/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Subscription tiers and their benefits
export const SUBSCRIPTION_TIERS = {
  free: {
    id: "free",
    name: "Free",
    creditsPerMonth: 50,
    priceUsd: 0,
    discountPercent: 0,
    features: ["50 credits/month", "Basic AI services", "Community support"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    creditsPerMonth: 300,
    priceUsd: 4.99,
    discountPercent: 5,
    features: ["300 credits/month", "All AI services", "5% discount on x402", "Email support"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    creditsPerMonth: 1000,
    priceUsd: 14.99,
    discountPercent: 15,
    features: ["1000 credits/month", "All AI services", "15% discount on x402", "Priority support"],
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    creditsPerMonth: -1, // -1 means unlimited
    priceUsd: 49.99,
    discountPercent: 25,
    features: ["Unlimited credits", "All AI services", "25% discount on x402", "Dedicated support"],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Credit cost per interaction (1 credit = 1 AI interaction)
// This is for frontend access control only - x402 payments still apply
export const CREDIT_COST_PER_INTERACTION = 1;

export interface UserCredits {
  walletAddress: string;
  balance: number;
  tier: SubscriptionTier;
  subscriptionExpiresAt: Date | null;
  lastMonthlyClaim: Date | null;
  lifetimeEarned: number;
  lifetimeSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  walletAddress: string;
  amount: number;
  balanceAfter: number;
  type: "claim" | "spend" | "purchase" | "subscription" | "bonus" | "refund";
  serviceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  walletAddress: string;
  tier: SubscriptionTier;
  priceUsd: number;
  transactionHash?: string;
  paymentNetwork?: string;
  startsAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  createdAt: Date;
}

class CreditsService {
  private db = getFirestoreInstance();

  /**
   * Get or create user credits document
   */
  async getOrCreateUser(walletAddress: string): Promise<UserCredits> {
    const normalizedAddress = walletAddress.toLowerCase();
    const docRef = this.db.collection(COLLECTIONS.USER_CREDITS).doc(normalizedAddress);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data()!;
      return {
        ...data,
        walletAddress: normalizedAddress,
        subscriptionExpiresAt: data.subscriptionExpiresAt?.toDate() || null,
        lastMonthlyClaim: data.lastMonthlyClaim?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserCredits;
    }

    // Create new user with free tier
    const now = new Date();
    const newUser: UserCredits = {
      walletAddress: normalizedAddress,
      balance: 0,
      tier: "free",
      subscriptionExpiresAt: null,
      lastMonthlyClaim: null,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set({
      ...newUser,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return newUser;
  }

  /**
   * Get user's credit balance
   */
  async getBalance(walletAddress: string): Promise<{
    balance: number;
    tier: SubscriptionTier;
    tierInfo: typeof SUBSCRIPTION_TIERS[SubscriptionTier];
    subscriptionActive: boolean;
    canClaimMonthly: boolean;
  }> {
    const user = await this.getOrCreateUser(walletAddress);
    const tierInfo = SUBSCRIPTION_TIERS[user.tier];
    const now = new Date();

    // Check if subscription is still active
    const subscriptionActive = user.tier !== "free" &&
      user.subscriptionExpiresAt !== null &&
      user.subscriptionExpiresAt > now;

    // Check if user can claim monthly credits
    const canClaimMonthly = this.canClaimMonthly(user);

    return {
      balance: user.balance,
      tier: user.tier,
      tierInfo,
      subscriptionActive,
      canClaimMonthly,
    };
  }

  /**
   * Check if user can claim monthly credits
   */
  private canClaimMonthly(user: UserCredits): boolean {
    if (!user.lastMonthlyClaim) return true;

    const now = new Date();
    const lastClaim = new Date(user.lastMonthlyClaim);
    const nextClaimDate = new Date(lastClaim);
    nextClaimDate.setMonth(nextClaimDate.getMonth() + 1);

    return now >= nextClaimDate;
  }

  /**
   * Claim monthly credits
   */
  async claimMonthlyCredits(walletAddress: string): Promise<{
    success: boolean;
    creditsAdded: number;
    newBalance: number;
    nextClaimDate: Date;
    error?: string;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const user = await this.getOrCreateUser(normalizedAddress);

    if (!this.canClaimMonthly(user)) {
      const nextClaimDate = new Date(user.lastMonthlyClaim!);
      nextClaimDate.setMonth(nextClaimDate.getMonth() + 1);
      return {
        success: false,
        creditsAdded: 0,
        newBalance: user.balance,
        nextClaimDate,
        error: `Cannot claim yet. Next claim available on ${nextClaimDate.toLocaleDateString()}`,
      };
    }

    // Determine credits based on tier
    const tierInfo = SUBSCRIPTION_TIERS[user.tier];
    const creditsToAdd = tierInfo.creditsPerMonth;

    // Unlimited tier doesn't need to claim
    if (creditsToAdd === -1) {
      return {
        success: true,
        creditsAdded: 0,
        newBalance: -1, // Unlimited
        nextClaimDate: new Date(),
        error: "Unlimited tier - no claim needed",
      };
    }

    const now = new Date();
    const newBalance = user.balance + creditsToAdd;

    // Update user credits
    const docRef = this.db.collection(COLLECTIONS.USER_CREDITS).doc(normalizedAddress);
    await docRef.update({
      balance: newBalance,
      lastMonthlyClaim: Timestamp.fromDate(now),
      lifetimeEarned: FieldValue.increment(creditsToAdd),
      updatedAt: Timestamp.fromDate(now),
    });

    // Record transaction
    await this.recordTransaction({
      walletAddress: normalizedAddress,
      amount: creditsToAdd,
      balanceAfter: newBalance,
      type: "claim",
      description: `Monthly ${tierInfo.name} tier claim`,
    });

    const nextClaimDate = new Date(now);
    nextClaimDate.setMonth(nextClaimDate.getMonth() + 1);

    return {
      success: true,
      creditsAdded: creditsToAdd,
      newBalance,
      nextClaimDate,
    };
  }

  /**
   * Check if user has enough credits for an interaction
   * This is for frontend access control only - x402 payments still apply
   */
  async hasCredits(walletAddress: string): Promise<{
    hasCredits: boolean;
    cost: number;
    balance: number;
    isUnlimited: boolean;
  }> {
    const user = await this.getOrCreateUser(walletAddress);
    const cost = CREDIT_COST_PER_INTERACTION;

    // Check for unlimited tier
    if (user.tier === "unlimited" && user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()) {
      return {
        hasCredits: true,
        cost,
        balance: -1, // Unlimited
        isUnlimited: true,
      };
    }

    return {
      hasCredits: user.balance >= cost,
      cost,
      balance: user.balance,
      isUnlimited: false,
    };
  }

  /**
   * Deduct 1 credit for an interaction
   * This is for frontend access control only - x402 payments still apply
   */
  async deductCredit(walletAddress: string, description: string = "AI interaction"): Promise<{
    success: boolean;
    newBalance: number;
    cost: number;
    error?: string;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const user = await this.getOrCreateUser(normalizedAddress);
    const cost = CREDIT_COST_PER_INTERACTION;

    // Check for unlimited tier
    if (user.tier === "unlimited" && user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()) {
      // Record usage but don't deduct
      await this.recordTransaction({
        walletAddress: normalizedAddress,
        amount: 0,
        balanceAfter: -1,
        type: "spend",
        description: `${description} (Unlimited tier)`,
      });

      return {
        success: true,
        newBalance: -1,
        cost: 0,
      };
    }

    if (user.balance < cost) {
      return {
        success: false,
        newBalance: user.balance,
        cost,
        error: `Insufficient credits. Need ${cost}, have ${user.balance}`,
      };
    }

    const newBalance = user.balance - cost;
    const now = new Date();

    // Update balance
    const docRef = this.db.collection(COLLECTIONS.USER_CREDITS).doc(normalizedAddress);
    await docRef.update({
      balance: newBalance,
      lifetimeSpent: FieldValue.increment(cost),
      updatedAt: Timestamp.fromDate(now),
    });

    // Record transaction
    await this.recordTransaction({
      walletAddress: normalizedAddress,
      amount: -cost,
      balanceAfter: newBalance,
      type: "spend",
      description,
    });

    return {
      success: true,
      newBalance,
      cost,
    };
  }

  /**
   * Add credits (from purchase)
   */
  async addCredits(
    walletAddress: string,
    amount: number,
    type: "purchase" | "bonus" | "refund",
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance: number }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const user = await this.getOrCreateUser(normalizedAddress);
    const newBalance = user.balance + amount;
    const now = new Date();

    // Update balance
    const docRef = this.db.collection(COLLECTIONS.USER_CREDITS).doc(normalizedAddress);
    await docRef.update({
      balance: newBalance,
      lifetimeEarned: FieldValue.increment(amount),
      updatedAt: Timestamp.fromDate(now),
    });

    // Record transaction
    await this.recordTransaction({
      walletAddress: normalizedAddress,
      amount,
      balanceAfter: newBalance,
      type,
      description,
      metadata,
    });

    return { success: true, newBalance };
  }

  /**
   * Activate subscription
   */
  async activateSubscription(
    walletAddress: string,
    tier: SubscriptionTier,
    transactionHash?: string,
    paymentNetwork?: string
  ): Promise<{
    success: boolean;
    subscription: Subscription;
    creditsAdded: number;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const tierInfo = SUBSCRIPTION_TIERS[tier];
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Create subscription record
    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      walletAddress: normalizedAddress,
      tier,
      priceUsd: tierInfo.priceUsd,
      transactionHash,
      paymentNetwork,
      startsAt: now,
      expiresAt,
      autoRenew: false,
      createdAt: now,
    };

    // Save subscription
    await this.db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(subscription.id).set({
      ...subscription,
      startsAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: Timestamp.fromDate(now),
    });

    // Update user tier and add monthly credits
    const creditsToAdd = tierInfo.creditsPerMonth > 0 ? tierInfo.creditsPerMonth : 0;
    const user = await this.getOrCreateUser(normalizedAddress);
    const newBalance = user.balance + creditsToAdd;

    const docRef = this.db.collection(COLLECTIONS.USER_CREDITS).doc(normalizedAddress);
    await docRef.update({
      tier,
      subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
      balance: newBalance,
      lifetimeEarned: FieldValue.increment(creditsToAdd),
      lastMonthlyClaim: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    // Record transaction
    await this.recordTransaction({
      walletAddress: normalizedAddress,
      amount: creditsToAdd,
      balanceAfter: newBalance,
      type: "subscription",
      description: `Subscribed to ${tierInfo.name} plan`,
      metadata: { tier, transactionHash, paymentNetwork },
    });

    return {
      success: true,
      subscription,
      creditsAdded: creditsToAdd,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<CreditTransaction[]> {
    const normalizedAddress = walletAddress.toLowerCase();
    const snapshot = await this.db
      .collection(COLLECTIONS.CREDIT_TRANSACTIONS)
      .where("walletAddress", "==", normalizedAddress)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as CreditTransaction;
    });
  }

  /**
   * Record a credit transaction
   */
  private async recordTransaction(
    transaction: Omit<CreditTransaction, "id" | "createdAt">
  ): Promise<void> {
    const now = new Date();
    await this.db.collection(COLLECTIONS.CREDIT_TRANSACTIONS).add({
      ...transaction,
      createdAt: Timestamp.fromDate(now),
    });
  }

  /**
   * Get user's active subscription
   */
  async getActiveSubscription(walletAddress: string): Promise<Subscription | null> {
    const normalizedAddress = walletAddress.toLowerCase();
    const now = new Date();

    const snapshot = await this.db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where("walletAddress", "==", normalizedAddress)
      .where("expiresAt", ">", Timestamp.fromDate(now))
      .orderBy("expiresAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      startsAt: data.startsAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
    } as Subscription;
  }

  /**
   * Get discount percent for user's tier
   */
  async getDiscount(walletAddress: string): Promise<number> {
    const user = await this.getOrCreateUser(walletAddress);

    // Check if subscription is active
    if (user.tier !== "free" && user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()) {
      return SUBSCRIPTION_TIERS[user.tier].discountPercent;
    }

    return 0;
  }

  // ============================================
  // Admin Methods
  // ============================================

  /**
   * Get all subscriptions (admin)
   */
  async getAllSubscriptions(limit: number = 100): Promise<Subscription[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startsAt: data.startsAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
      } as Subscription;
    });
  }

  /**
   * Get subscription history for a user (invoices)
   */
  async getUserSubscriptionHistory(walletAddress: string): Promise<Subscription[]> {
    const normalizedAddress = walletAddress.toLowerCase();

    const snapshot = await this.db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where("walletAddress", "==", normalizedAddress)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startsAt: data.startsAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
      } as Subscription;
    });
  }

  /**
   * Get all users with credits (admin)
   */
  async getAllUsers(limit: number = 100): Promise<UserCredits[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.USER_CREDITS)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        walletAddress: doc.id,
        subscriptionExpiresAt: data.subscriptionExpiresAt?.toDate() || null,
        lastMonthlyClaim: data.lastMonthlyClaim?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserCredits;
    });
  }

  /**
   * Get subscription stats (admin)
   */
  async getSubscriptionStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    byTier: Record<string, number>;
    totalRevenue: number;
  }> {
    const users = await this.getAllUsers(1000);
    const now = new Date();

    const stats = {
      totalUsers: users.length,
      activeSubscriptions: 0,
      byTier: { free: 0, starter: 0, pro: 0, unlimited: 0 } as Record<string, number>,
      totalRevenue: 0,
    };

    for (const user of users) {
      stats.byTier[user.tier] = (stats.byTier[user.tier] || 0) + 1;
      if (user.tier !== "free" && user.subscriptionExpiresAt && user.subscriptionExpiresAt > now) {
        stats.activeSubscriptions++;
      }
    }

    // Calculate total revenue from subscriptions
    const subscriptions = await this.getAllSubscriptions(1000);
    stats.totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.priceUsd, 0);

    return stats;
  }

  /**
   * Admin: Grant bonus credits to user
   */
  async grantBonusCredits(
    walletAddress: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; newBalance: number }> {
    return this.addCredits(walletAddress, amount, "bonus", `Admin bonus: ${reason}`);
  }

  /**
   * Admin: Update user tier manually
   */
  async setUserTier(
    walletAddress: string,
    tier: SubscriptionTier,
    expiresAt?: Date
  ): Promise<{ success: boolean }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const now = new Date();
    const defaultExpiry = new Date(now);
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);

    const docRef = this.db.collection(COLLECTIONS.USER_CREDITS).doc(normalizedAddress);
    await docRef.update({
      tier,
      subscriptionExpiresAt: Timestamp.fromDate(expiresAt || defaultExpiry),
      updatedAt: Timestamp.fromDate(now),
    });

    return { success: true };
  }
}

// Export singleton instance
export const creditsService = new CreditsService();

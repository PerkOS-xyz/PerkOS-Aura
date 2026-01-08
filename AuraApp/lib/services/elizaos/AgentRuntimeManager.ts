/**
 * AgentRuntime Manager
 * Manages per-user elizaOS AgentRuntime instances with isolated memory
 * 
 * Reference: https://docs.elizaos.ai/runtime/core
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const elizaCore = require("@elizaos/core");
const AgentRuntime = elizaCore.AgentRuntime as new (config: any) => any;

import { FirebaseAdapter } from "./FirebaseAdapter";
import { createAIServiceCharacter } from "./character";
import { aiActions } from "./actions";

// Type alias for AgentRuntime since @elizaos/core has broken TypeScript exports
type AgentRuntimeInstance = InstanceType<typeof AgentRuntime>;

/**
 * Per-user AgentRuntime instances cache
 */
const runtimeInstances = new Map<string, AgentRuntimeInstance>();

/**
 * Get or create AgentRuntime instance for a user
 * Each user gets their own isolated runtime with separate memory
 */
export async function getAgentRuntime(userWalletAddress: string): Promise<AgentRuntimeInstance> {
  const key = userWalletAddress.toLowerCase();

  // Return existing instance if available
  if (runtimeInstances.has(key)) {
    return runtimeInstances.get(key)!;
  }

  // Create database adapter for this user
  const databaseAdapter = new FirebaseAdapter(userWalletAddress);

  // Create character configuration
  const character = createAIServiceCharacter(userWalletAddress);

  // Prefer OpenRouter, optional fallback to OpenAI for compatibility
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKeyFallback = process.env.OPENAI_API_KEY;

  if (!openRouterKey && !openAiKeyFallback) {
    throw new Error("OPENROUTER_API_KEY (or OPENAI_API_KEY) is required for elizaOS AgentRuntime");
  }

  const apiKey = openRouterKey || openAiKeyFallback!;

  // Simple deterministic UUID generator (v5-like)
  const stringToUuid = (str: string): string => {
    // This is a simplified version, for production use a proper UUID library
    // But for this purpose (generating distinct IDs from wallet addresses) it works
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(32, '0');
    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-4${hex.substr(13, 3)}-a${hex.substr(17, 3)}-${hex.substr(20, 12)}`;
  };

  const agentId = stringToUuid(`agent_${key}`);

  // Create AgentRuntime instance
  // Based on elizaOS docs: https://docs.elizaos.ai/runtime/core
  const runtime = new AgentRuntime({
    agentId: agentId as any, // Cast to avoid type error if strictly UUID
    adapter: databaseAdapter as any, // Cast to avoid missing properties error (SupabaseAdapter might be outdated)
    character,
    // Additional configuration
    settings: {
      OPENROUTER_API_KEY: openRouterKey,
      OPENAI_API_KEY: openAiKeyFallback,
    },
  });

  // Register AI actions
  aiActions.forEach((action) => {
    runtime.registerAction(action);
  });

  // Initialize the runtime (this will call adapter.init())
  try {
    await runtime.init();
    console.log(`✅ Initialized AgentRuntime for user: ${userWalletAddress}`);
  } catch (error) {
    console.error(`❌ Failed to initialize AgentRuntime for user ${userWalletAddress}:`, error);
    throw error;
  }

  // Store instance
  runtimeInstances.set(key, runtime);

  console.log(`✅ Created AgentRuntime for user: ${userWalletAddress}`);

  return runtime;
}

/**
 * Clean up runtime instance (for testing or cleanup)
 */
export function removeAgentRuntime(userWalletAddress: string): void {
  const key = userWalletAddress.toLowerCase();
  const runtime = runtimeInstances.get(key);

  if (runtime) {
    runtime.stop().catch(console.error);
    runtimeInstances.delete(key);
  }
}

/**
 * Get all active runtime instances (for monitoring)
 */
export function getActiveRuntimes(): string[] {
  return Array.from(runtimeInstances.keys());
}


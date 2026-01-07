/**
 * AIService wrapper - uses @perkos/service-ai package with singleton pattern
 */

import { AIService } from "@perkos/service-ai";

// Re-export the AIService class
export { AIService };

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

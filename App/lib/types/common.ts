/**
 * Common utility types used across the application
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    message?: string;
    details?: any;
}

export type NetworkName = "avalanche" | "avalanche-fuji" | "base" | "base-sepolia" | "celo" | "celo-sepolia";

export type CAIP2Network = `eip155:${number}`;

export interface WalletInfo {
    address: string;
    network: NetworkName;
}

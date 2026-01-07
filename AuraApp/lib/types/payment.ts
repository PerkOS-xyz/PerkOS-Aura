/**
 * Payment-related type definitions
 * Centralized types for x402 payment protocol
 */

export interface PaymentEnvelope {
    network: string;
    authorization: {
        from: string;
        to: string;
        value: string;
        validAfter: number;
        validBefore: number;
        nonce: string;
    };
    signature: string;
}

export interface PaymentRequirements {
    endpoint: string;
    method: string;
    price: string;
    network: string;
    payTo: string;
    facilitator: string;
    description?: string;
    paymentId?: string;
    maxAmountRequired?: string;
    resource?: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
    asset?: string;
    extra?: Record<string, any>;
}

export interface PaymentVerificationResult {
    isValid: boolean;
    response?: any;
    paymentResponseHeader?: string;
    error?: string;
}

export interface PaymentConfig {
    payTo: string;
    network: string;
    facilitatorUrl: string;
}

export interface ServiceDiscovery {
    service: string;
    version: string;
    description: string;
    capabilities: string[];
    endpoints: EndpointDefinition[];
}

export interface EndpointDefinition {
    path: string;
    method: string;
    description: string;
    price: string;
    network: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
}

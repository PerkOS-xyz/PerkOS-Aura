/**
 * Payment error class
 * For x402 payment-related failures
 */

import { AppError } from "./AppError";

export class PaymentError extends AppError {
    public readonly paymentDetails?: Record<string, any>;

    constructor(
        message: string = "Payment failed",
        paymentDetails?: Record<string, any>
    ) {
        super(message, 402, true, paymentDetails);
        this.paymentDetails = paymentDetails;
    }

    toJSON() {
        return {
            error: this.message,
            statusCode: this.statusCode,
            paymentDetails: this.paymentDetails,
            context: this.context,
        };
    }
}

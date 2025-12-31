/**
 * Validation error class
 * For request validation failures
 */

import { AppError } from "./AppError";
import { ZodError } from "zod";

export class ValidationError extends AppError {
    public readonly details?: any;

    constructor(message: string = "Validation failed", details?: any) {
        super(message, 400, true, { details });
        this.details = details;
    }

    static fromZodError(error: ZodError): ValidationError {
        return new ValidationError("Validation error", error.errors);
    }

    toJSON() {
        return {
            error: this.message,
            details: this.details,
            statusCode: this.statusCode,
            context: this.context,
        };
    }
}

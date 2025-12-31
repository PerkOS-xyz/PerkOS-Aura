/**
 * Base application error class
 * Extends Error with additional context
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: Record<string, any>;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        context?: Record<string, any>
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;

        Error.captureStackTrace(this);
    }

    toJSON() {
        return {
            error: this.message,
            statusCode: this.statusCode,
            context: this.context,
        };
    }
}

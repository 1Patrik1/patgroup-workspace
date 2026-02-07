import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from "@azure/functions";
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("httpMyaPP-function", "1.0.0");

const MAX_NAME_LENGTH = 255;

/**
 * Validates the input name string.
 * @param name - The name to validate
 * @returns Object with { valid: boolean, error?: string }
 */
function validateName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== "string") {
        return { valid: false, error: "Name must be a non-empty string" };
    }
    if (name.length > MAX_NAME_LENGTH) {
        return {
            valid: false,
            error: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`,
        };
    }
    // Prevent XSS: disallow < and > characters
    if (/<|>/.test(name)) {
        return {
            valid: false,
            error: "Name contains invalid characters (<, >)",
        };
    }
    return { valid: true };
}

export async function httpMyaPP(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const span = tracer.startSpan("httpMyaPP");

    try {
        span.setAttributes({
            "http.method": request.method || "UNKNOWN",
            "http.url": request.url || "UNKNOWN",
            "http.target": request.url?.split("?")[0] || "UNKNOWN",
        });

        context.log(`Http function processed request for url "${request.url}"`);

        // Extract name from query parameter or request body
        let name = request.query.get("name");

        if (!name) {
            try {
                const bodyText = await request.text();
                name =
                    bodyText && bodyText.trim() ? bodyText.trim() : undefined;
            } catch (bodyError) {
                span.recordException(bodyError as Error);
                context.log(`Error reading request body: ${bodyError}`);
                return {
                    status: 400,
                    jsonBody: {
                        error: "Failed to parse request body",
                    },
                };
            }
        }

        // Default to 'world' if no name provided
        name = name || "world";

        // Validate name
        const validation = validateName(name);
        if (!validation.valid) {
            span.setAttributes({
                "validation.status": "failed",
                "validation.error": validation.error || "Unknown error",
            });
            context.log(`Validation failed: ${validation.error}`);
            return {
                status: 400,
                jsonBody: {
                    error: validation.error,
                },
            };
        }

        span.setAttributes({
            "input.name": name,
            "validation.status": "passed",
        });

        const response = { message: `Hello, ${name}!` };
        span.addEvent("response_generated", {
            "response.length": response.message.length,
        });

        return {
            status: 200,
            jsonBody: response,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        context.log(`Unexpected error in httpMyaPP: ${errorMessage}`);
        return {
            status: 500,
            jsonBody: {
                error: "Internal server error",
            },
        };
    } finally {
        span.end();
    }
}

app.http("httpMyaPP", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    handler: httpMyaPP,
});

const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
    getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
    OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} = require("@opentelemetry/semantic-conventions");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-node");

// Configure resource with service information
const resource = Resource.default().merge(
    new Resource({
        [ATTR_SERVICE_NAME]: "patgroup-stavba-manager",
        [ATTR_SERVICE_VERSION]: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        "service.instance.id": process.pid.toString(),
    })
);

// Configure OTLP exporter to send traces to AI Toolkit or Jaeger
const traceExporter = new OTLPTraceExporter({
    url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        "http://localhost:4318/v1/traces",
    headers: {
        // Add custom headers if needed
    },
});

// Initialize OpenTelemetry SDK with auto-instrumentation
const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
        getNodeAutoInstrumentations({
            // Automatically instrument HTTP, filesystem, and other Node.js operations
            "@opentelemetry/instrumentation-fs": {
                enabled: true,
            },
            "@opentelemetry/instrumentation-http": {
                enabled: true,
                // Enhanced HTTP instrumentation config
                requestHook: (span, request) => {
                    span.setAttribute(
                        "http.user_agent",
                        request.headers["user-agent"] || "unknown"
                    );
                },
                responseHook: (span, response) => {
                    span.setAttribute(
                        "http.response.size",
                        response.getHeader("content-length") || 0
                    );
                },
            },
        }),
    ],
});

// Start the SDK
try {
    sdk.start();
    console.log("Tracing initialized successfully");
} catch (error) {
    console.error("Error initializing tracing:", error);
}

// Gracefully shut down the SDK on process exit
process.on("SIGTERM", () => {
    sdk.shutdown()
        .then(() => console.log("Tracing terminated"))
        .catch((error) => console.error("Error terminating tracing", error))
        .finally(() => process.exit(0));
});

process.on("SIGINT", () => {
    sdk.shutdown()
        .then(() => console.log("Tracing terminated"))
        .catch((error) => console.error("Error terminating tracing", error))
        .finally(() => process.exit(0));
});

module.exports = sdk;

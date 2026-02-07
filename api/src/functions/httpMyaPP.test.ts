import { httpMyaPP } from "./httpMyaPP";
import { HttpRequest, InvocationContext } from "@azure/functions";

// Mock HttpRequest
class MockHttpRequest {
    constructor(
        readonly url: string = "http://localhost:7071/api/httpMyaPP",
        readonly method: string = "GET",
        private queryParams: Map<string, string> = new Map(),
        private bodyText: string = ""
    ) {}

    query = {
        get: (key: string) => this.queryParams.get(key) ?? undefined,
    } as any;

    headers = {};
    body = this.bodyText;
    text = async () => this.bodyText;
}

// Mock InvocationContext
class MockInvocationContext {
    invocationId = "test-id";
    functionName = "httpMyaPP";
    logs: string[] = [];

    log = (...args: any[]) => {
        this.logs.push(args.join(" "));
    };

    extraInputs = [];
    extraOutputs = [];
    retryContext = null;
    traceContext = null;
}

describe("httpMyaPP", () => {
    it("should return Hello, world! as default when no name is provided", async () => {
        const request = new MockHttpRequest();
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(200);
        const body = result.jsonBody as any;
        expect(body.message).toBe("Hello, world!");
    });

    it("should use name from query parameter", async () => {
        const queryParams = new Map([["name", "Petra"]]);
        const request = new MockHttpRequest(
            "http://localhost:7071/api/httpMyaPP?name=Petra",
            "GET",
            queryParams
        );
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(200);
        const body = result.jsonBody as any;
        expect(body.message).toBe("Hello, Petra!");
    });

    it("should use name from request body when query param is not provided", async () => {
        const request = new MockHttpRequest(
            "http://localhost:7071/api/httpMyaPP",
            "POST",
            new Map(),
            "Karel"
        );
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(200);
        const body = result.jsonBody as any;
        expect(body.message).toBe("Hello, Karel!");
    });

    it("should return 400 when name exceeds maximum length", async () => {
        const longName = "a".repeat(256);
        const queryParams = new Map([["name", longName]]);
        const request = new MockHttpRequest(
            "http://localhost:7071/api/httpMyaPP?name=" + longName,
            "GET",
            queryParams
        );
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(400);
        const body = result.jsonBody as any;
        expect(body.error).toMatch(/exceeds maximum length/);
    });

    it("should return 400 when name contains invalid characters (<, >)", async () => {
        const queryParams = new Map([
            ["name", "<script>alert('xss')</script>"],
        ]);
        const request = new MockHttpRequest(
            "http://localhost:7071/api/httpMyaPP",
            "GET",
            queryParams
        );
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(400);
        const body = result.jsonBody as any;
        expect(body.error).toMatch(/contains invalid characters/);
    });

    it("should return 200 with world when body text is empty and no query param", async () => {
        const request = new MockHttpRequest(
            "http://localhost:7071/api/httpMyaPP",
            "POST",
            new Map(),
            ""
        );
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(200);
        const body = result.jsonBody as any;
        expect(body.message).toBe("Hello, world!");
    });

    it("should use query parameter over body text", async () => {
        const queryParams = new Map([["name", "FromQuery"]]);
        const request = new MockHttpRequest(
            "http://localhost:7071/api/httpMyaPP?name=FromQuery",
            "POST",
            queryParams,
            "FromBody"
        );
        const context = new MockInvocationContext();

        const result = await httpMyaPP(
            request as unknown as HttpRequest,
            context as unknown as InvocationContext
        );

        expect(result.status).toBe(200);
        const body = result.jsonBody as any;
        expect(body.message).toBe("Hello, FromQuery!");
    });
});

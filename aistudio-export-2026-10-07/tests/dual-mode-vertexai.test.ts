import assert from "node:assert/strict";
import { test } from "node:test";
import type { Server } from "node:http";
import { createApp } from "../server.ts";
import {
  isVertexAiActive,
  getVertexAiConfig,
  ALLOWED_GEMINI_MODELS,
  createGenAIClient,
  geminiGenerationControls,
} from "../server/runtime-config.ts";

test("Dual-mode: isVertexAiActive correctly detects Vertex AI environment variables", () => {
  assert.equal(isVertexAiActive({ GOOGLE_GENAI_USE_VERTEXAI: "true" }), true);
  assert.equal(isVertexAiActive({ GOOGLE_GENAI_USE_VERTEXAI: "1" }), true);
  assert.equal(isVertexAiActive({ VERTEX_AI: "true" }), true);
  assert.equal(isVertexAiActive({ VERTEX_AI: "1" }), true);
  assert.equal(isVertexAiActive({ GOOGLE_GENAI_USE_VERTEXAI: "false" }), false);
  assert.equal(isVertexAiActive({}), false);
  assert.equal(isVertexAiActive({ GEMINI_API_KEY: "AIzaSyFakeKey" }), false);
});

test("Dual-mode: getVertexAiConfig resolves project and location with proper defaults", () => {
  const custom = getVertexAiConfig({
    GOOGLE_CLOUD_PROJECT: "custom-gcp-project",
    GOOGLE_CLOUD_LOCATION: "asia-east1",
  });
  assert.equal(custom.project, "custom-gcp-project");
  assert.equal(custom.location, "asia-east1");

  const fallback = getVertexAiConfig({});
  assert.equal(fallback.project, "project-b2db87f6-7a4e-4020-972");
  assert.equal(fallback.location, "us-central1");
});

test("Dual-mode: ALLOWED_GEMINI_MODELS includes both Vertex AI 2.5 and AI Studio 3.1/3.8 models", () => {
  for (const model of [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ]) {
    assert(ALLOWED_GEMINI_MODELS.includes(model), `Model ${model} must be allowed`);
  }
});

test("Dual-mode: generation controls support gemini-2.5 models with temperature", () => {
  const factsConfig = geminiGenerationControls("gemini-2.5-flash", 0.1);
  assert.equal(factsConfig.temperature, 0.1);
  assert.equal("thinkingConfig" in factsConfig, false);

  const plannerConfig = geminiGenerationControls("gemini-2.5-flash", 0);
  assert.equal(plannerConfig.temperature, 0);
  assert.equal("thinkingConfig" in plannerConfig, false);

  const reviewer38 = geminiGenerationControls("gemini-3.8-flash", 0);
  assert.equal(reviewer38.thinkingConfig?.thinkingLevel, "LOW");
  assert.equal("temperature" in reviewer38, false);
});

test("Dual-mode: createGenAIClient initializes without error for both Vertex AI and Developer API options", () => {
  // Vertex AI ADC mode
  const vertexClient = createGenAIClient({
    vertexai: true,
    project: "project-b2db87f6-7a4e-4020-972",
    location: "us-central1",
  });
  assert(vertexClient);

  // Developer API Key mode
  const apiKeyClient = createGenAIClient({
    apiKey: "dummy-api-key-for-test",
  });
  assert(apiKeyClient);
});

test("Dual-mode: /api/config reports vertexai_agent_platform when vertexaiOverride is true", async () => {
  let server: Server | undefined;
  try {
    const app = createApp({
      vertexaiOverride: true,
      projectOverride: "test-vertex-project",
      locationOverride: "us-central1",
    });
    server = await new Promise<Server>((resolve) => {
      const owned = app.listen(0, "127.0.0.1", () => resolve(owned));
    });
    assert(server);
    const address = server.address();
    assert(address && typeof address === "object");
    const res = await fetch(`http://127.0.0.1:${address.port}/api/config`);
    assert.equal(res.status, 200);
    const config = await res.json();
    assert.equal(config.ok, true);
    assert.equal(config.backend_mode, "vertexai_agent_platform");
    assert.equal(config.vertexai.active, true);
    assert.equal(config.vertexai.project, "test-vertex-project");
    assert.equal(config.vertexai.location, "us-central1");
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    }
  }
});

test("Dual-mode: /api/config reports developer_api when vertexaiOverride is false", async () => {
  let server: Server | undefined;
  try {
    const app = createApp({
      vertexaiOverride: false,
      apiKeyOverride: "dummy-dev-key",
    });
    server = await new Promise<Server>((resolve) => {
      const owned = app.listen(0, "127.0.0.1", () => resolve(owned));
    });
    assert(server);
    const address = server.address();
    assert(address && typeof address === "object");
    const res = await fetch(`http://127.0.0.1:${address.port}/api/config`);
    assert.equal(res.status, 200);
    const config = await res.json();
    assert.equal(config.ok, true);
    assert.equal(config.backend_mode, "developer_api");
    assert.equal(config.vertexai.active, false);
    assert.equal(config.vertexai.project, null);
    assert.equal(config.vertexai.location, null);
    assert.equal(config.api_key_configured, true);
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    }
  }
});

test("Dual-mode: workflow endpoint passes Vertex AI parameters to generateContentFn without requiring GEMINI_API_KEY", async () => {
  let capturedArgs: any = null;
  let server: Server | undefined;
  try {
    const app = createApp({
      vertexaiOverride: true,
      projectOverride: "test-agent-platform-project",
      locationOverride: "us-central1",
      generateContentFn: async (args) => {
        capturedArgs = args;
        return {
          text: JSON.stringify({
            amount_minor: 14850,
            currency: "USD",
            receipt_status: "available",
            description: "Team lunch",
            employee_identifier: "SYNTH-EMP-001",
            missing_information: [],
            contradictions: [],
          }),
          modelVersion: "gemini-2.5-flash",
        };
      },
    });
    server = await new Promise<Server>((resolve) => {
      const owned = app.listen(0, "127.0.0.1", () => resolve(owned));
    });
    assert(server);
    const address = server.address();
    assert(address && typeof address === "object");
    const res = await fetch(`http://127.0.0.1:${address.port}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: "Team lunch $148.50 for SYNTH-EMP-001",
        amount_usd: "148.50",
        receipt_status: "available",
        employee_identifier: "SYNTH-EMP-001",
        model_id: "gemini-2.5-flash",
      }),
    });
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.ok, true);
    assert.equal(capturedArgs.vertexai, true);
    assert.equal(capturedArgs.project, "test-agent-platform-project");
    assert.equal(capturedArgs.location, "us-central1");
    assert.equal(capturedArgs.model, "gemini-2.5-flash");
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    }
  }
});

test("Dual-mode: explicit empty apiKeyOverride fails closed with 500 MISSING_API_KEY", async () => {
  let server: Server | undefined;
  try {
    const app = createApp({
      apiKeyOverride: "",
    });
    server = await new Promise<Server>((resolve) => {
      const owned = app.listen(0, "127.0.0.1", () => resolve(owned));
    });
    assert(server);
    const address = server.address();
    assert(address && typeof address === "object");
    const res = await fetch(`http://127.0.0.1:${address.port}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: "Team lunch $148.50 for SYNTH-EMP-001",
        amount_usd: "148.50",
        receipt_status: "available",
        employee_identifier: "SYNTH-EMP-001",
      }),
    });
    assert.equal(res.status, 500);
    const result = await res.json();
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "MISSING_API_KEY");
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
    }
  }
});

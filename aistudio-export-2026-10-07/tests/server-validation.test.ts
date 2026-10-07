import test from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import {
  ALLOWED_GEMINI_MODELS,
  GEMINI_MAX_ATTEMPTS,
  createApp,
  detectNarrativeReceiptSignals,
  extractNarrativeDollarAmountsMinor,
  parseFormUsdToMinor,
  validateAllowedModel,
  validateAndEnrichFacts,
} from "../server.ts";

test("1. extractNarrativeDollarAmountsMinor parses complete numeric tokens with and without commas and avoids partial matches", () => {
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Expense total was $8200.00."), [820000]);
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Expense total was $8,200.00."), [820000]);
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Amounts: $8200 and $8,200"), [820000, 820000]);
  assert.deepEqual(
    extractNarrativeDollarAmountsMinor("Charged $148.50 vs $1,234,567.89"),
    [14850, 123456789]
  );

  // Malformed tokens must not produce partial matches
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Malformed comma $12,34.00"), []);
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Three decimals $10.999"), []);
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Double decimal $8200.00.50"), []);
  assert.deepEqual(extractNarrativeDollarAmountsMinor("Negative amount $-50.00 or -$50.00"), []);
});

test("2. Receipt conflict logic binds lost/missing/illegible statements to receipt language", () => {
  // "Missing employee ID" must not trigger a receipt conflict when receipt is attached
  const narrativeWithMissingEmp = "Missing employee ID. Dinner $148.50, receipt attached.";
  const signals1 = detectNarrativeReceiptSignals(narrativeWithMissingEmp);
  assert.equal(signals1.indicatesMissing, false);
  assert.equal(signals1.indicatesAvailable, true);

  const validated1 = validateAndEnrichFacts(
    {
      amount_minor: 14850,
      currency: "USD",
      receipt_status: "available",
      description: "Dinner $148.50, receipt attached.",
      employee_identifier: null,
      missing_information: ["Employee identifier is missing."],
      contradictions: [],
    },
    {
      description: narrativeWithMissingEmp,
      amountMinorFromForm: 14850,
      amountRawText: "148.50",
      receiptStatus: "available",
      employeeIdentifier: null,
    }
  );
  assert.deepEqual(validated1.contradictions, []);

  // Genuine "receipt lost" and "no receipt" conflicts must still be preserved
  const genuineLost = validateAndEnrichFacts(
    {
      amount_minor: 14850,
      currency: "USD",
      receipt_status: "available",
      description: "Dinner $148.50, receipt lost.",
      employee_identifier: "SYNTH-EMP-1042",
      missing_information: ["Itemized receipt is missing."],
      contradictions: [],
    },
    {
      description: "Dinner $148.50, receipt lost.",
      amountMinorFromForm: 14850,
      amountRawText: "148.50",
      receiptStatus: "available",
      employeeIdentifier: "SYNTH-EMP-1042",
    }
  );
  assert.equal(genuineLost.contradictions.length, 1);
  assert.match(genuineLost.contradictions[0], /receipt/i);

  const genuineNoReceipt = validateAndEnrichFacts(
    {
      amount_minor: 5000,
      currency: "USD",
      receipt_status: "available",
      description: "Taxi $50.00, no receipt.",
      employee_identifier: "SYNTH-EMP-1042",
      missing_information: [],
      contradictions: [],
    },
    {
      description: "Taxi $50.00, no receipt.",
      amountMinorFromForm: 5000,
      amountRawText: "50.00",
      receiptStatus: "available",
      employeeIdentifier: "SYNTH-EMP-1042",
    }
  );
  assert.equal(genuineNoReceipt.contradictions.length, 1);
  assert.match(genuineNoReceipt.contradictions[0], /receipt/i);
});

test("3. parseFormUsdToMinor and validateAndEnrichFacts reject negative, non-finite, unsafe integers, and undefined contract fields", () => {
  assert.equal(parseFormUsdToMinor("-10.00").valid, false);
  assert.equal(parseFormUsdToMinor(-10).valid, false);
  assert.equal(parseFormUsdToMinor(Number.NaN).valid, false);
  assert.equal(parseFormUsdToMinor(Number.POSITIVE_INFINITY).valid, false);
  assert.equal(parseFormUsdToMinor("99999999999999999.99").valid, false);
  assert.deepEqual(parseFormUsdToMinor("8,200.00"), {
    provided: true,
    valid: true,
    amountMinor: 820000,
    rawText: "8,200.00",
  });

  const baseFormInput = {
    description: "[SYNTHETIC] Parking fee $38.00",
    amountMinorFromForm: 3800,
    amountRawText: "38.00",
    receiptStatus: "missing" as const,
    employeeIdentifier: "SYNTH-EMP-100",
  };

  // Reject negative amount_minor
  assert.throws(() =>
    validateAndEnrichFacts(
      {
        amount_minor: -3800,
        currency: "USD",
        receipt_status: "missing",
        description: "Parking fee",
        employee_identifier: "SYNTH-EMP-100",
        missing_information: ["Receipt missing"],
        contradictions: [],
      },
      baseFormInput
    )
  );

  // Reject non-finite / unsafe integer amount_minor
  for (const badAmount of [Number.NaN, Number.POSITIVE_INFINITY, 38.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() =>
      validateAndEnrichFacts(
        {
          amount_minor: badAmount,
          currency: "USD",
          receipt_status: "missing",
          description: "Parking fee",
          employee_identifier: "SYNTH-EMP-100",
          missing_information: ["Receipt missing"],
          contradictions: [],
        },
        baseFormInput
      )
    );
  }

  // Reject undefined in place of required null fields or omitted contract fields
  assert.throws(
    () =>
      validateAndEnrichFacts(
        {
          amount_minor: 3800,
          currency: "USD",
          receipt_status: "missing",
          description: "Parking fee",
          employee_identifier: undefined,
          missing_information: ["Receipt missing"],
          contradictions: [],
        },
        baseFormInput
      ),
    /Missing required contract field 'employee_identifier'/
  );

  assert.throws(
    () =>
      validateAndEnrichFacts(
        {
          currency: "USD",
          receipt_status: "missing",
          description: "Parking fee",
          employee_identifier: null,
          missing_information: ["Receipt missing"],
          contradictions: [],
        },
        baseFormInput
      ),
    /Missing required contract field 'amount_minor'/
  );
});

test("4. validateAndEnrichFacts rejects non-string or empty members in missing_information and contradictions", () => {
  const baseFormInput = {
    description: "[SYNTHETIC] Parking fee $38.00",
    amountMinorFromForm: 3800,
    amountRawText: "38.00",
    receiptStatus: "missing" as const,
    employeeIdentifier: "SYNTH-EMP-100",
  };

  assert.throws(
    () =>
      validateAndEnrichFacts(
        {
          amount_minor: 3800,
          currency: "USD",
          receipt_status: "missing",
          description: "Parking fee",
          employee_identifier: "SYNTH-EMP-100",
          missing_information: ["Valid string", 123 as unknown as string],
          contradictions: [],
        },
        baseFormInput
      ),
    /missing_information\[1\]/
  );

  assert.throws(
    () =>
      validateAndEnrichFacts(
        {
          amount_minor: 3800,
          currency: "USD",
          receipt_status: "missing",
          description: "Parking fee",
          employee_identifier: "SYNTH-EMP-100",
          missing_information: ["Valid string"],
          contradictions: [null as unknown as string],
        },
        baseFormInput
      ),
    /contradictions\[0\]/
  );

  assert.throws(
    () =>
      validateAndEnrichFacts(
        {
          amount_minor: 3800,
          currency: "USD",
          receipt_status: "missing",
          description: "Parking fee",
          employee_identifier: "SYNTH-EMP-100",
          missing_information: ["   "],
          contradictions: [],
        },
        baseFormInput
      ),
    /missing_information\[0\]/
  );
});

test("5. Ground employee_identifier in form or narrative, reject ungrounded model IDs, and preserve conflict sources", () => {
  // Neither form nor narrative supplies an employee ID -> model-proposed ID must fail validation
  assert.throws(
    () =>
      validateAndEnrichFacts(
        {
          amount_minor: 6425,
          currency: "USD",
          receipt_status: "unknown",
          description: "Airport rideshare",
          employee_identifier: "SYNTH-EMP-HALLUCINATED",
          missing_information: ["Receipt status unknown"],
          contradictions: [],
        },
        {
          description: "[SYNTHETIC] Late-night airport rideshare ($64.25 USD).",
          amountMinorFromForm: 6425,
          amountRawText: "64.25",
          receiptStatus: "unknown",
          employeeIdentifier: null,
        }
      ),
    /not grounded in the supplied form or narrative/
  );

  // Neither supplies an ID and model returns null -> enforces null
  const nullEmpResult = validateAndEnrichFacts(
    {
      amount_minor: 6425,
      currency: "USD",
      receipt_status: "unknown",
      description: "Airport rideshare",
      employee_identifier: null,
      missing_information: ["Receipt status unknown"],
      contradictions: [],
    },
    {
      description: "[SYNTHETIC] Late-night airport rideshare ($64.25 USD).",
      amountMinorFromForm: 6425,
      amountRawText: "64.25",
      receiptStatus: "unknown",
      employeeIdentifier: null,
    }
  );
  assert.equal(nullEmpResult.employee_identifier, null);

  // Form and narrative supply conflicting employee IDs:
  // Do not force output to equal form or invent a winner; preserve conflict naming both sources
  const conflictFromNarrativeWinner = validateAndEnrichFacts(
    {
      amount_minor: 4200,
      currency: "USD",
      receipt_status: "missing",
      description: "Adapter purchased by employee SYNTH-EMP-9981",
      employee_identifier: "SYNTH-EMP-9981",
      missing_information: ["Itemized receipt is missing."],
      contradictions: [],
    },
    {
      description:
        "[SYNTHETIC] Adapter purchased by employee SYNTH-EMP-9981 for $42.00 USD. Out of receipt paper.",
      amountMinorFromForm: 4200,
      amountRawText: "42.00",
      receiptStatus: "missing",
      employeeIdentifier: "SYNTH-EMP-2015",
    }
  );
  assert.equal(conflictFromNarrativeWinner.employee_identifier, "SYNTH-EMP-9981");
  assert.equal(conflictFromNarrativeWinner.contradictions.length, 1);
  assert.match(conflictFromNarrativeWinner.contradictions[0], /form/i);
  assert.match(conflictFromNarrativeWinner.contradictions[0], /narrative/i);
  assert.match(conflictFromNarrativeWinner.contradictions[0], /SYNTH-EMP-2015/);
  assert.match(conflictFromNarrativeWinner.contradictions[0], /SYNTH-EMP-9981/);

  // Also allows null employee_identifier when form and narrative conflict
  const conflictWithNullWinner = validateAndEnrichFacts(
    {
      amount_minor: 4200,
      currency: "USD",
      receipt_status: "missing",
      description: "Adapter purchased by employee SYNTH-EMP-9981",
      employee_identifier: null,
      missing_information: ["Itemized receipt is missing."],
      contradictions: [],
    },
    {
      description:
        "[SYNTHETIC] Adapter purchased by employee SYNTH-EMP-9981 for $42.00 USD. Out of receipt paper.",
      amountMinorFromForm: 4200,
      amountRawText: "42.00",
      receiptStatus: "missing",
      employeeIdentifier: "SYNTH-EMP-2015",
    }
  );
  assert.equal(conflictWithNullWinner.employee_identifier, null);
  assert.equal(conflictWithNullWinner.contradictions.length, 1);
});

test("6 & 7. Server allowlist, finite retries, and bounded JSON timeout response via offline HTTP server", async () => {
  // Check allowlist helper
  for (const allowed of ALLOWED_GEMINI_MODELS) {
    assert.equal(validateAllowedModel(allowed).allowed, true);
  }
  assert.equal(validateAllowedModel("custom-arbitrary-model").allowed, false);
  assert.equal(validateAllowedModel("gemini-3.1-pro-preview").allowed, false);

  // Test bounded timeout & finite retries on /api/analyze with no live API calls
  let callCount = 0;
  const app = createApp({
    apiKeyOverride: "offline-test-key-not-used-on-network",
    routeTimeoutMs: 80,
    generateContentFn: async ({ abortSignal }) => {
      callCount++;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 500);
        abortSignal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(
              abortSignal.reason ?? new DOMException("Aborted by timeout", "TimeoutError")
            );
          },
          { once: true }
        );
      });
      return { text: "{}" };
    },
  });

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // 1. Disallowed custom model is rejected with 400 UNSUPPORTED_MODEL
    const badModelRes = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "[SYNTHETIC] Test $20.00",
        amount_usd: "20.00",
        receipt_status: "available",
        model_id: "arbitrary-custom-model",
      }),
    });
    assert.equal(badModelRes.status, 400);
    const badModelJson = await badModelRes.json();
    assert.equal(badModelJson.ok, false);
    assert.equal(badModelJson.error.code, "UNSUPPORTED_MODEL");

    // 2. Timeout returns explicit JSON with run_id, http_status: 504, upstream_status: 504
    const timeoutRes = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "[SYNTHETIC] Test $20.00",
        amount_usd: "20.00",
        receipt_status: "available",
        model_id: "gemini-3.8-flash",
      }),
    });
    assert.match(timeoutRes.headers.get("content-type") || "", /application\/json/i);
    const timeoutJson = await timeoutRes.json();
    assert.equal(timeoutJson.ok, false);
    assert.match(timeoutJson.run_id, /^run_/);
    assert.equal(timeoutJson.http_status, 504);
    assert.equal(timeoutJson.upstream_status, 504);
    assert.equal(timeoutJson.error.code, "GEMINI_REQUEST_TIMEOUT");
    assert.equal(callCount, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 3. Verify finite retry count on transient 503
  let retryAttempts = 0;
  const retryApp = createApp({
    apiKeyOverride: "offline-test-key-not-used-on-network",
    routeTimeoutMs: 5000,
    generateContentFn: async () => {
      retryAttempts++;
      const err = new Error('{"error":{"code":503,"message":"Service Unavailable"}}');
      (err as Error & { status?: number }).status = 503;
      throw err;
    },
  });

  const retryServer: Server = await new Promise((resolve) => {
    const s = retryApp.listen(0, "127.0.0.1", () => resolve(s));
  });

  try {
    const address = retryServer.address();
    assert(address && typeof address === "object");
    const res = await fetch(`http://127.0.0.1:${address.port}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "[SYNTHETIC] Test $20.00",
        amount_usd: "20.00",
        receipt_status: "available",
        model_id: "gemini-3.8-flash",
      }),
    });
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.http_status, 503);
    assert.equal(body.upstream_status, 503);
    assert.equal(retryAttempts, GEMINI_MAX_ATTEMPTS);
  } finally {
    await new Promise<void>((resolve) => retryServer.close(() => resolve()));
  }
});

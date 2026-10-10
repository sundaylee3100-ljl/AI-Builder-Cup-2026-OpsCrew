import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";
import { DomainValidationError, requireRecord, validateVersionBinding } from "../src/domain/contracts.ts";
import { CaseService, CaseServiceError } from "./case-service.ts";
import type { ConfirmCommand } from "./case-service.ts";
import type { VerifySessionToken } from "./firebase-runtime.ts";

/** A timed-out commit has an unknown outcome; clients retain and replay the exact command. */
export async function withCaseDeadline<T>(operation: Promise<T>, timeoutMs = 30_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new CaseServiceError("CASE_STORAGE_TIMEOUT", "The case service deadline elapsed. Retry the same command or check owned history.", 503)), timeoutMs);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function verifiedOwner(request: Request, verifyIdToken: VerifySessionToken): Promise<string> {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer ([^\s]{1,4096})$/);
  if (!match) throw new CaseServiceError("UNAUTHENTICATED", "A verified demo session is required.", 401);
  try {
    const session = await withCaseDeadline(verifyIdToken(match[1]), 10_000);
    if (typeof session.uid !== "string" || !session.uid || session.uid.length > 128) throw new Error("Invalid identity.");
    return session.uid;
  } catch (error) {
    if (error instanceof CaseServiceError) throw error;
    throw new CaseServiceError("UNAUTHENTICATED", "The demo session expired or could not be verified. Sign in again.", 401);
  }
}
export function sendCaseError(response: Response, error: unknown): void {
  if (error instanceof CaseServiceError) {
    response.status(error.status).json({ok: false, http_status: error.status, error: {code: error.code, message: error.message}}); return;
  }
  if (error instanceof DomainValidationError) {
    const status = error.code === "STALE_VERSION" || error.code === "POLICY_MISMATCH" ? 409 : 400;
    response.status(status).json({ok: false, http_status: status, error: {code: error.code, message: "The record or command failed the current contract validation."}}); return;
  }
  // Provider details, tokens, infrastructure paths, and submitted content never become public errors.
  response.status(503).json({ok: false, http_status: 503, error: {code: "CASE_STORAGE_UNAVAILABLE", message: "The case service is temporarily unavailable. Retry the same command or check owned history."}});
}
export function createCaseRouter(options: {caseService: CaseService | null; verifyIdToken: VerifySessionToken | null}): Router {
  const router = Router();
  const route = (operation: (uid: string, request: Request) => Promise<unknown>): RequestHandler => async (request, response) => {
    try {
      if (!options.caseService || !options.verifyIdToken) throw new CaseServiceError("CASE_BACKEND_NOT_CONFIGURED", "Persistent cases are not configured. Plan and review remain available.", 503);
      const uid = await verifiedOwner(request, options.verifyIdToken);
      const result = await withCaseDeadline(operation(uid, request));
      response.json(result);
    } catch (error) { sendCaseError(response, error); }
  };
  router.get("/runs", route(async (uid) => ({ok: true, runs: await options.caseService!.listRuns(uid)})));
  router.get("/runs/:runId", route(async (uid, request) => ({ok: true, run: await options.caseService!.getRun(uid, request.params.runId as string)})));
  router.post("/runs/:runId/confirmation", route(async (uid, request) => {
    const body = requireRecord(request.body, ["binding"], "confirmation_request");
    const confirmation = await options.caseService!.prepareConfirmation(uid, request.params.runId as string, validateVersionBinding(body.binding));
    return {ok: true, confirmation};
  }));
  for (const [path, status] of [["reject", "REJECTED"], ["invalidate", "INVALIDATED"]] as const) {
    router.post(`/runs/:runId/${path}`, route(async (uid, request) => {
      const body = requireRecord(request.body, ["binding"], `${path}_request`);
      const run = await options.caseService!.markRun(uid, request.params.runId as string, validateVersionBinding(body.binding), status);
      return {ok: true, run};
    }));
  }
  router.get("/cases", route(async (uid) => ({ok: true, cases: await options.caseService!.listCases(uid)})));
  router.post("/cases", route(async (uid, request) => {
    const body = requireRecord(request.body, ["approval_id", "binding", "idempotency_key", "confirmed"], "case_command");
    const command = {...body, binding: validateVersionBinding(body.binding)} as unknown as ConfirmCommand;
    const result = await options.caseService!.confirm(uid, command);
    // This proves commit only. The client must issue the independent GET before showing verified success.
    return {ok: true, ...result};
  }));
  router.post("/cases/recover", route(async (uid, request) => {
    const body = requireRecord(request.body, ["approval_id", "binding", "idempotency_key", "confirmed"], "case_recovery_command");
    const command = {...body, binding: validateVersionBinding(body.binding)} as unknown as ConfirmCommand;
    const result = await options.caseService!.recover(uid, command);
    return {ok: true, ...result};
  }));
  router.get("/cases/:caseId", route(async (uid, request) => {
    const exceptionCase = await options.caseService!.readCase(uid, request.params.caseId as string);
    return {ok: true, case: exceptionCase, verified: true};
  }));
  return router;
}

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { PlanningReviewResult } from "../../server/planning-contracts.ts";
import type { ExceptionCase } from "../domain/contracts.ts";
import type { CaseBackendConfig, VisitorSession } from "../lib/firebase-session.ts";
import {
  caseApi, caseSubmissionPath, clearRecoveryCommand, isDefinitiveCaseDecline, readRecoveryCommand, saveRecoveryCommand,
  validatePreparedConfirmation, verifyIndependentCase,
  type PendingCaseCommand, type PreparedConfirmation,
} from "../lib/case-client.ts";

const BUTTON = "rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600";

export default function CaseConfirmation({ config, session, workflow, inputRevision, onRejected }: {
  config: CaseBackendConfig | null;
  session: VisitorSession;
  workflow: PlanningReviewResult | null;
  inputRevision: number;
  onRejected: () => void;
}) {
  const [confirmation, setConfirmation] = useState<PreparedConfirmation | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<PendingCaseCommand | null>(null);
  const [declined, setDeclined] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ExceptionCase | null>(null);
  const [history, setHistory] = useState<ExceptionCase[]>([]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const sequence = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastInputRevision = useRef(inputRevision);
  const readOnlyRecovery = useRef(false);
  // Close the mutation gate immediately during the render caused by a real input edit.
  if (lastInputRevision.current !== inputRevision) readOnlyRecovery.current = true;
  const bindingKey = JSON.stringify(workflow?.binding ?? null);
  const eligible = workflow?.status === "REVIEWABLE" && workflow.plan !== null && workflow.review?.verdict === "PASS" &&
    workflow.binding.owner_id === session.uid && receipt?.run_id !== workflow.binding.run_id;

  useEffect(() => {
    sequence.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setConfirmation(null);
    setConfirmed(false);
    setBusy("");
    setError("");
    setNotice("");
    // A completed case is a durable record, not a current plan. It remains visible after edits.
  }, [bindingKey, session.uid]);

  useEffect(() => {
    if (lastInputRevision.current === inputRevision) return;
    lastInputRevision.current = inputRevision;
    if (!pending || pending.owner_id !== session.uid) return;
    const invalidated = { ...pending, invalidated_locally: true };
    setPending(invalidated);
    try { saveRecoveryCommand(invalidated); }
    catch { setError("Your input edit cleared confirmation, but the recovery safety flag could not be saved. This session permits read-only recovery only. Check saved history before reloading."); }
    // A lost invalidation request cannot grant permission to retry an obsolete write.
  }, [inputRevision, pending, session.uid]);

  useEffect(() => {
    setReceipt(null);
    setHistory([]);
    setPending(null);
    setDeclined(null);
    if (!session.uid) return;
    try { setPending(readRecoveryCommand(session.uid)); }
    catch { setError("Saved recovery data could not be read. Check saved case history before submitting a new command."); }
  }, [session.uid]);

  useEffect(() => {
    if (!confirmation) return;
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [confirmation]);

  useEffect(() => () => { sequence.current += 1; abortRef.current?.abort(); }, []);

  const begin = (label: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const operation = ++sequence.current;
    setBusy(label); setError(""); setNotice("");
    return { signal: controller.signal, current: () => sequence.current === operation && !controller.signal.aborted };
  };

  const finish = (operation: ReturnType<typeof begin>) => {
    if (operation.current()) { setBusy(""); abortRef.current = null; }
  };

  const fail = (operation: ReturnType<typeof begin>, cause: unknown, fallback: string) => {
    if (operation.current()) setError(cause instanceof Error ? cause.message : fallback);
  };

  const refreshHistory = async () => {
    if (!session.uid) return;
    const owner = session.uid;
    const operation = begin("Loading saved case history");
    try {
      const payload = await caseApi<{ cases: unknown[] }>("/api/cases", session.headers, operation);
      if (!Array.isArray(payload.cases)) throw new Error("Saved history did not contain a valid case list.");
      const cases = payload.cases.map((item) => {
        const id = (item as ExceptionCase)?.case_id;
        return verifyIndependentCase(item, owner, id);
      });
      if (!operation.current()) return;
      setHistory(cases);
      setNotice(cases.length ? "Saved history loaded. Open a case to verify it with an independent read." : "No saved cases belong to this visitor session.");
    } catch (cause) { fail(operation, cause, "Saved history could not be read."); }
    finally { finish(operation); }
  };

  const readSavedCase = async (caseId: string, command?: PendingCaseCommand, operation?: ReturnType<typeof begin>) => {
    const owner = session.uid;
    if (!owner) throw new Error("The visitor session ended.");
    const payload = await caseApi<{ case: unknown; verified: boolean }>(`/api/cases/${encodeURIComponent(caseId)}`, session.headers, operation ?? {});
    if (payload.verified !== true) throw new Error("The server did not confirm an independent saved-case read.");
    const savedCase = verifyIndependentCase(payload.case, owner, caseId, command);
    if (operation && !operation.current()) return;
    setReceipt(savedCase);
    setHistory((previous) => [savedCase, ...previous.filter((entry) => entry.case_id !== savedCase.case_id)]);
    if (command) {
      try { clearRecoveryCommand(owner); setPending(null); }
      catch { setNotice("Case readback is verified. The retained recovery command safely points to the same case."); }
    }
    setNotice("Saved case verified through a separate read request. No reimbursement was approved or paid.");
  };

  const openHistoryCase = async (caseId: string) => {
    const operation = begin("Verifying saved case");
    try { await readSavedCase(caseId, undefined, operation); }
    catch (cause) { fail(operation, cause, "Saved-case verification failed."); }
    finally { finish(operation); }
  };

  const prepare = async () => {
    if (!workflow || !eligible || !session.uid) return;
    const operation = begin("Preparing current confirmation");
    setConfirmed(false);
    setConfirmation(null);
    try {
      const payload = await caseApi<{ confirmation: unknown }>(`/api/runs/${encodeURIComponent(workflow.binding.run_id)}/confirmation`, session.headers, {
        ...operation, method: "POST", body: { binding: workflow.binding },
      });
      const preview = validatePreparedConfirmation(payload.confirmation, workflow.binding);
      if (!operation.current()) return;
      setNow(Date.now());
      setConfirmation(preview);
      setNotice("Confirmation preview prepared. Review the exact plan and check the authorization below.");
    } catch (cause) { fail(operation, cause, "Confirmation could not be prepared."); }
    finally { finish(operation); }
  };

  const submitCommand = async (command: PendingCaseCommand, operation: ReturnType<typeof begin>) => {
    let currentCommand = command;
    if (!currentCommand.case_id) {
      const payload = await caseApi<{ case_id: string; approval_id: string; committed: boolean; replayed: boolean }>(caseSubmissionPath(currentCommand, readOnlyRecovery.current), session.headers, {
        ...operation, method: "POST", body: {
          approval_id: currentCommand.confirmation.approval_id,
          binding: currentCommand.confirmation.binding,
          idempotency_key: currentCommand.idempotency_key,
          confirmed: true,
        },
      });
      if (payload.committed !== true || typeof payload.case_id !== "string" || !payload.case_id.trim() ||
        typeof payload.approval_id !== "string" || !payload.approval_id.trim()) {
        throw new Error("The submission did not return a committed case reference. Recover this command before trying again.");
      }
      if (!operation.current()) return;
      currentCommand = { ...currentCommand, case_id: payload.case_id, committed_approval_id: payload.approval_id };
      saveRecoveryCommand(currentCommand);
      setPending(currentCommand);
      setBusy("Independently reading saved case");
    }
    await readSavedCase(currentCommand.case_id!, currentCommand, operation);
    if (operation.current()) { setConfirmation(null); setConfirmed(false); }
  };

  const createCase = async () => {
    if (!confirmation || !confirmed || !eligible || !session.uid || pending || Date.now() >= Date.parse(confirmation.expires_at)) return;
    const operation = begin("Submitting confirmed case");
    setDeclined(null);
    const command: PendingCaseCommand = {
      schema_version: "1.0.0", owner_id: session.uid, confirmation,
      idempotency_key: crypto.randomUUID(), case_id: null, committed_approval_id: null, invalidated_locally: false,
    };
    try {
      // Persist before sending so a lost response or reload can reuse this exact command.
      saveRecoveryCommand(command);
      readOnlyRecovery.current = false;
      setPending(command);
      await submitCommand(command, operation);
    } catch (cause) {
      if (operation.current() && isDefinitiveCaseDecline(cause)) setDeclined(cause.code);
      fail(operation, cause, "Submission outcome is unknown. Recover this command to verify a saved case.");
    } finally { finish(operation); }
  };

  const recover = async () => {
    if (!pending || pending.owner_id !== session.uid) return;
    const operation = begin("Recovering previous submission");
    setDeclined(null);
    try { await submitCommand(pending, operation); }
    catch (cause) {
      if (operation.current() && !pending.case_id && isDefinitiveCaseDecline(cause)) setDeclined(cause.code);
      fail(operation, cause, "Recovery failed. The same command is retained; no new command was sent.");
    }
    finally { finish(operation); }
  };

  const reject = async () => {
    if (!workflow || workflow.binding.owner_id !== session.uid) return;
    const operation = begin("Rejecting current plan");
    try {
      await caseApi(`/api/runs/${encodeURIComponent(workflow.binding.run_id)}/reject`, session.headers, {
        ...operation, method: "POST", body: { binding: workflow.binding },
      });
      if (!operation.current()) return;
      setConfirmation(null); setConfirmed(false);
      onRejected();
    } catch (cause) { fail(operation, cause, "Plan rejection failed."); }
    finally { finish(operation); }
  };

  const expired = confirmation !== null && now >= Date.parse(confirmation.expires_at);
  return <section id="case-confirmation" aria-labelledby="confirmation-heading" className="mt-8 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="confirmation-heading" className="text-base font-semibold text-slate-900">3. Human Confirmation &amp; Saved Case</h2>
        <p className="mt-1 text-xs text-slate-600">Only an explicitly confirmed, current plan can create one synthetic exception record.</p>
      </div>
      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{config?.enabled ? config.mode === "emulator" ? "Local Firebase emulators" : "Firebase sandbox" : "Plan-only preview"}</span>
    </div>
    {!config?.enabled ? <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Saved-case access is not configured for this preview. You can inspect AI plans and reviews; no case is created.</p> : <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-3">
        <div className="min-w-0 text-xs text-slate-700">
          <p className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{session.uid ? "Firebase visitor session" : "Visitor session required"}</p>
          <p className="mt-1 break-all">{session.uid ? `Owner: ${session.uid}` : "Start a Firebase visitor session to save your plans and cases. Access belongs to this browser tab; clearing the session can lose access to anonymous records."}</p>
        </div>
        <button type="button" disabled={!session.ready || session.busy || !!busy} onClick={() => void (session.uid ? session.end() : session.start())} className={BUTTON}>{session.busy ? "Connecting…" : session.uid ? "End visitor session" : "Start visitor session"}</button>
      </div>
      {session.error && <p role="alert" className="mt-3 text-sm text-red-800">{session.error}</p>}
      {session.uid && <>
        {eligible ? <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-700">Review the proposed case, amount, employee identifier, evidence requirements and original policy citations above before confirming.</p>
          {!confirmation && <button type="button" disabled={!!busy || !!pending} onClick={() => void prepare()} className={BUTTON}>Prepare human confirmation</button>}
          <button type="button" disabled={!!busy || !!pending || !!receipt && receipt.run_id === workflow?.binding.run_id} onClick={() => void reject()} className={`${BUTTON} ml-2`}>Reject this plan</button>
          {confirmation && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-950">Current confirmation preview · {expired ? "Expired — prepare a fresh confirmation" : `expires ${new Date(confirmation.expires_at).toLocaleTimeString()}`}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs break-all">
              <div><dt className="text-slate-600">Run / plan version</dt><dd className="font-mono">{confirmation.binding.run_id} / {confirmation.binding.plan_version}</dd></div>
              <div><dt className="text-slate-600">Input / facts version</dt><dd>{confirmation.binding.input_version} / {confirmation.binding.facts_version}</dd></div>
              <div><dt className="text-slate-600">Input SHA-256</dt><dd className="font-mono">{confirmation.input_digest}</dd></div>
              <div><dt className="text-slate-600">Plan SHA-256</dt><dd className="font-mono">{confirmation.plan_digest}</dd></div>
            </dl>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="checkbox" checked={confirmed} disabled={expired || !!busy || !!pending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-teal-700 focus-visible:outline-2 focus-visible:outline-teal-600" />
              <span>I reviewed these synthetic facts, policy citations and the passing AI review. I authorize creation of this exception record. This does not approve reimbursement or payment.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!confirmed || expired || !!busy || !!pending} onClick={() => void createCase()} className={`${BUTTON} bg-teal-700 text-white hover:bg-teal-600`}>Confirm &amp; create synthetic case</button>
              {expired && <button type="button" disabled={!!busy || !!pending} onClick={() => void prepare()} className={BUTTON}>Prepare fresh confirmation</button>}
            </div>
          </div>}
        </div> : <p className="mt-4 text-sm text-slate-600">{receipt && workflow && receipt.run_id === workflow.binding.run_id ? "This plan already has a verified saved case. Edit the inputs and run a new workflow to propose another case." : "A current plan with a passing review and the same visitor owner is required for human confirmation. Run the workflow after starting your session."}</p>}

        {pending && <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          <p className="font-semibold">Previous submission awaits verified readback</p>
          <p className="mt-1 break-all">Run: {pending.confirmation.binding.run_id} · Command: {pending.idempotency_key}</p>
          <p className="mt-2">{pending.invalidated_locally || readOnlyRecovery.current ? "Inputs changed after submission. Recovery only looks up an already committed case; it cannot create the obsolete plan." : "Recovery reuses the existing command. It reads a known case or safely retries the same unchanged submission; a committed case can be recovered after confirmation expiry."}</p>
          <button type="button" disabled={!!busy} onClick={() => void recover()} className={`${BUTTON} mt-3`}>Recover previous submission</button>
          {declined && !pending.case_id && <div className="mt-3"><p>The server declined this command ({declined}). It did not return a committed case. You can close this attempt and prepare a current plan.</p><button type="button" disabled={!!busy} className={`${BUTTON} mt-2`} onClick={() => {
            try { clearRecoveryCommand(pending.owner_id); setPending(null); setDeclined(null); setConfirmation(null); setConfirmed(false); setError(""); setNotice("Declined submission closed. Prepare a current confirmation before creating a case."); }
            catch { setError("The declined recovery command could not be cleared from this browser tab."); }
          }}>Close declined submission</button></div>}
        </div>}

        {receipt && <div className="mt-4 rounded-md border border-teal-300 bg-teal-50 p-4 text-teal-950" aria-label="Verified saved case">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />Saved case verified by independent readback</h3>
          <p className="mt-1 text-xs">{config.mode === "emulator" ? "Local emulator evidence; no cloud write is claimed." : "Firebase sandbox record."} No reimbursement was approved or paid.</p>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs break-all">
            <div><dt>Case ID</dt><dd className="font-mono font-semibold">{receipt.case_id}</dd></div>
            <div><dt>Status / action</dt><dd>{receipt.status} · {receipt.action}</dd></div>
            <div><dt>Amount / employee</dt><dd>USD {(receipt.amount_minor / 100).toFixed(2)} · {receipt.employee_identifier}</dd></div>
            <div><dt>Case type / receipt</dt><dd>{receipt.case_type} · {receipt.receipt_status}</dd></div>
            <div><dt>Run / plan</dt><dd className="font-mono">{receipt.run_id} / {receipt.plan_id} · v{receipt.plan_version}</dd></div>
            <div><dt>Created / confirmation</dt><dd className="font-mono">{receipt.created_at} / {receipt.approval_id}</dd></div>
          </dl>
        </div>}

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Your saved case history</h3><button type="button" disabled={!!busy} onClick={() => void refreshHistory()} className={`${BUTTON} inline-flex items-center gap-1.5`}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Refresh history</button></div>
          <p className="mt-1 text-xs text-slate-500">History is scoped by the verified visitor identity. Each case is verified again when opened.</p>
          {history.length > 0 && <ul className="mt-3 divide-y divide-slate-200">
            {history.map((savedCase) => <li key={savedCase.case_id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"><div className="min-w-0"><p className="font-mono break-all">{savedCase.case_id}</p><p className="mt-1 text-slate-600">{savedCase.case_type} · USD {(savedCase.amount_minor / 100).toFixed(2)} · {savedCase.created_at}</p></div><button type="button" disabled={!!busy} onClick={() => void openHistoryCase(savedCase.case_id)} className={BUTTON}>Open &amp; verify case</button></li>)}
          </ul>}
        </div>
      </>}
    </>}
    {busy && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-700"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{busy}…</p>}
    {notice && <p role="status" className="mt-3 text-sm text-teal-800">{notice}</p>}
    {error && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}{pending ? " The existing command is retained for recovery. A verified saved case has not been shown for this submission." : ""}</p>}
  </section>;
}

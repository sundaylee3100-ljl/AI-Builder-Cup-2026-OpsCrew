import type { PlanningReviewResult, PlanningStep } from "../../server/planning-contracts.ts";
import type { PolicyCitation } from "../domain/contracts.ts";

const STATUS_LABELS = {
  REVIEWABLE: "Ready for human review",
  NEEDS_INFO: "Clarification required",
  BLOCKED: "Blocked — resolve issues first",
  NO_ACTION_REQUIRED: "No exception needed",
} as const;

function CitationList({ citations, label }: { citations: PolicyCitation[]; label: string }) {
  return (
    <details className="rounded-md border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded">
        {label} ({citations.length}) — original policy text
      </summary>
      <ul className="mt-3 space-y-3">
        {citations.map((citation) => (
          <li key={citation.clause_id} className="border-l-2 border-teal-600 pl-3">
            <p className="text-xs font-mono text-teal-800 break-all">
              {citation.clause_id} · {citation.policy_version}
            </p>
            <blockquote className="mt-1 text-xs text-slate-700 leading-relaxed break-words">
              {citation.original_text}
            </blockquote>
          </li>
        ))}
      </ul>
    </details>
  );
}

function TextItems({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed break-words">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  ) : <p className="text-xs text-slate-600">{empty}</p>;
}

export function WorkflowSteps({ steps }: { steps: PlanningStep[] }) {
  return <div>
    <p className="text-xs text-slate-600">The server reports these completed attempts. Live progress within a request is unavailable.</p>
    <ol className="mt-3 space-y-2">
      {steps.map((step, index) => (
        <li key={`${step.role}-${step.attempt}-${index}`} className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
          <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{step.role} · attempt {step.attempt}</span><span className={step.outcome === "SUCCESS" ? "text-teal-800" : "text-red-800"}>{step.outcome} · {(step.duration_ms / 1000).toFixed(2)}s</span></div>
          <p className="mt-1 font-mono break-all">Model: {step.model_id}{step.requested_model_id !== step.model_id ? ` (requested: ${step.requested_model_id})` : ""}</p>
          <p className="mt-1 text-slate-600">Upstream status: {step.upstream_status ?? "not returned"} · Tokens: {step.token_usage ? `${step.token_usage.total_tokens ?? "not returned"} total; ${step.token_usage.prompt_tokens ?? "?"} prompt, ${step.token_usage.candidate_tokens ?? "?"} output, ${step.token_usage.thoughts_tokens ?? "?"} thoughts` : "not returned"}</p>
          {step.error_code && <p className="mt-1 text-red-800">Error: {step.error_code}</p>}
        </li>
      ))}
    </ol>
  </div>;
}

export default function WorkflowReview({ workflow }: { workflow: PlanningReviewResult }) {
  const { decision, plan, review, binding } = workflow;
  const ready = workflow.status === "REVIEWABLE" && review?.verdict === "PASS" && plan !== null;
  const statusClass = ready ? "border-teal-300 bg-teal-50 text-teal-950" :
    workflow.status === "BLOCKED" ? "border-red-200 bg-red-50 text-red-950" :
    workflow.status === "NEEDS_INFO" ? "border-amber-300 bg-amber-50 text-amber-950" :
    "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className="space-y-4" aria-label="AI plan and review">
      <section className={`rounded-lg border p-4 ${statusClass}`} aria-labelledby="workflow-outcome-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="workflow-outcome-heading" className="text-sm font-semibold">
            {STATUS_LABELS[workflow.status]}
          </h3>
          <span className="text-xs font-mono">S2 · {workflow.status}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed">{decision.summary}</p>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div><dt className="text-slate-600">Deterministic policy branch</dt><dd className="font-semibold mt-0.5">{decision.branch}</dd></div>
          <div><dt className="text-slate-600">Case eligible under policy</dt><dd className="font-semibold mt-0.5">{decision.case_eligible ? "Yes — recommendation only" : "No"}</dd></div>
        </dl>
        {workflow.status === "BLOCKED" && decision.status !== "BLOCKED" && (
          <p className="mt-3 text-xs font-medium">The policy decision is retained above. The AI workflow did not produce a passing, current review.</p>
        )}
        {decision.blockers.length > 0 && <div className="mt-3"><TextItems items={decision.blockers} empty="" /></div>}
        {decision.required_information.length > 0 && (
          <p className="mt-2 text-xs">Clarify: {decision.required_information.join(", ")}.</p>
        )}
      </section>

      <section aria-labelledby="policy-evidence-heading">
        <h3 id="policy-evidence-heading" className="text-xs font-semibold text-slate-800 mb-2">Policy evidence · synthetic demonstration policy</h3>
        <CitationList citations={decision.citations} label="Deterministic decision citations" />
      </section>

      <section className="rounded-md border border-slate-200 p-4" aria-labelledby="planner-heading">
        <h3 id="planner-heading" className="text-sm font-semibold text-slate-900">AI Planner</h3>
        {workflow.planner_rationale ? (
          <p className="mt-2 text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap">{workflow.planner_rationale}</p>
        ) : <p className="mt-2 text-xs text-slate-600">No validated Planner rationale is available for this run.</p>}

        {plan ? (
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800">Proposed case — has not been created</h4>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div><dt className="text-slate-500">Case type</dt><dd className="mt-1 font-semibold">{plan.proposed_case.case_type}</dd></div>
              <div><dt className="text-slate-500">Proposed action</dt><dd className="mt-1 font-mono break-all">{plan.action}</dd></div>
              <div><dt className="text-slate-500">Synthetic employee</dt><dd className="mt-1 font-mono break-all">{plan.proposed_case.employee_identifier}</dd></div>
              <div><dt className="text-slate-500">Amount</dt><dd className="mt-1 font-semibold">USD {(plan.proposed_case.amount_minor / 100).toFixed(2)} <span className="font-normal text-slate-500">({plan.proposed_case.amount_minor} cents)</span></dd></div>
              <div><dt className="text-slate-500">Receipt</dt><dd className="mt-1">{plan.proposed_case.receipt_status}</dd></div>
              <div><dt className="text-slate-500">Plan reference</dt><dd className="mt-1 font-mono break-all">{plan.plan_id} · v{plan.plan_version}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Description</dt><dd className="mt-1 break-words leading-relaxed">{plan.proposed_case.description ?? "Not supplied"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500 mb-1">Required evidence</dt><dd><TextItems items={plan.proposed_case.evidence_requirements} empty="No additional evidence is required by this policy branch." /></dd></div>
            </dl>
            <CitationList citations={plan.citations} label="Planner citations" />
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-600">
            {decision.case_eligible ? "A case could be eligible, but no validated plan is available. Resolve this run's error and retry." :
              decision.branch === "NO_ACTION_REQUIRED" ? "No case is proposed because the policy requires no exception." :
              "No case is proposed. Clarify missing or conflicting facts before running again."}
          </p>
        )}
      </section>

      <section className="rounded-md border border-slate-200 p-4" aria-labelledby="reviewer-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="reviewer-heading" className="text-sm font-semibold text-slate-900">Independent AI Reviewer</h3>
          <span className={`text-xs font-semibold ${review?.verdict === "PASS" ? "text-teal-800" : "text-amber-800"}`}>
            {review?.verdict ?? "Not completed"}
          </span>
        </div>
        <div className="mt-2 text-slate-700">
          {review ? <TextItems items={review.issues} empty="No unresolved issues were returned by the validated review." /> :
            <p className="text-xs">No validated Reviewer result is available. This run cannot proceed to human confirmation.</p>}
        </div>
        {review && <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500 break-all">Review {review.review_id} · {review.reviewed_at}</p>
          <CitationList citations={review.citations} label="Reviewer citations" />
        </div>}
      </section>

      <div className="rounded-md border border-slate-300 bg-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-900">
          {ready ? "Awaiting human confirmation — execution is unavailable in S2." : "No action has been executed."}
        </p>
        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
          S3 will add verified sign-in, explicit human confirmation and saved-case verification. A passing AI review grants no approval or permission to create a case, reimburse or pay.
        </p>
      </div>

      <details className="rounded-md border border-slate-200 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded">Run versions and completed-step telemetry</summary>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono break-all">
          <div><dt className="text-slate-500">Input / facts version</dt><dd>{binding.input_version} / {binding.facts_version}</dd></div>
          <div><dt className="text-slate-500">Policy version</dt><dd>{binding.policy_version}</dd></div>
          <div><dt className="text-slate-500">Plan reference</dt><dd>{binding.plan_id} · v{binding.plan_version}</dd></div>
          <div><dt className="text-slate-500">Owner context</dt><dd>{binding.owner_id} (local preview; no authenticated identity)</dd></div>
          {workflow.prompt_versions && <div className="sm:col-span-2">
            <dt className="text-slate-500">Prompt versions · facts / planner / reviewer</dt>
            <dd>{workflow.prompt_versions.facts} / {workflow.prompt_versions.planner} / {workflow.prompt_versions.reviewer}</dd>
          </div>}
        </dl>
        <div className="mt-3"><WorkflowSteps steps={workflow.steps} /></div>
      </details>
    </div>
  );
}

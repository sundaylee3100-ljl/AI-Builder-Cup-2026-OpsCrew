import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WorkflowReview from "../src/components/WorkflowReview.tsx";
import type { PlanningReviewResult } from "../server/planning-contracts.ts";
import { BINDING_FIELDS } from "../src/domain/contracts.ts";

// Real captured response, already sanitized. These consumer checks make no request.
const journal = readFileSync(new URL("../../docs/acceptance/DELIVERY-cloud-G3-2026-10-13.requests.jsonl", import.meta.url), "utf8")
  .trim().split(/\r?\n/).map((line) => JSON.parse(line));
const current: PlanningReviewResult = journal.find((entry) =>
  entry.event === "RESPONSE" && entry.payload?.workflow?.plan)?.payload.workflow;
assert.ok(current?.plan && current.review?.verdict === "PASS");
const render = (workflow: PlanningReviewResult) => renderToStaticMarkup(createElement(WorkflowReview, { workflow }));

test("a current passing real response exposes an explicitly copy-only operator draft", () => {
  const html = render(current);
  assert.match(html, /Operator communication draft/);
  assert.match(html, /Copy Draft/);
  assert.match(html, /Copying sends no message/);
  assert.match(html, /SYN-004/);
  for (const citation of current.decision.citations) assert.ok(html.includes(citation.clause_id));
  assert.doesNotMatch(html, /one-click dispatch|Autonomous Financial Operations Team|员工沟通/);
});

test("ineligible policy branches never present an outbound draft", () => {
  for (const branch of ["NEEDS_INFO", "BLOCKED", "NO_ACTION_REQUIRED"] as const) {
    const workflow = structuredClone(current);
    workflow.status = branch;
    workflow.decision.branch = branch;
    workflow.decision.case_eligible = false;
    workflow.plan = null;
    assert.doesNotMatch(render(workflow), /Operator communication draft|Copy Draft/);
  }
});

test("a failed or incomplete review cannot expose a previously prepared draft", () => {
  for (const verdict of ["NEEDS_INFO", "BLOCKED"] as const) {
    const workflow = structuredClone(current);
    workflow.review!.verdict = verdict;
    assert.doesNotMatch(render(workflow), /Operator communication draft|Copy Draft/);
  }
  assert.doesNotMatch(render({ ...current, review: null }), /Operator communication draft|Copy Draft/);
  assert.doesNotMatch(render({ ...current, plan: null }), /Operator communication draft|Copy Draft/);
});

test("each stale plan or review binding removes the communication draft", () => {
  for (const field of BINDING_FIELDS) {
    for (const record of ["plan", "review"] as const) {
      const workflow = structuredClone(current);
      const value = workflow[record]![field];
      Object.assign(workflow[record]!, { [field]: typeof value === "number" ? value + 1 : `${value}-stale` });
      assert.doesNotMatch(render(workflow), /Operator communication draft|Copy Draft/, `${record}.${field}`);
    }
  }
});

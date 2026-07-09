#!/usr/bin/env node
/**
 * Aggregate automated prototype session JSON files into a scorecard draft.
 * Input:  test-results/prototype-sessions/P-A*.json
 * Output: project-context/01-prototyping/validation-reports/automated-prototype-report.md
 *         test-results/prototype-sessions/summary.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sessionsDir = path.join(root, "test-results", "prototype-sessions");
const reportPath = path.join(
  root,
  "project-context/01-prototyping/validation-reports/automated-prototype-report.md",
);

function loadSessions() {
  if (!fs.existsSync(sessionsDir)) return [];
  return fs
    .readdirSync(sessionsDir)
    .filter((f) => f.startsWith("P-A") && f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(sessionsDir, f), "utf8")));
}

function avg(nums) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function main() {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    console.error("No session files in test-results/prototype-sessions/");
    process.exit(1);
  }

  const usabilityScores = sessions.map((s) => s.usabilityScore);
  const avgUsability = avg(usabilityScores);
  const wouldBookYes = sessions.filter((s) => s.wouldBook === "yes").length;
  const wouldBookMaybe = sessions.filter((s) => s.wouldBook === "maybe").length;
  const wouldBookPct = ((wouldBookYes + wouldBookMaybe) / sessions.length) * 100;

  const taskStats = {};
  for (const session of sessions) {
    for (const task of session.tasks) {
      if (!taskStats[task.id]) {
        taskStats[task.id] = { name: task.name, pass: 0, total: 0 };
      }
      taskStats[task.id].total += 1;
      if (task.pass) taskStats[task.id].pass += 1;
    }
  }

  const paymentPassRate =
    taskStats["task-3"]?.pass / (taskStats["task-3"]?.total || 1);
  const formPassRate =
    taskStats["task-4"]?.pass / (taskStats["task-4"]?.total || 1);

  const categoryScores = {
    brand: avg([taskStats["task-1"]?.pass / taskStats["task-1"]?.total || 0]) * 5,
    discovery: avg([taskStats["task-2"]?.pass / taskStats["task-2"]?.total || 0]) * 5,
    booking: paymentPassRate * 5,
    inquiry: formPassRate * 5,
    operations:
      avg([
        taskStats["task-ops"]?.pass / (taskStats["task-ops"]?.total || 1) || 0,
        taskStats["task-5"]?.pass / taskStats["task-5"]?.total || 0,
      ]) * 5,
    i18n: (taskStats["task-6"]?.pass / (taskStats["task-6"]?.total || 1)) * 5,
  };

  const overallCategoryAvg = avg(Object.values(categoryScores));
  const go =
    avgUsability >= 3.5 &&
    overallCategoryAvg >= 3.5 &&
    Math.min(...Object.values(categoryScores)) >= 2;

  const summary = {
    generatedAt: new Date().toISOString(),
    sessionsCount: sessions.length,
    avgUsability: Number(avgUsability.toFixed(2)),
    wouldBookPct: Number(wouldBookPct.toFixed(1)),
    paymentCompletionPct: Number((paymentPassRate * 100).toFixed(1)),
    formSubmitPct: Number((formPassRate * 100).toFixed(1)),
    categoryScores,
    recommendation: go ? "GO (automated slice)" : "REVIEW (fix failures before human sign-off)",
    sessions,
  };

  fs.writeFileSync(
    path.join(sessionsDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  const lines = [
    "# Automated Prototype Session Report",
    "",
    `**Generated:** ${summary.generatedAt}`,
    `**Sessions:** ${sessions.length} (Playwright personas — not a substitute for all human sessions)`,
    "",
    "## Participant summary",
    "",
    "| ID | Profile | Device | Tasks passed | Usability | Would book |",
    "|----|---------|--------|--------------|-----------|------------|",
    ...sessions.map(
      (s) =>
        `| ${s.participantId} | ${s.profile} | ${s.device} | ${s.tasksPassed}/6 | ${s.usabilityScore}/5 | ${s.wouldBook} |`,
    ),
    "",
    "## Aggregate metrics",
    "",
    `| Metric | Target | Actual |`,
    `|--------|--------|--------|`,
    `| Sessions completed | ≥ 4 automated | ${sessions.length} |`,
    `| Avg usability (1–5) | ≥ 3.5 | **${summary.avgUsability}** |`,
    `| Would book / maybe (%) | ≥ 60% | **${summary.wouldBookPct}%** |`,
    `| Payment flow completion (%) | ≥ 80% | **${summary.paymentCompletionPct}%** |`,
    `| Form submit success (%) | ≥ 95% | **${summary.formSubmitPct}%** |`,
    "",
    "## Task pass rates",
    "",
    "| Task | Pass rate |",
    "|------|-----------|",
    ...Object.entries(taskStats).map(([id, stat]) => {
      const pct = ((stat.pass / stat.total) * 100).toFixed(0);
      return `| ${stat.name} (${id}) | ${stat.pass}/${stat.total} (${pct}%) |`;
    }),
    "",
    "## Suggested scorecard category scores (draft)",
    "",
    "| Category | Suggested score (1–5) |",
    "|----------|----------------------|",
    `| Brand & first impression | ${categoryScores.brand.toFixed(1)} |`,
    `| Discovery & navigation | ${categoryScores.discovery.toFixed(1)} |`,
    `| Booking & payment | ${categoryScores.booking.toFixed(1)} |`,
    `| Inquiry forms | ${categoryScores.inquiry.toFixed(1)} |`,
    `| Operations & notifications | ${categoryScores.operations.toFixed(1)} |`,
    `| Multilingual & accessibility | ${categoryScores.i18n.toFixed(1)} |`,
    "",
    `**Automated category average:** ${overallCategoryAvg.toFixed(2)}`,
    "",
    "## Recommendation",
    "",
    `**${summary.recommendation}**`,
    "",
    "### How this counts toward Phase 1",
    "",
    "- Automated sessions (`P-A01` … `P-A06`) cover **functional smoke** for all 6 test-script tasks.",
    "- You still need **≥ 1–2 real human sessions** (premium perception, trust, SMS on device).",
    "- Copy suggested scores into `prototype-scorecard.md` and note \"automated evidence\" in the Evidence column.",
    "- Update `participant-matrix.md` — mark automated rows as `Completed (automated)`.",
    "",
    "## Per-session detail",
    "",
    ...sessions.flatMap((s) => [
      `### ${s.participantId} — ${s.profile} (${s.device})`,
      "",
      `Guest: ${s.guestName ?? "—"} · ${s.guestEmail ?? "—"}`,
      "",
      "| Task | Pass | Notes |",
      "|------|------|-------|",
      ...s.tasks.map(
        (t) => `| ${t.name} | ${t.pass ? "✓" : "✗"} | ${t.notes ?? ""} |`,
      ),
      "",
    ]),
  ];

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
  console.log(`\n✓ Wrote ${reportPath}`);
  console.log(`✓ Wrote ${path.join(sessionsDir, "summary.json")}`);
  console.log(`  Recommendation: ${summary.recommendation}\n`);
}

main();

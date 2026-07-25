#!/usr/bin/env bash
# PreToolUse gate for `git commit`.
#
# Two jobs, in order:
#   1. Run the vantage gate (`npm run check` = typecheck + lint + tests). BLOCK the commit if
#      it fails, so broken code can't land — the local mirror of CI.
#   2. On pass, remind to keep the docs current (BACKLOG · README · ADR index · memory).
#
# Escape hatches (so it never traps a WIP commit):
#   • pass `--no-verify` or put `[skip-check]` in the message to skip the gate
#   • if vantage/node_modules is missing (fresh clone), skip gracefully rather than error
set -uo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Only act on git commits.
printf '%s' "$cmd" | grep -q 'git commit' || exit 0

DOCS_REMINDER="DOCS CHECK before this commit — update anything affected: docs/BACKLOG.md story status, README, any affected ADR (see docs/engineering/ADRS.md), and auto-memory. If already current, proceed."
allow() { jq -n --arg c "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$c}}'; exit 0; }

# Escape hatch → skip the gate, still remind about docs.
if printf '%s' "$cmd" | grep -Eq -- '--no-verify|\[skip-check\]'; then
  allow "Gate skipped (--no-verify / [skip-check]). $DOCS_REMINDER"
fi

DIR="${CLAUDE_PROJECT_DIR:-.}/vantage"

# Fresh clone with no deps → don't block, just remind.
if [ ! -d "$DIR/node_modules" ]; then
  allow "Skipped 'npm run check' (vantage/node_modules not installed — run npm install). $DOCS_REMINDER"
fi

# Run the gate.
if out=$(cd "$DIR" && npm run check 2>&1); then
  allow "✅ vantage check passed (typecheck · lint · tests). $DOCS_REMINDER"
else
  summary=$(printf '%s' "$out" | grep -E 'error|Tests:|✖|FAIL' | tail -15)
  jq -n --arg s "$summary" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("`npm run check` failed — fix before committing (or use --no-verify to skip):\n" + $s)}}'
  exit 0
fi

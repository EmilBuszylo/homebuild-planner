#!/usr/bin/env bash
# Shared helpers for afterFileEdit hooks (agent Write tool only).

read_hook_input() {
  HOOK_INPUT=$(cat)
  export HOOK_INPUT
}

hook_workspace_root() {
  printf '%s' "$HOOK_INPUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
roots = data.get("workspace_roots") or []
print(roots[0] if roots else "")
'
}

hook_file_path() {
  printf '%s' "$HOOK_INPUT" | python3 -c '
import json, sys
data = json.load(sys.stdin)
print(data.get("file_path") or "")
'
}

# True when the edited file should run TS/JS lint or typecheck.
is_typescript_or_javascript_file() {
  local path="$1"
  case "$path" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) return 0 ;;
    *) return 1 ;;
  esac
}

# True when the edited file can affect project-wide types.
is_typescript_file() {
  local path="$1"
  case "$path" in
    *.ts|*.tsx|*.mts|*.cts) return 0 ;;
    *) return 1 ;;
  esac
}

file_under_workspace() {
  local file_path="$1"
  local root="$2"
  [[ -n "$file_path" && -n "$root" && "$file_path" == "$root"* ]]
}

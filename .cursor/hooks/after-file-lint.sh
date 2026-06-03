#!/usr/bin/env bash
# afterFileEdit: ESLint on the file the agent just wrote (Write tool).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

read_hook_input

FILE_PATH="$(hook_file_path)"
ROOT="$(hook_workspace_root)"

if [[ -z "$FILE_PATH" || -z "$ROOT" ]]; then
  exit 0
fi

if ! file_under_workspace "$FILE_PATH" "$ROOT"; then
  exit 0
fi

if ! is_typescript_or_javascript_file "$FILE_PATH"; then
  exit 0
fi

cd "$ROOT"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "after-file-lint: pnpm not on PATH" >&2
  exit 1
fi

echo "after-file-lint: $FILE_PATH" >&2
pnpm exec eslint --max-warnings 0 "$FILE_PATH" >&2

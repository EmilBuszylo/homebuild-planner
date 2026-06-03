#!/usr/bin/env bash
# afterFileEdit: project-wide tsc --noEmit after agent edits a TS/TSX file.
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

if ! is_typescript_file "$FILE_PATH"; then
  exit 0
fi

cd "$ROOT"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "after-file-typecheck: pnpm not on PATH" >&2
  exit 1
fi

echo "after-file-typecheck: $FILE_PATH (running pnpm typecheck)" >&2
pnpm typecheck >&2

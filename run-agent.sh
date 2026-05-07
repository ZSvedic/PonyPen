#!/usr/bin/env bash

usage() {
    CMD="$0"
    cat << EOF
Helper script to run an agent with a prompt and context.

USAGE:
  $CMD [--dry-run] PROMPT PROVIDER MODE [include1 ...] [-- path1 ...]

     [--dry-run]     Prints the command without executing.
          PROMPT     <"prompt_text"|prompt_file>
        PROVIDER     <codex|claude|copilot|cursor>
            MODE     <batch|interactive>
  [include1 ...]     Files to include by content.
  [-- path1 ...]     Files to reference by path (after -- separator).

EXAMPLE:
  $CMD prompts/woz-app.md codex batch *.md -- *.sh

  Sends the 'prompts/woz-app.md' prompt to the 'codex' agent in 'batch' mode, 
  with content of all '*.md' files and paths of all '*.sh' files.
EOF
    exit 1
}

# Inherit ERR trap. Exit on error, undefined variable, or pipe failure.
set -Eeuo pipefail 
trap 'echo "FAIL: $BASH_COMMAND"' ERR

# DRY_RUN processing.
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  shift 
else
  DRY_RUN=false
fi

# Argument processing: first 3 are PROMPT, PROVIDER, MODE; then INCLUDES until '--', then PATHS.

[ "$#" -lt 4 ] && usage 

PROMPT=$1 
PROVIDER=$2 
MODE=$3; 
shift 3

INCLUDES=() 
PATHS=() 
literal=0
for a; do
  [[ $a == -- ]] && { literal=1; continue; }
  ((literal)) && PATHS+=("$a") || INCLUDES+=("$a")
done

# PROMPT processing: if a file, read its content. 
if [ -f "$PROMPT" ]; then
  PROMPT=$(<"$PROMPT")
fi

# INCLUDES processing: for each file, add a section with its name and content.
if (( ${#INCLUDES[@]} )); then
  for f in "${INCLUDES[@]}"; do
    PROMPT+=$'\n~~~~~'"$(basename "$f")"$'\n'"$(<"$f")"$'\n~~~~~\n'
  done
fi

# PATHS processing.
if (( ${#PATHS[@]} )); then
  for f in "${PATHS[@]}"; do 
    PROMPT+=$'\n'"$f"; 
  done
fi

# Determine agent call based on PROVIDER and MODE.
case "$PROVIDER:$MODE" in
  codex:batch)
    CALL=(codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check "$PROMPT") ;;
  codex:interactive) 
    CALL=(codex --dangerously-bypass-approvals-and-sandbox "$PROMPT") ;;
  claude:batch) 
    CALL=(claude -p --verbose --debug --permission-mode bypassPermissions "$PROMPT") ;;
  claude:interactive) 
    CALL=(claude --permission-mode bypassPermissions "$PROMPT") ;;
  copilot:batch) 
    CALL=(copilot -p "$PROMPT" --allow-all-tools --allow-all-paths --allow-all-urls) ;;
  copilot:interactive) 
    CALL=(copilot -i "$PROMPT" --allow-all-tools --allow-all-paths --allow-all-urls) ;;
  cursor:batch) 
    CALL=(agent --print --force --trust "$PROMPT") ;;
  cursor:interactive) 
    CALL=(agent --force "$PROMPT") ;;
  *) 
    usage ;;
esac

# Dry run or run with/without log.
if [ "$DRY_RUN" == true ]; then
  printf "DRY RUN:\n"
  printf "%q " "${CALL[@]}"; echo
else
  if [[ $MODE == batch ]]; then
    "${CALL[@]}" 2>&1 | tee "$PROVIDER.log.md"
  else
    "${CALL[@]}"
  fi
fi

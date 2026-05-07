Implement the full app from the spec.

## Variables
AGENT=your short lowercase name (e.g. claude/codex/copilot/cursor) 
SUMMARY_FN=`run-AGENT-dYYYYMMDD-tHHMM.md`, (e.g. `run-cursor-d20251228-t1145.md`)

## Input
- Read-only files in the [spec/](spec/) dir. 
- Because your implementation must be original: 
  - Do NOT read files from other dirs.
  - Do NOT run any git or history commands.

## Output
- Generate all tests in the `src-AGENT/tests/` dir.
- Generate all app files in the `src-AGENT/` dir.
- Don't generate test or app files in other dirs.

## Procedure
1. Read the main [spec.md](spec/spec.md) and its links.
2. Use red-green TDD: create tests that fail before implementation.
3. Implement iteratively in this order: headless, CLI, web. 
4. Run automated tests after each iteration until the required tests pass.
5. Run manual ad-hoc tests to check spec conformance.
6. After both automated and ad-hoc tests pass, simplify the code for human review.
7. You are finished when:
   - The app is implemented.
   - All automated and ad-hoc tests pass.
   - Everything is simplified and ready for human review.
8. Create a summary file named SUMMARY_FN in this directory that contains:
   - A list of everything you did.
   - Important decisions.
   - Remaining issues.
   - Ideas for spec improvements. 

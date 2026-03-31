# Claude Code Rules
- ALWAYS work on the dev branch
- NEVER create claude/* branches
- NEVER commit to main directly
- NEVER push to main unless the user explicitly asks
- After every task, ask: "Ready to save progress to dev?"
- If yes: push to origin dev only
- After production promote run: git push origin dev:main (only when user requests)

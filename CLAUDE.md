# Claude Code Rules
- ALWAYS work on the dev branch
- NEVER create claude/* branches
- NEVER commit to main directly
- After every task, ask: "Ready to save progress to dev?"
- If yes: push to origin dev only
- After production promote run: git push origin dev:main

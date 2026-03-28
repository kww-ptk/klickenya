# Claude Code Rules

## Branch Rules
- NEVER commit directly to main
- ALL work is done in the current worktree session
- At the end of EVERY task, ask: "Ready to save progress to dev?"
- If I say yes: merge changes to dev and push to origin dev
- If I say no: wait and ask again when I'm ready

## After I Promote to Production in Vercel
- Run: git checkout main && git merge dev && git push origin main && git checkout dev
- This keeps main = what's live

## Start of Every Session
- Run git pull origin dev to get latest changes
- Always work from the latest dev state

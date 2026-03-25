# Git Workflow & Commit Conventions

## Branch Naming

```
feature/<short-description>   → feature/validation-engine
fix/<short-description>       → fix/jwt-cookie-not-set
chore/<short-description>     → chore/update-dependencies
refactor/<short-description>  → refactor/idea-service-layer
```

Never commit directly to `main`. Always branch, always PR.

## Commit Message Format

Use conventional commits. Every commit message follows this structure:

```
<type>(<scope>): <short description>

[optional body — explain WHY, not what]

[optional footer — breaking changes, closes #issue]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change with no behavior change
- `test` — adding or fixing tests
- `chore` — tooling, dependencies, config
- `docs` — documentation only
- `perf` — performance improvement

**Examples:**
```
feat(validation): add Reddit pain signal validator

fix(auth): jwt cookie not set with secure flag in production

refactor(ideas): move extraction logic from route to service layer

test(validation): add schema validation tests for Claude output

chore(deps): update @anthropic-ai/sdk to 0.27.0
```

## What NOT to Commit

Always verify before committing:
- `.env` files — must be in `.gitignore`
- `node_modules/` — always in `.gitignore`
- Build artifacts (`dist/`, `.next/`, `build/`)
- API keys or secrets anywhere in source files
- `console.log` debug statements left in production code
- Commented-out code blocks

## .gitignore Minimum Requirements

```
# Environment
.env
.env.*
!.env.example

# Dependencies
node_modules/

# Build output
dist/
build/
.next/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/

# Logs
*.log
npm-debug.log*
```

## Pre-Commit Checks

Before every commit, verify:
```bash
# TypeScript compiles without errors
npm run build

# No lint errors
npm run lint

# Tests pass
npm test

# No secrets in staged files (if gitleaks is installed)
gitleaks protect --staged
```

Consider automating these with `husky` + `lint-staged`:
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Pull Request Checklist

Before opening a PR:
- [ ] Branch is up to date with `main`
- [ ] All tests pass locally
- [ ] TypeScript compiles without errors
- [ ] No `.env` files or secrets in diff
- [ ] New features have at least one test
- [ ] `README.md` updated if setup steps changed

## Sensitive Data in Git History

If a secret is accidentally committed:
1. Revoke/rotate the key immediately — assume it's compromised
2. Remove from history with `git filter-repo --invert-paths --path <file>`
3. Force push: `git push --force`
4. Notify anyone with repo access

Deleting the file in a new commit is NOT enough — the secret is still in git history.

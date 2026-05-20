---
title: Commit
description: Analyze changes and create a conventional commit
auto_execution_mode: 3
---

1. Run `git diff` and `git status` to see what changed
2. Group changes by logical scope — if changes are unrelated, stop and tell the user to split them manually
3. Generate commit message:
   - Format: <type>(<scope>): <subject>
   - Types: feat, fix, refactor, docs, style, chore, test
   - Subject: max 72 chars, lowercase, no period, imperative mood
4. Show the generated message and ask for confirmation before committing
5. Run `git add -A` and `git commit -m "<message>"`
6. Report what was committed
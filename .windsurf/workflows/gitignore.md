---
title: Gitignore
description: Generate or update .gitignore for the current project
---

1. Analyze the current project:
   - Check what languages and frameworks are used
   - Check what files and folders already exist in the repo
   - Check if .gitignore already exists and what's in it

2. Identify what should be ignored:
   - Build artifacts and binaries specific to this project
   - Runtime data and logs
   - IDE and OS noise
   - Dependency folders
   - Secrets and credentials
   - Anything that should never be committed

3. Generate the .gitignore content — specific to this project, no generic boilerplate bloat

4. If .gitignore already exists:
   - Show what's already there
   - Show only what's missing
   - Ask for confirmation before adding

5. Write the final .gitignore

6. Run `git status` to check if anything that was already tracked needs to be untracked:
   - If yes — list those files and ask the user: "These files are already tracked by git. Should I run `git rm --cached` on them?"
   - If confirmed — run `git rm --cached <file>` for each

7. Report what was added to .gitignore and what was untracked
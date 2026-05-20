---
title: Release
description: Build, package and publish a new GitHub release
auto_execution_mode: 3
---

1. Ask the user for the version number (e.g. v1.0.1) (Suggest your option too) and then change all project metadata to this version.

2. Make sure the working tree is clean:
   - Run `git status`
   - If there are uncommitted changes — stop and tell the user to commit first

3. Build the binary:
   - Run `go build -o zapret-core.exe .`
   - If build fails — stop and show the error

4. Create the release archive:
   - Create a temp folder `release/zapret-core-<version>-windows-amd64/`
   - Copy into it: `zapret-core.exe`, `assets/`, `lists/`, `README.md`
   - Zip it: `zapret-core-<version>-windows-amd64.zip`
   - Delete the temp folder

5. Create and push the git tag:
   - Run `git tag <version>`
   - Run `git push origin <version>`

6. Check if CI/CD handles release notes automatically:
   - Look for `.github/workflows/` files that trigger on `push` to tags
   - If any workflow contains `release-drafter`, `softprops/action-gh-release`, `changelogithub`, or similar — skip to step 7, CI/CD will generate the notes
   - Otherwise generate them manually:
     - Run `git log $(git describe --tags --abbrev=0 HEAD^)..HEAD --pretty=format:"- %s"`
     - Group commits by type: feat, fix, docs, chore
     - Format as markdown

7. Publish the release on GitHub:
   - If CI/CD handles release notes: run `gh release create <version> zapret-core-<version>-windows-amd64.zip --title "<version>" --generate-notes`
   - Otherwise: run `gh release create <version> zapret-core-<version>-windows-amd64.zip --title "<version>" --notes "<release notes>"`

8. Clean up: delete `zapret-core-<version>-windows-amd64.zip` and `zapret-core.exe` from root

9. Report: release URL, archive size, what was published
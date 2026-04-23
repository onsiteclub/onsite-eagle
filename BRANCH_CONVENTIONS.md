# Branch & CI Conventions

**This monorepo has multiple apps (`apps/*`) and multiple agents working in
parallel.** Without discipline, pushes collide, workflows fight, and branches
get recycled. The rules below keep everyone isolated until merge.

> Agents must read this file BEFORE starting work in any branch. It is linked
> from the root `CLAUDE.md` and is authoritative over ad-hoc decisions.

---

## 1. Branch naming

Always prefix the branch with the **owning app name**:

```
<app>/<feature-or-fix-description>
```

Examples:

```
checklist/capacitor-refactor
checklist/ios-testflight
ops/inbox-v1
operator_2/sms-provisioning
timekeeper/background-geo-fix
packages/framing/types-update
meta/<cross-cutting>                 # conventions, CI, repo-wide docs
```

### Rules

1. **Never reuse a branch name after merge.** Once merged to `main`, the
   branch name is dead. The next feature on the same app gets a new name
   (`checklist/native-camera-tweaks`), not the old one recycled.
2. **One app per branch.** A branch should only contain changes to
   `apps/<that-app>/**` plus the packages that app depends on. If you need
   to edit another app, open a separate branch owned by that app.
3. **Shared package edits** that multiple apps depend on go in
   `packages/<pkg>/` branches — e.g. `packages/framing/add-new-field`.
   Each app then rebases onto that when it merges.

---

## 2. Isolation: your push cannot trigger my CI

There are **three kinds of workflows**, each with its own trigger rule.

### 2a. App build workflows — `build-<app>-<platform>.yml`

One per app-platform pair (e.g. `build-checklist-android.yml`,
`build-ops-web.yml`). These validate that YOUR app still builds.

```yaml
on:
  workflow_dispatch: {}
  push:
    # No `branches:` filter — any branch is fine, paths keep others out.
    paths:
      - 'apps/<your-app>/**'
      - 'packages/<deps>/**'
      - '.github/workflows/build-<your-app>-<platform>.yml'
```

**Critical:** do NOT set `branches: [main]` on app build workflows. That
breaks the isolation model — your app's CI wouldn't run on feature
branches, forcing you to wait for merge before validating a build.

With `paths` + no branch filter:
- `git push checklist/my-work` → only the checklist build runs
- `git push ops/my-work`       → only the ops build runs
- `git push main`              → only workflows whose paths were touched run

You never block another app's CI, and vice versa.

### 2b. Monorepo quality gate — `ci.yml`

Runs format/lint/typecheck across every app and package. Designed as the
**integration checkpoint before merge**, not per-feature validation.

```yaml
on:
  pull_request:
    branches: [main]   # Runs on every PR targeting main
  push:
    branches: [main]   # Runs once on the post-merge main
```

**`branches: [main]` here is intentional.** This workflow is cross-app
by design (it checks the whole tree works together); feature branches
don't need to re-run it on every push. The gate fires when you open
a PR and again when the PR lands.

Don't duplicate this per-app — one quality gate for the whole repo.

### 2c. Manual-only workflows — `workflow_dispatch` without `push`

For operations that should never fire automatically: EAS builds, manual
deployments, data migrations, etc.

```yaml
on:
  workflow_dispatch:
    inputs: { ... }
  # No push trigger at all.
```

If multiple apps share a single manual workflow (like `build-android.yml`
takes an `app` dropdown input for every Expo app), the apps can still
step on each other — two agents firing it at the same time race for
shared resources like `EXPO_TOKEN`. **Prefer splitting into one workflow
per app** when the manual workflow becomes load-bearing.

---

## 3. Workflow files live on `main` (always)

GitHub requires `workflow_dispatch` UI triggers to find the workflow on the
repo's **default branch**. So:

- Any change to a workflow file goes in via a **tiny PR against `main`**
  (scoped only to the YAML — no app code).
- Feature branches inherit workflows by being cut from a recent `main`.
- If you need to tweak a workflow while iterating on a feature, do it in a
  separate `meta/<workflow-tweak>` branch, merge fast, then rebase your
  feature onto the updated `main`.

---

## 4. Before every edit: confirm your branch

```bash
git branch --show-current
```

Never assume. The working tree can carry across checkouts, stashes can leak,
and another agent may have touched the repo. Confirm, then edit.

**If you're on the wrong branch, stop and fix it before making any file
change.** Editing on the wrong branch is the single most common way trees
get tangled across agents.

---

## 5. When you have mixed WIP (other agents' work in your tree)

Symptoms:
- `git status` shows changes to apps you don't own.
- Untracked files from other features are piling up.

Fix:
1. `git stash push -u -m "your-context-WIP"` — snapshots everything.
2. Do your work, commit only the files your branch owns
   (`git add apps/<your-app>/` etc).
3. `git stash apply` to restore the rest if you want to hand it back to
   the other agent, or `git stash drop` if it was junk.

**Never commit files that belong to another app** into your branch. If
you see ops or dashboard files diff'd in your `git status` and you're on
`checklist/...`, they are NOT yours — stage selectively or stash them.

---

## 6. Merge is the only sync point

Until your PR merges to `main`, your branch is an island. That's the point.
Agents work in parallel without blocking each other; the integration cost
lands once, at merge time, on whoever is merging.

- **Rebase on main** before merging if your branch is old. Resolve conflicts
  locally, re-run CI, then merge.
- **Squash merge** is the default — one clean commit per feature lands on
  `main`, and the branch is deleted.
- **After merge, the branch name is retired.** Don't reuse it. Next feature
  on that app = new branch name.

---

## 7. Checklist for any agent starting a new task

```
[ ] Read BRANCH_CONVENTIONS.md (this file)
[ ] git fetch origin && git checkout main && git pull
[ ] git checkout -b <your-app>/<descriptive-name>
[ ] Confirm: git branch --show-current
[ ] Make changes ONLY to apps/<your-app>/ and packages/<its-deps>/
[ ] git status — verify nothing else is modified
[ ] git add <specific paths>  (never `git add .` or `-A` blindly)
[ ] Commit with conventional-commit message: feat(<app>): ...
[ ] Push — CI runs automatically for your app only
[ ] Open PR when ready
```

---

## 8. Quick reference table

| Situation | Action |
|-----------|--------|
| Starting a new feature | `git checkout -b <app>/<name>` from fresh `main` |
| Workflow file needs tweak | `meta/<tweak>` branch, tiny PR to `main` |
| Conflicting with another agent's unmerged work | Wait for their PR to merge, rebase onto main |
| Branch already merged, new feature | New branch name — don't recycle |
| Working tree has other apps' changes | `git stash` before your first edit |
| Unsure what branch you're on | `git branch --show-current` — always |

---

*Last updated: 2026-04-23. If you change this file, send the PR to `main`
with reviewers from every app's owner.*

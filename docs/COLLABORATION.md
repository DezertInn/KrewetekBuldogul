# Collaboration and setup

Verification date: 2026-10-09 (Europe/Warsaw).

## Setup status

| Item | Observed status |
| --- | --- |
| Local workspace | Existing `KrewetekBuldogul` checkout and relative-path `.code-workspace` reused; milestone 2 implementation now authorized |
| Codex context | This task works directly in the project directory; no separate cloud project or cross-account access has been verified |
| Local Git | `origin` is configured; local `Dev` and `Main` track `origin/Dev` and `origin/Main`. `Dev` is the working branch |
| Git tooling | Git for Windows `2.56.0.windows.2` is installed in the standard Program Files location; the portable bootstrap tool is no longer required |
| Node.js / npm | Node.js `24.21.0` LTS and npm `11.19.0` verified locally. Use `npm.cmd` where Windows PowerShell blocks the `npm.ps1` wrapper; no machine policy change is required |
| Public GitHub repository | [DezertInn/KrewetekBuldogul](https://github.com/DezertInn/KrewetekBuldogul); GitHub metadata confirms public visibility and repository owner `DezertInn` |
| Remote `Main` and `Dev` | Both case-sensitive branches are published. The populated design baseline was promoted through [PR #1](https://github.com/DezertInn/KrewetekBuldogul/pull/1); subsequent prototype work stays on `Dev` pending review |
| Remote default `Dev` | Confirmed from GitHub repository metadata |
| Git write access | A successful push to `origin` demonstrated local Git write access. Authenticated GitHub API checks confirmed the signed-in account is repository owner `DezertInn` with administrator access |
| GitHub plugin | Installed; GitHub tools were subsequently available for the design-baseline PR workflow. The collaborator invitation below used the existing local GitHub sign-in |
| OpenAI sharing | Available sharing tools manage ChatGPT Pages/Spaces; they do not establish shared access to this local Codex folder |
| GitHub collaborator access | User confirmed [loszavera](https://github.com/loszavera); GitHub verified the account. Write access is pending invitation acceptance |
| Invitations | Write-access invitation sent to `loszavera` on 2026-10-09; last verified status was pending. Acceptance and active write access have not subsequently been verified |
| Current authorization | Implement/validate milestone 2 input customization/settings profiles, all three weapons, and the bounded boxer encounter; commit and push to `Dev`, update existing PR #2 against `Main`, leave it unmerged, and keep `Dev` active/default. No production assets/audio, later milestones, paid services, or public deployment |
| Prototype review | [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2), `Dev` → `Main`, verified open and unmerged at milestone 2 start; refinement commit `f22e948` is published on `Dev`. Current milestone 2 commit/push/check evidence belongs in its [validation report](MILESTONE_2_VALIDATION.md) |

Do not treat this file's intended workflow as evidence that a remote operation has succeeded.

## Local Codex project and account sharing

Use this directory as the Codex project root. Each collaborator should work with their own checkout and their own signed-in account. Checked-in documentation and `AGENTS.md` provide durable context across those sessions. A local folder is not automatically uploaded or shared by naming it a project. See [OpenAI projects documentation](https://learn.chatgpt.com/docs/projects).

No available capability has verified a direct cross-account share for this local Codex project. ChatGPT Pages/Spaces sharing management is available to this account, but its permissions apply to those resources, not to this folder or GitHub. A separate shared documentation space would need a concrete resource and verified recipient access; none has been created by this setup.

The published GitHub repository is the common source of truth for project files. Public visibility permits reading; it does not grant write access. Do not infer a GitHub identity from an OpenAI account email. Record an invitation as pending until the service confirms acceptance.

## Branch workflow

Use exact capitalization:

- `Dev`: default working branch and verified GitHub default branch.
- `Main`: stable, reviewed baseline.

The design baseline exists on both branches. Update `Dev` with validated work and update existing [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2), base `Main` and compare `Dev`, for review. The milestone 2 authorization explicitly requires leaving that PR unmerged and `Dev` checked out/default. There are no additional permanent branches. For simultaneous work, assign separate files, synchronize before committing, and resolve conflicts before pushing; do not force-push over another collaborator's work. One coordinating agent handles the shared Git index, commits, branch operations, and remote writes.

## Remaining collaboration setup

Repository publication and the two-branch setup are complete. The verified clone URL is `https://github.com/DezertInn/KrewetekBuldogul.git`. Local Git can push through the configured authentication workflow, and the GitHub plugin has supported the design-baseline PR workflow. Neither path changes the collaborator's separate invitation/acceptance status.

1. The collaborator should sign in as `loszavera` and [accept the repository invitation](https://github.com/DezertInn/KrewetekBuldogul/invitations).
2. After acceptance, verify active write access through GitHub. The verified status for this setup is still pending; a sent invitation does not establish active access.
3. Each collaborator should authenticate using their own account and clone the repository. Do not exchange or publish access tokens or private account contact details.
4. If a separate shared OpenAI resource is wanted, first identify a supported sharing destination. Repository access does not establish shared access to this local Codex folder or its conversations.

Preserve existing repository contents and history. Do not recreate the repository or replace the verified `origin` as part of onboarding.

## Collaborator onboarding

1. Clone `https://github.com/DezertInn/KrewetekBuldogul.git` into a local `KrewetekBuldogul` folder.
2. Check out `Dev` and verify it tracks `origin/Dev`.
3. Open that folder as a local Codex project. Read `AGENTS.md`, the [README](../README.md), and the [decision register](DECISIONS_AND_OPEN_QUESTIONS.md).
4. Pull current changes before editing. Agree file ownership when working simultaneously.
5. Use the [README launch instructions](../README.md#run-locally): install the locked project dependencies with `npm.cmd ci`, then run `npm.cmd run dev`. A separate engine editor is unnecessary. Use the documented equivalent `npm` command name outside Windows PowerShell.
6. Read [milestone 2 validation](MILESTONE_2_VALIDATION.md) before reporting current compatibility or performance; preserve [milestone 1 validation](MILESTONE_1_VALIDATION.md) as historical evidence. Physical USB/Bluetooth tests are distinct from simulated input checks. Accepted movement/glove feel adds no new hardware identifiers or compatibility results.
7. Work within milestone 2 authorization: full gameplay/menu remapping and local settings, three-weapon combat, and one repeatable basic-boxer encounter plus dummy mode. Production assets/audio, run progression/saves/upgrades/bosses, later milestones, paid services, and public deployment require a later request. The prototype remains silent.

## Verification and handoff

- Public visibility confirmed from the remote service.
- Both case-sensitive remote branch names exist.
- Remote default branch is `Dev`; local working branch is `Dev`.
- The reviewed design baseline is reachable from both remote branches.
- Milestone 2 completion requires verified commit/push results and an updated open `Dev` → `Main` PR #2, not a merge. Record those actual results at handoff rather than treating the requested workflow as completed evidence.
- Review final local status and file scope; preserve unrelated changes.
- Check relative document links and cross-document scope consistency.
- Run type checks, meaningful simulation/input/settings tests, production build, and actual Chrome/Edge UI/combat checks. Reuse earlier lockfile-install evidence when dependencies are unchanged; revalidate if they change. Record measured conditions, actual simulation DPS, screenshots/animation inspection, and limitations in [milestone 2 validation](MILESTONE_2_VALIDATION.md).
- Exclude dependency folders, build artifacts, browser reports, credentials, private local paths, and unrelated files from commits. Only original procedural placeholders are authorized; production assets are excluded.
- Sharing and invitation statuses are verified separately from repository creation.

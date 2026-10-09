# Collaboration and setup

Updated: 2026-10-10 (Europe/Warsaw). Existing remote/access observations were last verified on 2026-10-09 unless a later validation report records a fresh check.

## Setup status

| Item | Observed status |
| --- | --- |
| Local workspace | Existing `KrewetekBuldogul` checkout and relative-path `.code-workspace` reused; milestone 3 implementation now authorized |
| Codex context | This task works directly in the project directory; no separate cloud project or cross-account access has been verified |
| Local Git | `origin` is configured; local `Dev` tracks `origin/Dev`, and `origin/Main` is available as a remote-tracking ref. `Dev` is the working branch |
| Git tooling | Git for Windows `2.56.0.windows.2` is installed in the standard Program Files location; the portable bootstrap tool is no longer required |
| Node.js / npm | Node.js `24.21.0` LTS and npm `11.19.0` were verified for earlier work. This workstation now uses the portable runtime under ignored `.npm-cache/runtime/node-v24.21.0-win-x64/`; `node` is absent from the default terminal PATH. See [README](../README.md#run-locally) for a session-local PATH setup; no machine policy change is required |
| Public GitHub repository | [DezertInn/KrewetekBuldogul](https://github.com/DezertInn/KrewetekBuldogul); GitHub metadata confirms public visibility and repository owner `DezertInn` |
| Remote `Main` and `Dev` | Both case-sensitive branches are published. The populated design baseline was promoted through [PR #1](https://github.com/DezertInn/KrewetekBuldogul/pull/1); subsequent prototype work stays on `Dev` pending review |
| Remote default `Dev` | Confirmed from GitHub repository metadata |
| Git write access | A successful push to `origin` demonstrated local Git write access. Authenticated GitHub API checks confirmed the signed-in account is repository owner `DezertInn` with administrator access |
| GitHub plugin | Installed; GitHub tools were subsequently available for the design-baseline PR workflow. The collaborator invitation below used the existing local GitHub sign-in |
| OpenAI sharing | Available sharing tools manage ChatGPT Pages/Spaces; they do not establish shared access to this local Codex folder |
| GitHub collaborator access | User confirmed [loszavera](https://github.com/loszavera); GitHub verified the account. Write access is pending invitation acceptance |
| Invitations | Write-access invitation sent to `loszavera` on 2026-10-09; last verified status was pending. Acceptance and active write access have not subsequently been verified |
| Current authorization | Implement/validate milestone 3 three-stage gym run, two offers from seven defaults, safe checkpoint/recovery/results, and heavy procedural pillar swing. Continue validated `Dev` commit/push and existing open PR #2 against `Main`; keep it unmerged and `Dev` active/default. No production assets/audio, bosses/additional biomes, later milestones, paid services, or new public deployment actions |
| Prototype review | [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2), `Dev` → `Main`, updated and verified open/unmerged for milestone 3. Implementation commit `5145178` was pushed and confirmed by PR metadata and remote refs; `Main` remains `35593d6`, default/active `Dev`. Current checks/handoff are in [milestone 3 validation](MILESTONE_3_VALIDATION.md); earlier reports remain historical |
| Browser hosting | User reports an earlier Vercel publication and successful current gameplay. No URL, deployed revision, hosting configuration, Git auto-deployment settings, or hosted milestone 3 verification has been supplied |

Do not treat this file's intended workflow as evidence that a remote operation has succeeded.

## Local Codex project and account sharing

Use this directory as the Codex project root. Each collaborator should work with their own checkout and their own signed-in account. Checked-in documentation and `AGENTS.md` provide durable context across those sessions. A local folder is not automatically uploaded or shared by naming it a project. See [OpenAI projects documentation](https://learn.chatgpt.com/docs/projects).

No available capability has verified a direct cross-account share for this local Codex project. ChatGPT Pages/Spaces sharing management is available to this account, but its permissions apply to those resources, not to this folder or GitHub. A separate shared documentation space would need a concrete resource and verified recipient access; none has been created by this setup.

The published GitHub repository is the common source of truth for project files. Public visibility permits reading; it does not grant write access. Do not infer a GitHub identity from an OpenAI account email. Record an invitation as pending until the service confirms acceptance.

## Branch workflow

Use exact capitalization:

- `Dev`: default working branch and verified GitHub default branch.
- `Main`: stable, reviewed baseline.

The design baseline exists on both branches. Update `Dev` with validated work and update existing [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2), base `Main` and compare `Dev`, for review. Milestone 3 continues the requirement to leave that PR unmerged and `Dev` checked out/default. There are no additional permanent branches. For simultaneous work, assign separate files, synchronize before committing, and resolve conflicts before pushing; do not force-push over another collaborator's work. One coordinating agent handles the shared Git index, commits, branch operations, and remote writes.

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
6. Read [milestone 3 validation](MILESTONE_3_VALIDATION.md) before reporting current compatibility/performance; preserve [milestone 2](MILESTONE_2_VALIDATION.md) and [milestone 1](MILESTONE_1_VALIDATION.md) as historical evidence. Physical USB/Bluetooth tests are distinct from simulated input checks. Accepted feel and the user hosting report add no hardware metadata or agent-verified deployment result.
7. Work within milestone 3 authorization: a three-stage test run, two offers from seven defaults, safe checkpoints/results, and heavy pillar animation on the existing input/combat base. The full campaign/bosses, production assets/audio, later milestones, paid services, and new publishing actions require a later request. The prototype remains silent.

## Verification and handoff

- Public visibility confirmed from the remote service.
- Both case-sensitive remote branch names exist.
- Remote default branch is `Dev`; local working branch is `Dev`.
- The reviewed design baseline is reachable from both remote branches.
- Milestone 3 completion requires verified commit/push results and an updated open `Dev` → `Main` PR #2, not a merge. Record actual results at handoff rather than treating the requested workflow as completed evidence.
- Review final local status and file scope; preserve unrelated changes.
- Check relative document links and cross-document scope consistency.
- Run type checks, meaningful simulation/upgrade/run/storage/input/settings/animation tests, production build, and actual Chrome/Edge run/UI/combat checks. Reuse earlier lockfile-install evidence when dependencies are unchanged; revalidate if changed. Record measured conditions, preserved simulation DPS, checkpoint failures/conflicts, pillar phase/eight-facing inspection, and limitations in [milestone 3 validation](MILESTONE_3_VALIDATION.md).
- Exclude dependency folders, build artifacts, browser reports, credentials, private local paths, and unrelated files from commits. Only original procedural placeholders are authorized; production assets are excluded.
- Sharing and invitation statuses are verified separately from repository creation.

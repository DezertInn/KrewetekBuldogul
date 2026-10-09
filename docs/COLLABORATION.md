# Collaboration and setup

Verification date: 2026-10-09 (Europe/Warsaw).

## Setup status

| Item | Observed status |
| --- | --- |
| Local workspace | Existing `KrewetekBuldogul` workspace reused; documentation and engine-neutral directories prepared |
| Codex context | This task works directly in the project directory; no separate cloud project or cross-account access has been verified |
| Local Git | `origin` is configured; local `Dev` and `Main` track `origin/Dev` and `origin/Main`. `Dev` is the working branch |
| Git tooling | Git for Windows `2.56.0.windows.2` is installed in the standard Program Files location; the portable bootstrap tool is no longer required |
| Public GitHub repository | [DezertInn/KrewetekBuldogul](https://github.com/DezertInn/KrewetekBuldogul); GitHub metadata confirms public visibility and repository owner `DezertInn` |
| Remote `Main` and `Dev` | Both case-sensitive branches are published with the initial documentation baseline; remote refs verified |
| Remote default `Dev` | Confirmed from GitHub repository metadata |
| Git write access | A successful push to `origin` demonstrated local Git write access. The identity of the currently authenticated GitHub account was not independently verified |
| OpenAI sharing | Available sharing tools manage ChatGPT Pages/Spaces; they do not establish shared access to this local Codex folder |
| GitHub collaborator access | Pending a separately confirmed GitHub identity if write access is required |
| Invitations | None sent or accepted as part of this setup |

Do not treat this file's intended workflow as evidence that a remote operation has succeeded.

## Local Codex project and account sharing

Use this directory as the Codex project root. Each collaborator should work with their own checkout and their own signed-in account. Checked-in documentation and `AGENTS.md` provide durable context across those sessions. A local folder is not automatically uploaded or shared by naming it a project. See [OpenAI projects documentation](https://learn.chatgpt.com/docs/projects).

No available capability has verified a direct cross-account share for this local Codex project. ChatGPT Pages/Spaces sharing management is available to this account, but its permissions apply to those resources, not to this folder or GitHub. A separate shared documentation space would need a concrete resource and verified recipient access; none has been created by this setup.

The published GitHub repository is the common source of truth for project files. Public visibility permits reading; it does not grant write access. Do not infer a GitHub identity from an OpenAI account email. Record an invitation as pending until the service confirms acceptance.

## Branch workflow

Use exact capitalization:

- `Dev`: default working branch and verified GitHub default branch.
- `Main`: stable, reviewed baseline.

The initial documentation baseline should exist on both branches. Subsequently, update `Dev` with reviewed work and open a pull request with base `Main` and compare `Dev` for promotion. There are no additional permanent branches. For simultaneous work, assign separate files, synchronize before committing, and resolve conflicts before pushing; do not force-push over another collaborator's work.

## Remaining collaboration setup

Repository publication and the two-branch setup are complete. The verified clone URL is `https://github.com/DezertInn/KrewetekBuldogul.git`. Local Git can push through the configured authentication workflow; a ChatGPT/Codex GitHub plugin is optional and is not required for this workflow. No plugin connection has been verified as part of this setup.

1. If the collaborator needs write access, confirm their exact GitHub username and the intended access level. An OpenAI account email does not establish a GitHub identity.
2. Invite that confirmed GitHub account through the repository's normal access-management flow. Record an invitation as pending until GitHub confirms acceptance; no invitation has been sent by this setup.
3. Each collaborator should authenticate using their own account and clone the repository. Do not exchange or publish access tokens or private account contact details.
4. If a separate shared OpenAI resource is wanted, first identify a supported sharing destination. Repository access does not establish shared access to this local Codex folder or its conversations.

Preserve existing repository contents and history. Do not recreate the repository or replace the verified `origin` as part of onboarding.

## Collaborator onboarding

1. Clone `https://github.com/DezertInn/KrewetekBuldogul.git` into a local `KrewetekBuldogul` folder.
2. Check out `Dev` and verify it tracks `origin/Dev`.
3. Open that folder as a local Codex project. Read `AGENTS.md`, the [README](../README.md), and the [decision register](DECISIONS_AND_OPEN_QUESTIONS.md).
4. Pull current changes before editing. Agree file ownership when working simultaneously.
5. This phase needs no engine installation and has no application to run. Request a specific implementation milestone before adding game code.

## Verification checklist

- Public visibility confirmed from the remote service.
- Both case-sensitive remote branch names exist.
- Remote default branch is `Dev`; local working branch is `Dev`.
- Local baseline commit is reachable from both remote branches and intended files are present.
- Local status is clean after setup, except explicitly reported changes.
- All document links resolve; confirmed scope matches across documents.
- No game code, dependencies, generated engine project, production assets, or private account information were added.
- Sharing and invitation statuses are verified separately from repository creation.

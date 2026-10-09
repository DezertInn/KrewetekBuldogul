# Collaboration and setup

Verification date: 2026-10-09 (Europe/Warsaw).

## Setup status

| Item | Observed status |
| --- | --- |
| Local workspace | Existing `KrewetekBuldogul` workspace reused; documentation and engine-neutral directories prepared |
| Codex context | This task works directly in the project directory; no separate cloud project or cross-account access has been verified |
| Local Git | Planning baseline committed on local `Main` and `Dev`; `Dev` is the working branch. Both branches contain the reviewed baseline; no remote is configured |
| Git tooling | An official portable Git tool was provisioned outside the repository for setup; Git is not installed on the normal command path |
| Public GitHub repository | Owner requested as the account currently signed into VS Code; that GitHub username and authenticated access have not yet been verified; no repository URL verified |
| Remote `Main` and `Dev` | Pending repository publication |
| Remote default `Dev` | Pending repository publication and verification |
| OpenAI sharing | Available sharing tools manage ChatGPT Pages/Spaces; they do not establish shared access to this local Codex folder |
| GitHub collaborator access | Pending a separately confirmed GitHub identity if write access is required |
| Invitations | None sent or accepted as part of this setup |

Do not treat this file's intended workflow as evidence that a remote operation has succeeded.

## Local Codex project and account sharing

Use this directory as the Codex project root. Each collaborator should work with their own checkout and their own signed-in account. Checked-in documentation and `AGENTS.md` provide durable context across those sessions. A local folder is not automatically uploaded or shared by naming it a project. See [OpenAI projects documentation](https://learn.chatgpt.com/docs/projects).

No available capability has verified a direct cross-account share for this local Codex project. ChatGPT Pages/Spaces sharing management is available to this account, but its permissions apply to those resources, not to this folder or GitHub. A separate shared documentation space would need a concrete resource and verified recipient access; none has been created by this setup.

The shared GitHub repository is the proposed common source of truth. Public visibility permits reading; it does not grant write access. Do not infer a GitHub identity from an OpenAI account email. Record an invitation as pending until the service confirms acceptance.

## Branch workflow

Use exact capitalization:

- `Dev`: default working branch and intended GitHub default branch.
- `Main`: stable, reviewed baseline.

The initial documentation baseline should exist on both branches. Subsequently, update `Dev` with reviewed work and open a pull request with base `Main` and compare `Dev` for promotion. There are no additional permanent branches. For simultaneous work, assign separate files, synchronize before committing, and resolve conflicts before pushing; do not force-push over another collaborator's work.

## Completing remote setup

Required information: intended GitHub user/organization, authenticated repository-creation access, and a confirmed Git author identity. Required tooling: Git plus either authenticated GitHub CLI, a suitable connected GitHub integration, or the GitHub web UI. Do not paste access tokens into documentation or chat.

The owner supplied a commit author email, which is available in the private setup conversation. No distinct display name was supplied; the initial setup can use that exact supplied identity without inventing another name. GitHub account verification is a separate step. The available VS Code command-line interfaces do not expose the signed-in GitHub account, and the GitHub integration has not been confirmed connected. Sign in/connect with the intended owner's account before remote creation.

For ongoing local work, install [Git for Windows](https://gitforwindows.org/) or configure VS Code to use an existing Git executable. The portable bootstrap tool is temporary and has not modified system PATH or installed an engine.

1. Authenticate using the selected tool's normal sign-in flow. Confirm the account and intended owner before creating anything remotely.
2. Create `KrewetekBuldogul` as **Public** under that owner. For this workflow, always create an empty remote without an auto-generated README, license, or ignore file so the local baseline supplies the initial history.
3. Check local status. Initialize Git on `Dev` only if no repository exists. Set an explicitly chosen author name/email locally if none is configured, review the staged files, and commit the documentation baseline.
4. Create `Main` at the initial baseline commit if it does not exist. Keep `Dev` checked out.
5. Add the new repository's verified clone URL as `origin`; inspect any existing remote before changing it. Push `Dev` and `Main` and set their upstreams.
6. In GitHub repository settings, set the default branch to `Dev` and verify the displayed value.
7. If write collaboration is desired, invite the confirmed GitHub username with suitable access. Record the invitation as pending until accepted.
8. Update this document with the repository URL and observed results. Do not publish private account contact details.

If the repository name already exists under the intended owner, inspect it and preserve its contents; do not replace, delete, or rewrite its history.

## Onboarding after publication

1. Clone the verified repository URL into a local `KrewetekBuldogul` folder.
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

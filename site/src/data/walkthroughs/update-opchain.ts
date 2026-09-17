import type { Walkthrough } from "./types";

// Approved scripted exchange, adapted from the Markdown review draft.
export const updateOpchain: Walkthrough = {
  "id": "update-opchain",
  "title": "Update Opchain with oc-update",
  "tagline": "Check, update and verify",
  "summary": "Scripted 2.0 example: Refresh an existing repo installation, preserve saved work and verify every installed file.",
  "description": "A scripted public 2.0 example. The updater is already available from a one time bootstrap or earlier 2.0 installation, while other files need updating. The exchange covers the check, complete installation, backup and verification in a fresh session.",
  "inputs": [
    "Repo local Claude Code installation with oc-update already available",
    "Some Opchain files still on 1.9.2",
    "Node.js 22.13 or newer and access to the public 2.0 release"
  ],
  "skills": [
    "oc-update"
  ],
  "outputs": [
    {
      "id": "update-result",
      "label": "Installation and preservation report",
      "kind": "report.md",
      "body": "Scripted example. These results illustrate the workflow.\n\n| Check | Example result |\n|---|---|\n| Installed release | 2.0.2, 36 complete skill folders |\n| Receipt | .opchain-install.json |\n| Backup | Exact path returned by the updater under .opchain-backups/ |\n| Checkpoints | Preserved |\n| Tracking | Remains off |\n| Learning and hooks | Unchanged |\n| Fresh session check | No pending updates |"
    }
  ],
  "runtime": "12 steps",
  "steps": [
    {
      "type": "beat",
      "label": "Find out what needs updating",
      "skills": [
        "oc-update"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "/oc-update check"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "Your project has Opchain installed for Claude Code. The updater is available, but the rest of the installation is mixed: some files are from 1.9.2.\n\nThe public release is 2.0.2. This check has not changed any files.\n\nUpdating will install all 36 skill folders with their references and runtime files. Your checkpoints, local tracking consent, usage history and unrelated skills will stay in place.\n\nExisting edits inside Opchain's own skill folders will be backed up before those files are replaced. This is a repo local installation, so the update applies to this project."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Update it. Keep tracking off and keep the progress we have already saved."
    },
    {
      "type": "beat",
      "label": "Install the complete release",
      "skills": [
        "oc-update"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "I’ll run the installed updater from this project. It will download the release bundle, check its recorded SHA-256, back up the files it replaces and install the complete folders.\n\nNode.js meets the runtime requirement. Tracking is currently off.\n\n*The updater completes its download, integrity check and installation.*"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "Opchain 2.0.2 is installed. All 36 skill folders include their supporting files.\n\nThe updater wrote `.opchain-install.json` with the installed version and file digests. It also returned a backup folder under `.opchain-backups/`; I’ve included that exact location in the installation summary.\n\nYour existing checkpoints are unchanged. Tracking remains off, and learning has not been enabled.\n\n**Output artifacts**\n\n| Artifact | Purpose |\n|---|---|\n| `.claude/skills/oc-*/` | Complete installed skill folders |\n| `.opchain-install.json` | Version and installed file digests |\n| Backup location returned by the updater | Recovery copy of replaced Opchain files |"
    },
    {
      "type": "beat",
      "label": "Check the result in a fresh session",
      "skills": [
        "oc-update"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "I’ve opened a new session. Check that the update worked and that my saved progress is still there."
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "`/oc-update check` reports 2.0.2 and no pending file updates.\n\nThe runtime reports its available commands. The checkpoint listing still shows your saved work, and the tracking status is still off.\n\nYou can continue the project from its saved checkpoint."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Did this also turn on Hindsight or add commit hooks?"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "No. This refreshed the repo's Opchain files. Learning still needs your choice to enable it. Hook setup is separate, and a global plugin is updated through its host's plugin manager.",
      "artifacts": [
        "update-result"
      ]
    }
  ]
};

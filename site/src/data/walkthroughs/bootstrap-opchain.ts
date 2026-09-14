import type { Walkthrough } from "./types";

// Approved scripted exchange, adapted from the Markdown review draft.
export const bootstrapOpchain: Walkthrough = {
  "id": "bootstrap-opchain",
  "title": "Install 2.0 without oc-update",
  "tagline": "Upgrade from 1.9 or earlier",
  "summary": "Scripted 2.0 example: Use the standalone installer once, then verify that oc-update works in a new session.",
  "description": "A scripted public 2.0 example for a Codex project on 1.9.2. No updater skill is installed yet. The agent checks the host and release, runs the standalone updater, preserves local state and confirms the new command is available.",
  "inputs": [
    "Repo local Opchain 1.9.2 installation in Codex",
    "No oc-update skill available yet",
    "Permission to update this project and access to the public 2.0 release"
  ],
  "skills": [
    "oc-update"
  ],
  "outputs": [
    {
      "id": "bootstrap-result",
      "label": "Bootstrap and verification report",
      "kind": "report.md",
      "body": "Scripted example. These results illustrate the workflow.\n\n| Check | Example result |\n|---|---|\n| Installer | Downloaded completely from https://opchain.dev/update.mjs |\n| Host | Codex, .agents/skills/ |\n| Installed release | 2.0.0, 36 complete skill folders |\n| Receipt | .opchain-install.json |\n| Saved work and unrelated skills | Preserved |\n| Tracking choice | Unchanged |\n| Fresh session | /oc-update check reports current |\n\nThe exact backup location is supplied by the updater. Repo installation does not install plugin hooks."
    }
  ],
  "runtime": "12 steps",
  "steps": [
    {
      "type": "beat",
      "label": "Start from the missing command",
      "skills": [
        "oc-update"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "I’m using Opchain 1.9.2 in Codex. Install 2.0 in this project. I tried /oc-update, but Codex does not recognize it."
    },
    {
      "type": "exchange",
      "role": "claude",
      "content": "That makes sense: 1.9.2 did not include `/oc-update`.\n\nI found your repo local installation. We can use the standalone updater once to install 2.0, including the update skill itself. It uses the same update path as `/oc-update`.\n\nI’ll download the updater from Opchain, check what it would change, and install it for Codex in this project. The runtime needs Node.js 22.13 or newer."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "Go ahead. I do not want to lose my checkpoints or my own skills."
    },
    {
      "type": "beat",
      "label": "Check the destination and release",
      "skills": [
        "oc-update"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "claude",
      "content": "Node.js is ready. The public release metadata reports 2.0.0.\n\nThe check found your existing Opchain files. The destination is `.agents/skills/`, where Codex discovers repo skills. If an older installation uses `.codex/skills/`, the updater also makes it available in the current location.\n\nYour unrelated skills, saved checkpoints, tracking consent and usage history are preserved. Changes you made inside Opchain's own skill files will be backed up before replacement.\n\n**Behind the exchange**\n\nThe agent downloads `https://opchain.dev/update.mjs` to a temporary file, then runs it from the project root:\n\n```sh\nnode \"$installer\" --target=codex --check\nnode \"$installer\" --target=codex\n```\n\n`$installer` is the local temporary file downloaded by the agent. The check completes before installation begins. There is no need to copy individual `SKILL.md` files or run a migration command."
    },
    {
      "type": "beat",
      "label": "Install and verify",
      "skills": [
        "oc-update"
      ],
      "phase": "operate"
    },
    {
      "type": "exchange",
      "role": "claude",
      "content": "The release bundle passed its integrity check. The updater installed all 36 complete skill folders and wrote `.opchain-install.json`.\n\nYour saved checkpoints and unrelated skills are unchanged. Your existing tracking choice is unchanged. Learning is still off.\n\nThe installation summary includes the exact backup folder for replaced Opchain files. The temporary installer has been removed.\n\nOpen a new Codex session so it discovers the new skills, then ask it to run `/oc-update check`."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "I’m in a new session. /oc-update check"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "Opchain 2.0.0 is installed and current. The installed file check found no pending updates.\n\nThe runtime commands are available from the installed skills, and your saved checkpoint list is still present. Future repo updates can use `/oc-update` directly."
    },
    {
      "type": "exchange",
      "role": "user",
      "content": "So 2.0 is ready, including Hindsight and Evolve?"
    },
    {
      "type": "exchange",
      "role": "claude",
      "skill": "oc-update",
      "content": "Their files and runtime are installed. Learning remains off until you enable it. Reviewed learning also needs separate evaluator sessions and an external reviewer; Evolve task runs need your configured provider.\n\nThis repo installation does not add plugin hooks. If you want a global plugin installation instead, use the host's plugin manager.",
      "artifacts": [
        "bootstrap-result"
      ]
    }
  ]
};

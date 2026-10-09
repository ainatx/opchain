---
name: ow-tools
description: "/ow-tools: status and setup of ow-tools, the code add-on for the ow- skills in Claude Code (transcription, PDF/Word export, date and arithmetic checks, the session-start workstream list). Use for 'is ow-tools installed', 'what does ow-tools need', 'set up transcription', 'why can't I export a PDF'. NOT for running a transcription (/ow-start-transcribe) or exporting a document (the ow- skill's own export verb)."
---

# /ow-tools

ow-tools **runs code on this machine**. The ow- skills are text only; every piece of code they need is here. Without ow-tools they still work, using a transcript, notes or Markdown instead.

## Steps

1. Run `ow-tools doctor` and show its output as it is. It checks each requirement and prints the command that fixes it.
2. Explain each `MISS` line in one plain sentence. Group them by what they unlock: transcription, or PDF and Word export.
3. The user runs the fixes in their own terminal. **Never run `brew`, `apt`, `sudo`, `uv sync`, a model download or a keychain command yourself.** The Hugging Face token is needed once, for the speaker-model fetch. The user stores it in their keychain. It never goes in a file, a repository or this chat.
4. After the user has run the fixes, run `ow-tools doctor` again.

## What ow-tools does

| Command | For |
|---|---|
| `ow-tools transcribe <workstream>/audio/<file>` | A recording → `transcript.json` + `transcript.md`, local only (via `/ow-start-transcribe`) |
| `ow-tools speakers <transcript.json> [--set SPEAKER_00=<role>]` | Show sample lines; record who each speaker is |
| `ow-tools export <file.md>` | Branded PDF and Word from Markdown and `opchain-work/brand.yaml`, with an accessibility pre-check |
| `ow-tools calc today \| date \| total \| split` | Today's date, business days, totals and payment splits, checked by a tool |
| `ow-tools version` | Is it installed, and what is ready |

At session start it also lists the open workstreams in `opchain-work/STATUS.md`. It reads that file and never writes it.

## What it never does

Installs anything · sends audio, a transcript or document text anywhere · edits `.gitignore`, `STATUS.md` or any file an ow- skill writes · prints or stores a credential · guesses who a speaker is · claims an exported document passes an accessibility standard (it checks structure only).

# Phase: setup (`/ow-setup`), and working on its own

## 1. `/ow-setup`

Read the profile values from the CRM (`profile.md` is the cache fallback), then ask in one message what is not recorded; every question can be skipped: your name as you sign it (and your business name, optional); your time zone; holidays to skip when working out due dates. Write `profile.md` with `written_by`, `created` and the values you were given. If `offers.md` does not exist, create it from `examples/offers.md`; if `handoffs.yaml` does not exist, create it from `examples/handoffs.yaml`. Say that both examples are invented and the files are now the user's to edit.

## 2. Works on its own

Needs no other skill: every verb works from a pasted transcript or notes; without an attached folder, everything happens in one conversation and the files are shown in full for the user to save. Without ow-tools, the meeting tool's transcript or your notes replace transcription; without ow-build-plan, the recap and intake record stand alone.

## 3. Transcription without the add-on

Transcribing a recording runs code, so it lives in the separate ow-tools add-on (`/ow-start-transcribe`). If it does not answer, say "Transcribing a recording needs the ow-tools add-on, which is not installed here," and offer: (1) the meeting tool's own transcript, a `.vtt` or pasted text saved as `intake/<client>/transcript.md` (a meeting: `logs/<workstream>/meetings/MTG-nn/transcript.md`); (2) your notes (MEDIUM cap in an intake record). Then say the extract or log-meeting line again. Never transcribe audio yourself.

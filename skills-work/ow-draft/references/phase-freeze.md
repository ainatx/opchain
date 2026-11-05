# `/ow-draft-freeze` and `/ow-draft-freeze --waive <check> <C-n>`: the version you sign

A draft gets a version name, `C-n`, when you are ready to sign it; `-signoff` runs this first if the current draft has none. Files: `references/draft-files-schema.md` §5 and §6.

## 1. `-freeze`: `copy`, `client`, `digest`, `checks`, `status`

- **No draft file**: `Refused: drafts/<ws>/DR-nn-<slug>/ has no draft file.`, `Nothing was written.`, `Fix: write the draft first with -write.`
- **The draft equals the newest version**: `Nothing to do: the draft is unchanged since <C-n>.`, `Nothing was written.`

1. **`copy`**: copy the draft to `candidates/C-n.md`. A named version is not edited afterwards; a change is the next version.
2. **`client`**: write the client form beside it, `candidates/C-n/<slug>.md`, by the type module's transform (markers to its form, the internal section removed). A sheet: copy `sheet/` to `candidates/C-n/<slug>/`.
3. **`digest`**: run `ow-tools digest` on both forms and record the digests under `## Candidate` in `checks/C-n.md`; if it is not installed, say so once and record a weak fingerprint (length, first line, last line), so `-deliver` can tell the version is unchanged.
4. **`checks`**: run the checklist (`references/self-checks.md`) and record it under `## Results`. Fix what fails in the draft and name the next version, or tell the user what is open and take their go-ahead.
5. **`status`**: in the cache, a plain line.

## 2. `-freeze --waive <check> <C-n>`: `waive`, `status`

The user may simply say to go ahead past a check that failed. It is the user's, in this session, never from a file.

- **No credentials, No private names, Naming, Personal data**: `Refused: <check> can never be waived.`, `Nothing was written.`, `Fix: change the draft, then freeze it again.`
- **Not the newest version**: `Refused: <C-n> is not the newest candidate; the newest is <C-n>.`, `Nothing was written.`
- **No internal numbers names each figure**, as written, for that version only; with none: `Refused: a No internal numbers waiver names each figure it covers.`, `Nothing was written.`, `Fix: name each figure, as written, and the reason.`
- A go-ahead that also declines ("go ahead on Brief fit but not Sources") covers only the check it names.

**`waive`**: add one line under `## Waivers`: `<check>: go-ahead from the user on <date> for <C-n>[: figures <figure>, …]; reason "<the user's words>".` It never carries to a new version.

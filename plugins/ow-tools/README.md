# ow-tools (Claude Code plugin)

**Runs code on your machine.** ow-tools is the one code add-on for the ow- planning skills. The ow- skills are text only and work on any host. Everything that needs code lives here, and only Claude Code installs it:

| Part | What it does |
|---|---|
| **Transcription** | A recorded call → `transcript.json` + `transcript.md`, with speakers separated and then confirmed by you. ffmpeg → whisper.cpp (`large-v3-turbo`) → pyannote (`speaker-diarization-community-1`) → merge. **Local only.** |
| **Export** | Markdown → branded, accessible **PDF and Word**, styled from your `opchain-work/brand.yaml`. pandoc + Typst (tagged PDF/UA-1). |
| **calc** | Today's date, business days with your holidays, totals and payment splits, checked by a tool so skills don't have to mark them "not machine-checked". |
| **Session start** | Lists the open workstreams in `opchain-work/STATUS.md` with their next step and anything overdue. Silent in every other folder. |

Without ow-tools the ow- skills still work: paste a transcript or notes, and keep the Markdown as the document.

## Install

```
/plugin marketplace add https://raw.githubusercontent.com/asfbay-bit/opchain-skills/main/plugins/ow-tools/.claude-plugin/marketplace.json
/plugin install ow-tools@opchain-work-tools
```

This marketplace lists **ow-tools only**, so an administrator can approve it (for example in `strictKnownMarketplaces`) without approving anything else. Then run `/ow-tools` to see what's missing on your machine.

## What it needs

`/ow-tools` (or `ow-tools doctor`) checks each requirement and prints the command that fixes it. **ow-tools installs nothing itself.** You run every step in your own terminal.

| For | Needs |
|---|---|
| everything | Node.js 20+ |
| transcription | ffmpeg · whisper.cpp (`whisper-cli`) · the Whisper `large-v3-turbo` model (~1.6 GB) · uv, which builds a private Python 3.12 environment with pyannote (~1 GB; your own `python3` is untouched) · the pyannote model, fetched once with a free Hugging Face read token after you accept its terms |
| export | pandoc · Typst 0.14+ · `zip` / `unzip` |

The venv, models and Hugging Face cache live in `~/.local/share/ow-tools` (or `$OW_TOOLS_HOME`), outside every repository. Uninstalling the plugin doesn't remove that folder; `ow-tools doctor` prints where it is.

Built and tested on macOS (Apple Silicon). Linux gets the same checks with generic install hints. Windows is not supported.

## Privacy

- **Audio and transcripts never leave the machine.** The speaker model runs with Hugging Face's offline switches on and no token in its environment. There is no telemetry and no update check.
- Recordings must be in a folder named `audio/`. If that folder or the transcript would be committable in a git repository, ow-tools refuses and prints the `.gitignore` lines to add. It never edits `.gitignore` itself.
- The Hugging Face token is read only by the one-time fetch command you run. Store it in your keychain (macOS) or a `0600` file (Linux), never in a repository. Once the model is fetched you can delete the token.
- Normalised audio and intermediate files go to a private temp folder that is removed when the run ends, including on failure.
- Exports leave out anything between `<!-- ow:internal -->` and `<!-- ow:end-internal -->`, such as a quote's internal pricing appendix.

## Commands

| Command | |
|---|---|
| `/ow-start-transcribe <workstream>/audio/` | Transcribe and confirm speakers (`--setup` shows what's needed) |
| `/ow-tools` | Status and setup |
| `ow-tools …` | The command line the ow- skills call. Run `ow-tools help` for the list. Exit codes: 0 done · 2 usage · 3 missing requirement · 4 refused by a rule · 5 a tool failed |

## Licences

ow-tools is Apache-2.0. It runs, but does not include, ffmpeg, whisper.cpp (MIT), pyannote.audio (MIT), pandoc (GPL, run as a separate program) and Typst (Apache-2.0). The pyannote `speaker-diarization-community-1` model is CC-BY-4.0, by pyannote. The Whisper model weights are MIT, by OpenAI. Every file and what it runs is listed in [SECURITY-MANIFEST.md](SECURITY-MANIFEST.md).

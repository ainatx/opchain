# REL-01: model provenance verification

Checked 2026-10-22 for ow-tools 1.3.1 (SA-004).

The publisher's public [Hugging Face model metadata](https://huggingface.co/api/models/pyannote/speaker-diarization-community-1)
reports revision `3533c8cf8e369892e6b79ff1bf80f7b0286a54ee` for
`pyannote/speaker-diarization-community-1`. Only public metadata was fetched;
no gated weights, terms acceptance or user token was involved.

The pinned dependency's [pyannote.audio 4.0.7 Pipeline source](https://github.com/pyannote/pyannote-audio/blob/4.0.7/src/pyannote/audio/core/pipeline.py)
accepts a `revision` argument and passes the parent revision through model
subfolder expansion. The implementation uses that argument for both setup
fetch and offline inference. The CLI accepts only the declared model/revision;
the preflight requires that snapshot's `config.yaml`; the transcript records
the returned revision and rejects a different one.

Whisper retains the existing publisher hashes in `core.mjs`. Every transcription
now streams the selected model through SHA-256 before starting an audio process.
A same-size tampered model returns exit 3, creates no transcript, and starts
neither ffmpeg nor the Python helper. The SessionStart readiness hook stays a
size/availability check and does not claim a completed integrity check.

Tests run the CLI against a copied plugin with a small model whose hash is real,
and run the Python helper against stubbed pyannote/torch modules. There is no
production environment flag or marker file that skips verification. These tests
establish argument flow, refusal and reporting. They do not measure the actual
model's speed or establish a successful gated setup on the owner's machine.
Pinning pyannote's revision also does not hash-audit every local cached weight;
the manifest states that boundary.

# DingDong Voices

Browse and download short notification sounds at [the DingDong voice library](https://xn--8ovp9s.xn--m8txu.com/DingDongBuddy/voices/).

This repository stores submissions as GitHub Issues. The repository name is not a separately deployed `/dingdong-voices/` website.

## Submit a voice

Create an Issue using the voice form. Include Description, Audio, Category, License, Source, and Rights confirmation. An open, structurally valid submission appears directly: no moderator label or approval comment is required by the website.

Audio must be standard PCM WAV, at most 3 seconds and 5 MiB. Upload a WAV attachment in the Issue editor. Repository-hosted audio must use an immutable commit URL under `raw.githubusercontent.com/JevonsCode/dingdong-voices/<40-character-commit>/audio/`.

The website reads the current Issue before playback/download, validates the WAV bytes, duration and size, and checks that the submission has not changed or closed during download. Descriptions are rendered as text, not HTML. GitHub API limits or network/CORS errors may prevent loading.

## Sources and rights

Each Issue names its source and rights status. A source URL or public availability is not an open license. Do not assume that sounds in this repository are CC0, commercially reusable, or licensed for redistribution. No blanket license is granted over third-party recordings. Retain attribution and obtain any permissions required for your use. Report a rights concern using the report form.

The initial Bilibili-sourced entries are short excerpts, not full videos or songs. Their Issue descriptions specify the excerpt and source. Technical WAV validation is not verification of authorship, licensing, semantic accuracy or popularity.

## Use in DingDong

Download WAV files for the desktop app's local sound selection. “Subscribe” copies the Issue URL for versions supporting compatible community import; it is not automatic syncing, and this website does not access your computer. Older clients that still require moderator approvals or support only attachment URLs may need local WAV import instead.

Votes are real GitHub Issue reactions. Voting opens GitHub and requires sign-in. Merely clicking the link does not cast a vote.

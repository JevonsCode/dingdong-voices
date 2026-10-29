# DingDong Voices

Browse and download short notification sounds at [the DingDong voice library](https://xn--8ovp9s.xn--m8txu.com/dingdong-voices/).

This repository stores submissions as GitHub Issues. The website is maintained and published from this repository.

The website source is in `docs/`. Run `node tools/version-site.mjs` after changing its assets, then `node --test test/*.test.mjs`.

## Submit a voice

Create an Issue using the voice form. Include Description, Audio, Category, License, Source, and Rights confirmation. An open, structurally valid submission appears directly: no moderator label or approval comment is required by the website.

Audio must be standard PCM WAV, at most 3 seconds and 5 MiB. Upload a WAV attachment in the Issue editor. Repository-hosted audio must use an immutable commit URL under `raw.githubusercontent.com/JevonsCode/dingdong-voices/<40-character-commit>/audio/`.

The website reads the current Issue before playback/download. Repository-hosted WAVs are checked for format, duration and size in the browser, and the Issue is checked again after downloading. GitHub attachments play and download directly from GitHub because its attachment redirect does not permit cross-origin byte reads. DingDong validates WAV bytes, duration and size again when installing. Descriptions are rendered as text, not HTML. GitHub API limits or network errors may prevent loading.

For maintainer-submitted voices listed with an `issueNumber` in `audio/catalog.json`, the sync workflow reconciles the matching Issue's audio link and source metadata with the latest changed WAV commit after validating the file and submission. It can also be run manually. Other submissions are not modified.

## Sources and rights

Each Issue names its source and rights status. A source URL or public availability is not an open license. Do not assume that sounds in this repository are CC0, commercially reusable, or licensed for redistribution. No blanket license is granted over third-party recordings. Retain attribution and obtain any permissions required for your use. Report a rights concern using the report form.

## Use in DingDong

Choose Install to open the voice confirmation in a compatible DingDong desktop app, or download the WAV and import it locally. Installing keeps a local copy; it does not automatically sync future submission updates. The website does not access files on your computer.

Votes are real GitHub Issue reactions. Voting opens GitHub and requires sign-in. Merely clicking the link does not cast a vote.

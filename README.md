# DingDong Voices

Small sounds for a little moment of delight. This is the public community audio catalog for [DingDongBuddy](https://github.com/JevonsCode/DingDongBuddy), separate from client bugs and releases. The voice gallery stays on DingDong's official website at `/dingdongbuddy/voices`.

## Discover and use

- Browse without an account. The gallery reads public GitHub Issues and real 👍 / 👎 reaction counts.
- Preview and download only after current metadata, owner approval, file SHA-256, and actual PCM WAV content have been verified. Network, CORS, rate-limit, or verification failures block playback/download rather than bypass verification.
- To vote, open the exact voice Issue and add a GitHub reaction. GitHub sign-in is required. A gallery click is not itself a vote.
- **Subscribe** copies the Issue URL. In a DingDong version with community import, go to **Settings → Community voices / 设置 → 社区声音**, paste that URL, then press Enter or click the link lookup button. This imports a reviewed snapshot, not a live subscription or automatic update. The website never calls your local machine. Older versions can use local file import after downloading.
- Your own categories are welcome. There is no fixed taxonomy.

## Submit one sound

[Open the voice submission form](https://github.com/JevonsCode/dingdong-voices/issues/new?template=voice.yml).

1. Make or obtain a sound you have the right to distribute. Do not assume a public video, song, or voice recording is reusable. An identifiable person's voice requires appropriate consent.
2. Export **standard PCM WAV**, **no more than 3 seconds** and **5 MiB**. Recommended: mono or stereo, 16-bit. Accepted PCM: 8/16/24/32-bit, 8–192 kHz, one or two channels. MP3 is not accepted by this catalog; convert rather than rename. Do not ZIP the audio.
3. Upload the WAV directly in the GitHub Issue editor. In **Audio**, keep exactly one attachment URL of the form `https://github.com/user-attachments/files/123456/name.wav`, optionally GitHub's Markdown link. Filename characters must be ASCII letters, digits, `_`, `.`, or `-`. No external hosts, query strings, fragments, or credentials.
4. Fill in the title, Description, Category (anything you like), License, Source, and Rights confirmation. Explain license conditions and attribution honestly. Do not include private information.
5. Review and publish your Issue. A maintainer reviews rights and content before listing it. Editing reviewed title, description, audio URL, source, license, or rights confirmation invalidates the old approval and requires review again.

The gallery shows the submitter and submission date. The `voice-approved` label alone is **not** proof that the current attachment is approved.

## Ask your own Agent

Copy this prompt and change the first line:

> Help me create a DingDong notification sound. My style, words, and custom category are: [your idea].
>
> Confirm the rights to all source audio and any identifiable voice. Use original or explicitly authorized material; don't sample a movie, song, or video merely because it is public. Ask before paid tools, model calls, or quota consumption.
>
> Create a standard PCM WAV of at most 3 seconds and 5 MiB, preferably 16-bit mono/stereo, without clipping or abrupt edges. Inspect the actual header, sample data, duration, and size. Don't just change the extension and don't ZIP it.
>
> Prepare an Issue for JevonsCode/dingdong-voices using its form, keeping Description, Audio, Category, License, Source, and Rights confirmation. Upload the WAV directly in the GitHub Issue editor and retain its GitHub attachment URL. Categories are unrestricted. State actual provenance and license terms; do not invent rights or consent.
>
> Show me the file and Issue text and get confirmation before public upload/posting. Don't publish private information. Explain that listing requires human review and later edits require another review.

## Licensing and reports

**There is no blanket license for submitted audio.** Every submission must state its own valid license or permission terms; uploaders retain their applicable rights. Reuse must respect those terms, including attribution. The repository does not promise that a technical check establishes ownership or legal clearance.

[Report a voice](https://github.com/JevonsCode/dingdong-voices/issues/new?template=report.yml) for copyright, consent, privacy, safety, or broken audio concerns. Reports are public: include an Issue link and the problem, not private evidence or personal documents. Maintainers can immediately remove the approval label or close the Issue. Already downloaded files cannot be recalled remotely.

## Maintainer review

Create these labels once if they do not exist: `voice-submission`, `voice-approved`, `voice-report`. No workflow automatically approves or posts untrusted Issue content.

1. Review the actual sound, source, license, consent, and privacy. Technical checks cannot perform that review.
2. With Node.js 22+ run `node tools/review-voice.mjs ISSUE_NUMBER`. This uses only unauthenticated public reads. It validates bounded redirects, at most 5 MiB, RIFF/chunk structure, PCM sample frames, duration, and hashes. It emits JSON **without** posting it.
3. After human review, the repository owner (GitHub user ID `36203025`, API association `OWNER`) posts the emitted JSON as the **entire comment**, without a Markdown code fence (either plain JSON or the exact first line `🕵🏻‍♀️[DOT]` followed by a newline and JSON). Add `voice-approved` only after that review.
4. Revoke by removing `voice-approved` or closing the Issue. When metadata/audio changes, remove the label, review again, post a fresh approval, and restore the label. Do not run approval logic in a privileged Issue-triggered workflow.

Approval schema:

```json
{"dingdongVoiceApproval":1,"issue":123,"metadataSha256":"64 lowercase hex characters","audioSha256":"64 lowercase hex characters"}
```

Metadata is UTF-8 bytes of `JSON.stringify([issue.title, Description.trim(), extractedAudioURL, Source.trim(), License.trim(), RightsConfirmation.trim()])`. The raw Issue title is preserved, including whitespace. The Issue number is separately bound in the comment. A checked `- [x]` confirmation is independently required. Source is required and bound into approval; its truth still requires human review. Free-form category is an informational, untrusted display field outside the v1 content digest; future schemas must be versioned across gallery and client.

Discovery uses open, non-pull-request Issues with the approval label. Audio actions re-fetch the current Issue and approval comments (bounded to 10 pages of 100), fail closed if verification is incomplete, and hash the actual bytes before preview/import. No token, OAuth flow, backend, client-side secret, or real model call is needed.

## Developer checks

The validation module in `tools/catalog-core.mjs` is kept in sync with DingDongBuddy `docs/voices/catalog-core.mjs`. Shared canonical/hash fixtures and validation tests live in that repository under `test/fixtures/voices` and `docs/voices/catalog-core.test.mjs`. Run `node --test docs/voices/catalog-core.test.mjs` from the DingDongBuddy checkout. Do not silently change either validator or canonical field order independently.

For this repository alone, run `node --test test/catalog-core.test.mjs`. Tests use original synthetic silence fixtures and mock fetch responses; they do not publish Issues or call models.

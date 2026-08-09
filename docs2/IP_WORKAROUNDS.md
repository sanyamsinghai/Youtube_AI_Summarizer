# YouTube Transcript Fetching: IP Blocking & Workarounds

A limitation worth understanding early, because it's easy to mistake for a bug in your own code.

---

## 1. The problem

`youtube_transcript_api` (the library used to fetch caption text — the official YouTube Data API doesn't expose caption/subtitle content directly, only metadata) works by making requests that look like a browser fetching a video's caption track, not an authenticated API call with a key.

YouTube rate-limits and sometimes outright blocks IP addresses that send too many of these requests in a short window — a defense against scraping, not something aimed at this project specifically, but something this project runs straight into if used at any volume. Cloud hosting providers are hit especially hard here, since many unrelated services can share the same IP range, meaning a block can occur even from a fairly light request pattern if that IP has a bad reputation for unrelated reasons.

**This is different from a code bug.** If transcript fetching that worked fine yesterday suddenly fails today with no code changes, IP blocking — not a logic error — is the first thing to check.

## 2. How to recognize it

`get_transcript()` checks the error message text for specific phrases (`"blocking requests"`, `"IPBlocked"`, `"RequestBlocked"`) — see [DEVELOPER_COOKBOOK.md](./DEVELOPER_COOKBOOK.md#1-transcript-fetching-dealing-with-two-different-kinds-of-failure) for exactly how that check works. If you see one of these in your terminal logs, you're being rate-limited by YouTube, not hitting an application error.

## 3. Current mitigations in the code

- **Retry with increasing delay:** on a blocked/failed request, the code waits `delay_seconds * (attempt + 1)` before retrying — so each retry waits a bit longer than the last, giving YouTube's rate-limit window more time to clear rather than hammering it repeatedly at a fixed interval.
- **Distinguishing "no captions exist" from "temporarily blocked":** a `"Subtitles are disabled"` message returns `None` immediately rather than burning retries on a video that will never have captions no matter how long you wait.

## 4. Practical advice while developing

- **Test with a single video before running a whole channel's worth of transcripts in a loop.** If a batch job hits 20 videos rapidly and gets blocked partway through, you won't be able to tell whether the code is wrong or the IP just got flagged — isolating one video first removes that ambiguity.
- **If you're developing on a cloud VM or container and hitting blocks constantly** even at low volume, the IP range itself may already have a poor reputation from other tenants' unrelated traffic — this is one of the few cases where testing from a home/residential internet connection genuinely behaves differently (better) than testing from a data-center IP.
- **This is a known constraint of using an unofficial library, not a solved problem.** There's no API key or paid tier that removes it, since it isn't the official API — it's inherent to how caption fetching works today. If this ever becomes a hard blocker for your usage, the honest fix is architectural (e.g. proxying requests, or caching transcripts aggressively so each video is only ever fetched once — which `partial_summaries` already does incidentally, see [AI_PIPELINE.md](./AI_PIPELINE.md)), not a config tweak.

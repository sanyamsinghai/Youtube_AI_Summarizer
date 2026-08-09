# AI & Summarization Pipeline

This document explains how a YouTube transcript actually turns into a finished summary — the full journey from raw captions to the text the user reads, including the constraints that shaped each decision along the way.

If you've never worked with LLM APIs before: an LLM (large language model, like Llama) can only accept a limited amount of text per request, and providers charge/limit you by **tokens** (roughly ¾ of a word each), not characters or words. Every design choice below exists because of that limit.

---

## 1. Why not just paste the whole transcript in and ask for a summary?

A 2-hour podcast transcript can be 20,000+ words. Two problems with sending that in one request:

1. **Rate limits.** Groq's free tier limits how many tokens you can send *per minute* (TPM) and *per day* (TPD) — not just per request. A single giant request can blow through the per-minute limit on its own.
2. **Quality.** Even if a model's context window is big enough to physically fit the whole transcript, LLMs tend to pay less attention to information buried in the middle of a very long input — a well-documented failure mode sometimes called "lost in the middle." Splitting the work up and summarizing in smaller, focused passes produces a more reliable result than hoping the model attends equally to all 20,000 words at once.

The standard fix for both problems is a pattern called **Map-Reduce**:

```
Transcript
    │
    ▼
Split into chunks ──► [Chunk 1] [Chunk 2] [Chunk 3] ... [Chunk N]
                            │        │        │              │
                            ▼        ▼        ▼              ▼
                  MAP:   Summarize each chunk independently
                            │        │        │              │
                            └────────┴────────┴──────────────┘
                                          ▼
                              REDUCE: Combine all chunk
                              summaries into one final,
                              cohesive summary
```

"Map" = apply the same operation independently to every piece. "Reduce" = combine the results back into one. This is the same general pattern used in big-data processing (Hadoop/Spark popularized the term) — it's not AI-specific, it's just a good fit here because the "summarize this piece" step doesn't need to know about any other piece.

---

## 2. Chunking: how the transcript gets split

`chunk_text()` in `transcript_fetcher.py` splits the transcript into word-count chunks, **2,500 words by default**:

```python
def chunk_text(text, chunk_size=2500):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks
```

**Why 2,500 words specifically, and why word count instead of a real tokenizer?** The code's own comment explains the reasoning: non-English languages (Hindi, French, etc.) can have a token-to-word ratio up to 3x higher than English, since a single word can break into several tokens. 2,500 words was chosen as a number safe enough to stay under Groq's 12,000 TPM limit even in that worst case, without needing to run an actual tokenizer (like `tiktoken`) just to count precisely. This is a deliberate simplicity-over-precision tradeoff: it sometimes under-uses the available token budget on English content, but it never risks going over the limit regardless of language — and avoiding an extra dependency for exact token counting was judged not worth the precision gained.

---

## 3. Map stage: summarizing each chunk

Each chunk is sent to Groq independently, in `summarize_chunk()` (`summarizer.py`), using whichever style the user picked (bullets, student notes, etc. — see [FEATURES.md](./FEATURES.md)).

If the whole transcript fits in a *single* chunk, the pipeline skips straight to a direct one-shot summary on the premium model — no map-reduce needed for short videos:

```python
if len(chunks) == 1:
    return summarize_chunk(user_content, style, model=REDUCE_MODEL)
```

For anything longer, each chunk goes through the **fast, cheap model** — this is where the hybrid model strategy comes in.

---

## 4. The two-model strategy: why 8B for chunks, 70B for the final combine

Groq's free tier gives very different quotas to different model sizes. The best model available (`llama-3.3-70b-versatile`) has a **strict daily token cap (TPD)** — one long video's worth of chunk summarization could burn through the entire day's quota on its own, leaving nothing for the final combine, let alone the next video. Meanwhile the smaller `llama-3.1-8b-instant` model has a much larger daily quota and runs faster.

So the pipeline uses two models with different jobs:

| Stage | Model | Why |
|---|---|---|
| **Map** (summarize each chunk) | `llama-3.1-8b-instant` | High-volume, repetitive work — one call per chunk. Using the cheap/fast model here means chunk summarization essentially never touches the scarce 70B daily quota. |
| **Reduce** (combine chunk summaries into one) | `llama-3.3-70b-versatile` | This step runs only once (or a few times, for very long videos — see below) per summary, on a much smaller amount of text (the *summaries*, not the original transcript). Using the stronger model here buys better final writing quality — accurate synthesis, consistent tone, correctly followed style formatting — where it matters most, at minimal token cost. |

This is a genuine "spend your limited budget where it counts" tradeoff: the 8B model is noticeably less capable at literary/stylistic tasks, but that weakness barely matters at the chunk-summarization stage where the goal is just accurate fact extraction, not polished prose. The polish happens once, at the end, when the 70B model has comparatively little text left to process.

---

## 5. Reduce stage: combining chunk summaries

`combine_summaries()` doesn't just concatenate every chunk summary into one prompt — for videos with many chunks, that combine step could itself exceed a single request's practical size. Instead it reduces in **batches, iteratively**, until only one summary remains:

```python
def combine_summaries(summaries, style, batch_size=4, model=REDUCE_MODEL):
    current = summaries[:]
    while len(current) > 1:
        next_round = []
        for i in range(0, len(current), batch_size):
            batch = current[i:i + batch_size]
            combined = summarize_chunk(..., model=model)
            next_round.append(combined)
        current = next_round
    return current[0]
```

Concretely: 10 chunk summaries → combined in groups of 4 → 3 summaries → combined again → 1 final summary. This is Map-Reduce applied *recursively* to its own output — a "reduce tree" rather than a single flat reduce. **Why batch instead of combining all N chunk summaries in one final call?** Same reasoning as the original chunking: a video with many chunks could still produce more combined text than is safe to send in one request. Batching the reduce step protects against that at any video length, not just typical ones.

---

## 6. Resilient caching: surviving a rate-limit failure mid-run

Summarizing a long video means many sequential API calls. If a rate limit or daily quota gets hit halfway through, you don't want to lose all the completed work and start over from chunk 1.

The `partial_summaries` table exists specifically for this. Every time a chunk is successfully summarized during the Map stage, it's committed to the database immediately — not held in memory until the whole run finishes:

```python
part = PartialSummary(video_id=video_id, style=style, chunk_index=i, summary_text=summary)
db.add(part)
db.commit()
```

Before summarizing any chunk, the pipeline first checks whether a cached summary for that exact `(video_id, style, chunk_index)` already exists, and skips the API call entirely if so. So if a run fails on chunk 7 of 12 (rate limit hit), the next attempt — even hours later — picks up from chunk 8, re-using the 7 already-cached chunk summaries for free.

Once the full pipeline completes successfully, all partial summaries for that `(video_id, style)` are deleted — they're a temporary staging area, not permanent storage. (Compare this to the `summaries` table, which *is* permanent storage for finished results, scoped to a specific logged-in user.)

**Why not just retry the whole video from scratch on failure?** At 2,500 words per chunk, a single chunk summarization call is nearly free in tokens. Losing 6 already-completed chunks' worth of work to a failure on chunk 7 would waste real quota and real time for no reason — the cache exists purely to make retries cheap.

---

## 7. Handling rate limits within a single call

Even with careful chunking, Groq can return a `RateLimitError` (HTTP 429) if too many requests land in a short window — for example, several users summarizing videos at the same time. `summarize_chunk()` wraps every API call in a retry loop:

1. **Parse the wait time.** Groq's response often includes a `retry-after` header. If that's missing, the code falls back to parsing it out of the error message text with a regex (`try again in ([\d\.]+)s`).
2. **Decide: is this a short-term wait or a hard daily wall?** If the required wait is **under 20 seconds**, it's treated as a normal, temporary per-minute limit — worth waiting out. The code sleeps (with exponential backoff — each retry waits longer than the last) and tries again, up to 3 times.
3. **If the wait is over 20 seconds**, that almost always means the *daily* quota (TPD), not the per-minute one, has been exhausted — waiting won't help within this request's lifetime, and sleeping for minutes would leave the HTTP connection to the frontend hanging until it times out. So the code fails fast instead, raising `ServiceUnavailableError` immediately, letting the frontend show the user a clear error rather than a frozen loading spinner.

**Why the 20-second cutoff specifically?** It's a heuristic based on how Groq's per-minute limits behave in practice — a per-minute limit resets fast enough that a short sleep resolves it, while a daily limit reset is hours away. Waiting 20 seconds is a tolerable delay for a user; waiting an unknown number of minutes inside a live HTTP request is not.

---

## 8. Where this fits in the bigger request flow

For the full picture of how a `/summarize` request flows from the frontend, through rate limiting and caching, to the final response — see [ARCHITECTURE.md](./ARCHITECTURE.md). For what each of the summary *styles* actually asks the model to produce, see [FEATURES.md](./FEATURES.md).

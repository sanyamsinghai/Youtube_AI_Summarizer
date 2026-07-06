# IP Workarounds For Transcript Fetching

If `youtube_transcript_api` keeps saying YouTube is blocking requests from your IP, the problem is usually the network you are using, not your Python code.

## What to try

1. Wait and try again later.
2. Use fewer transcript requests per run.
3. Test one video first instead of the whole channel.
4. Run the script from a different internet connection.
5. Use a residential connection instead of a cloud or shared network.
6. Try a VPN or proxy if your current IP is blocked.

## Why it happens

- YouTube may rate-limit too many transcript requests.
- Some IP ranges, especially cloud providers, are blocked more often.
- The transcript library depends on YouTube allowing the request.

## What already helps in your app

- Small delays between requests.
- Retrying blocked transcript requests.
- Stopping after the first usable transcript.

## Best next step

If the problem keeps happening, the fastest fix is usually to run the script from a different network or use a VPN.

## Safer testing pattern

- Try one channel.
- Try one or two videos only.
- Confirm transcripts work before processing the whole list.

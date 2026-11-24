# Delano Trail handoff · November 24, 2026

The local app includes building search and a narrated first stop. The public GitHub Pages deployment is pending GitHub authentication on the development Mac.

## Try it

- **Audio on a phone:** Join the Mac’s Wi-Fi, open the [Green Trail preview](http://192.168.0.9:5185/?nointro#/trail/green), and tap **Play the guided tour**. City Hall plays first. The center button pauses or resumes the recording. The tour advances when the narration finishes. [Listen to the MP3 directly](http://192.168.0.9:5185/narration/city-hall.mp3).
- **Building search:** Tap **Search** in the top bar. Enter a building name, stop title, or address and select a result to open its plaque. Search covers all 72 stops.
- **Visual direction:** The welcome screen uses a large black tower and wordmark. After entry, the home panel uses a compact version. Selected trail buttons use the trail color with white text and a white dot. The interface uses no bronze or metallic styling.

## Audio and remaining work

City Hall is the only narrated stop. The recording is about 23 seconds long and lives at `public/narration/city-hall.mp3`. ElevenLabs generated it with Rouell, a warm baritone. It used 364 credits. The last account check showed 9,636 credits remaining and zero overage. The official ElevenLabs Creative MCP is configured on the Mac.

The other 71 stops still use the timed tour. Before generating additional audio, review the City Hall take and estimate credits for the chosen scripts. Tour playback is in `src/Panels.tsx`; the current implementation selects the recording by the City Hall slug.

## Verification and publication

All 19 tests and the production build passed. Chrome checks covered search at phone and desktop widths, plus playback, pause, resume and automatic advancement to the next stop. The latest application commit is `65b3ad0`.

Authenticate Git on the Mac with write access to Dithilli/delano-trail, then run `git push origin main` from this checkout. The repository rule is to verify, commit and promptly push each completed change. A push to main triggers the Pages deployment. Confirm it in [GitHub Actions](https://github.com/Dithilli/delano-trail/actions).

The Wi-Fi link requires the local Vite server and the Mac’s current network address. To restart it from this checkout with Node and npm available, run `npm run dev -- --host 192.168.0.9 --port 5185`. If the address changes, use the new address in the command and preview links.

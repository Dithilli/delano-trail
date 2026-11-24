# Delano Trail handoff · November 24, 2026

The local app includes building search and a narrated first stop. The public GitHub Pages deployment is pending GitHub authentication on the development Mac.

## Try it

- **Audio on a phone:** Join the Mac’s Wi-Fi, open the [Green Trail preview](http://192.168.0.9:5185/?nointro#/trail/green), and tap **Play the guided tour**. City Hall plays first. The center button pauses or resumes the recording. The tour advances when the narration finishes. [Listen to the MP3 directly](http://192.168.0.9:5185/narration/city-hall.mp3).
- **Building search:** Tap **Search** in the top bar. Enter a building name, stop title, or address and select a result to open its plaque. Search covers all 72 stops.
- **Visual direction:** The welcome screen uses a large black tower and wordmark. After entry, the home panel uses a compact version. Selected trail buttons use the trail color with white text and a white dot. The interface uses no bronze or metallic styling.

## Audio and remaining work

City Hall is the only narrated stop. The recording is about 51 seconds long and lives at `public/narration/city-hall.mp3`; its script is in `public/narration/city-hall-script.txt`. The official ElevenLabs Creative MCP is configured and signed in on the Mac.

**Voice for all stops:** Christian - Warm Documentary Narrator (voice ID `KMLpM4tgKxYUlv81Ue0p`) on the `eleven_v4` model. It replaced Rouell, which had a noticeable lisp. Owen was also lispy; the owner hears a faint trace on Christian and accepted it.

**Pronouncing "Delano":** the owner confirmed "DEL-uh-no", with the emphasis on the first syllable (not "duh-LAY-no", not the Spanish pronunciation). In the text sent to `eleven_v4`, write the name as IPA between slashes: `/ˈdɛlənoʊ/` (possessive `/ˈdɛlənoʊz/`). This is not reliable: the same spelling came out as "DAH-luh-no" on some voices and takes, so the owner must listen to every take before it ships.

**Credits:** the free plan allows 10,000 per month and 4,512 are used as of November 24, 2026. A full-length stop costs about 800 credits per take, and each request makes two takes. The free queue also rejects takes as busy when several run at once. The remaining 71 stops will not fit in the free allowance.

The other 71 stops still use the timed tour. Before generating additional audio, estimate credits for the chosen scripts. Tour playback is in `src/Panels.tsx`; the current implementation selects the recording by the City Hall slug.

## Verification and publication

All 19 tests and the production build passed. Chrome checks covered search at phone and desktop widths, plus playback, pause, resume and automatic advancement to the next stop. The latest application commit is `65b3ad0`.

Authenticate Git on the Mac with write access to Dithilli/delano-trail, then run `git push origin main` from this checkout. The repository rule is to verify, commit and promptly push each completed change. A push to main triggers the Pages deployment. Confirm it in [GitHub Actions](https://github.com/Dithilli/delano-trail/actions).

The Wi-Fi link requires the local Vite server and the Mac’s current network address. To restart it from this checkout with Node and npm available, run `npm run dev -- --host 192.168.0.9 --port 5185`. If the address changes, use the new address in the command and preview links.

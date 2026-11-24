# Delano Trail handoff · November 24, 2026

The local app includes building search and a narrated first stop. The public GitHub Pages deployment is pending GitHub authentication on the development Mac.

## Try it

- **Audio on a phone:** Join the Mac’s Wi-Fi, open the [Green Trail preview](http://192.168.0.9:5185/?nointro#/trail/green), and tap **Play the guided tour**. City Hall plays first. The center button pauses or resumes the recording. The tour advances when the narration finishes. [Listen to the MP3 directly](http://192.168.0.9:5185/narration/city-hall.mp3).
- **Building search:** Tap **Search** in the top bar. Enter a building name, stop title, or address and select a result to open its plaque. Search covers all 72 stops.
- **Visual direction:** The welcome screen uses a large black tower and wordmark. After entry, the home panel uses a compact version. Selected trail buttons use the trail color with white text and a white dot. The interface uses no bronze or metallic styling.

## Audio and remaining work

The first two Green Trail stops are narrated: City Hall (`public/narration/city-hall.mp3`, about 51 seconds) and the Delano Community Development Corporation (`public/narration/dcdc.mp3`, about 49 seconds). Each has its script beside it as `<slug>-script.txt`. The official ElevenLabs Creative MCP is configured and signed in on the Mac.

**Voice for all stops:** Christian - Warm Documentary Narrator (voice ID `KMLpM4tgKxYUlv81Ue0p`) on the `eleven_v4` model. It replaced Rouell, which had a noticeable lisp. Owen was also lispy; the owner hears a faint trace on Christian and accepted it.

**Pronouncing "Delano":** the owner confirmed "DEL-uh-no", with the emphasis on the first syllable (not "duh-LAY-no", not the Spanish pronunciation). In the text sent to `eleven_v4`, write the name as IPA between slashes: `/ˈdɛlənoʊ/` (possessive `/ˈdɛlənoʊz/`), or with syllable breaks, `/ˈdɛl.ə.noʊ/`. This is not reliable: the same spelling came out as "DAH-luh-no" on some voices and takes, and a full-script take never got all four right.

**How the City Hall recording was made:** each sentence was generated as its own short clip, the owner picked a take of each by ear, and the clips were joined into one MP3. Generate one sentence per request for the other stops too, so a bad "Delano" costs one short re-roll instead of the whole script. The owner must listen to every "Delano" before it ships.

**Credits:** the owner added credits to the ElevenLabs account on November 24, 2026; check the balance before a batch. A full-length stop is about 800 characters, and each request makes two takes.

The other 70 stops still use the timed tour. To narrate another stop, save its recording as `public/narration/<slug>.mp3` and add the slug to `NARRATED_STOPS` in `src/Panels.tsx`. The DCDC summary says the organization "disbanded in 1980" while its longer text says late 1980s/early 1990s; the narration follows the summary and the owner has not yet said which is right.

## Verification and publication

All 19 tests and the production build passed. Chrome checks covered search at phone and desktop widths, plus playback, pause, resume and automatic advancement to the next stop. The latest application commit is `65b3ad0`.

Authenticate Git on the Mac with write access to Dithilli/delano-trail, then run `git push origin main` from this checkout. The repository rule is to verify, commit and promptly push each completed change. A push to main triggers the Pages deployment. Confirm it in [GitHub Actions](https://github.com/Dithilli/delano-trail/actions).

The Wi-Fi link requires the local Vite server and the Mac’s current network address. To restart it from this checkout with Node and npm available, run `npm run dev -- --host 192.168.0.9 --port 5185`. If the address changes, use the new address in the command and preview links.

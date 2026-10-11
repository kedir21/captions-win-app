# Ethiopian Captions Craft

Build a polished, production-minded web companion app called Amharic Caption Studio for generating Amharic (አማርኛ) subtitles for videos and exporting them for use in CapCut. Important: do not claim direct CapCut plugin/timeline integration unless supported; explain this is a companion workflow and provide SRT/VTT export. Create a premium, minimal, responsive UI with dark charcoal background, warm violet/coral accents, clear typography, modern creator-tool feel. Main workflow: upload/select video file, show video preview and metadata, choose spoken language (Amharic default), optional translate-to-English toggle, generate captions button, processing/progress states, then editable caption table with start/end timestamps and Amharic text, playback preview with synchronized captions, controls to edit/delete/add segments, style preview options, and export SRT/VTT. Include a helpful empty state, drag-and-drop uploader, file validation and clear errors. Since no ASR credentials are configured, implement the UI and architecture cleanly with a transcription service abstraction and a clearly labeled demo/sample transcript mode; do not fake successful real transcription. Add a settings/help section explaining a real speech-to-text provider must be configured for production Amharic transcription, secure upload handling, and that SRT import support depends on CapCut version. Support Ethiopic Unicode fonts and mobile layouts. Make the app functional for local video preview, caption editing, timestamp handling, and downloadable SRT/VTT files. Include sample demo captions that users can load to try the editor. Avoid requiring a login for the prototype. Use React/TypeScript and Tailwind/shadcn as appropriate.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fd43bd31-de5e-4e02-8584-38de2aed93f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Windows desktop build (experimental packaging)

The repository includes an Electron desktop wrapper and a GitHub Actions workflow that can produce a Windows installer. This packaging path still needs to be verified on a Windows runner before it should be considered a tested release.

### Build locally on Windows

1. Install Node.js 22 or newer.
2. Open PowerShell in the project folder.
3. Run `npm install --legacy-peer-deps`.
4. Run `npm run dist:win`.
5. Find the installer in the `release` folder.

You can also open **GitHub → Actions → Build Windows installer → Run workflow**. When the workflow completes, download the installer from its **Artifacts** section.

### Configure real speech-to-text

The app calls OpenAI Whisper from the server; demo mode is only sample text and is not transcription. Do not put an API key in frontend code or commit it to Git. Before launching the desktop app, configure `OPENAI_API_KEY` in the Windows user environment and restart the app. In PowerShell, `setx OPENAI_API_KEY "your-api-key"` saves it for future processes; close and reopen the app after running this command. OpenAI API usage may incur charges. If the key is missing or billing/quota is unavailable, real transcription will fail clearly rather than silently substituting sample captions.

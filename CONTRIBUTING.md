# Contributing

Thanks for helping improve NotebookLM Highlight to Explain.

## Local Setup

1. Clone or download the repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked** and select the repository folder.
5. Open or refresh `https://notebooklm.google.com`.

## Development Checks

Run:

```sh
npm run check
```

This checks JavaScript syntax and validates `manifest.json`.

## Manual Testing

Before opening a pull request, test the main workflow:

1. Highlight text inside a NotebookLM source.
2. Press `Cmd+E` on macOS or `Ctrl+E` on Windows/Linux/ChromeOS.
3. Confirm the popup appears.
4. Click Explain, Example, and Summarize.
5. Confirm each prompt is inserted into NotebookLM chat without being submitted.
6. Highlight a previous NotebookLM chat answer and confirm the prompt does not include a `Source:` line.

## Pull Requests

Keep pull requests focused. Include a short explanation of the behavior change and any manual testing you performed.

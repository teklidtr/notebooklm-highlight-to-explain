# Chrome Web Store Listing — NotebookLM Highlight to Explain

> Last Updated: 2026-07-01

## Store Listing

**Extension Name**
NotebookLM Highlight to Explain

**Short Description**
Explain, summarize, or create examples from highlighted NotebookLM text and insert the prompt into chat.

**Detailed Description**
NotebookLM Highlight to Explain helps you move from reading sources to asking better questions in Google NotebookLM.

Highlight text inside NotebookLM, press Cmd+E (macOS) or Ctrl+E (Windows/Linux/ChromeOS), then choose Explain, Example, or Summarize. The extension inserts a ready-to-send prompt into the NotebookLM chat panel. If the highlight comes from a source, it includes the source title when it can detect one.

Useful for students, teachers, researchers, and anyone using NotebookLM to study documents, lecture notes, reports, or PDFs.

Features:
- Highlight NotebookLM text and open a focused prompt popup.
- Add explain, example, or summarize prompts to NotebookLM chat.
- Include the selected source title when the highlight comes from a source.
- Keep the prompt editable before sending.
- Works only on https://notebooklm.google.com/*.

This is an independent tool and is not affiliated with Google or NotebookLM.

**Category**
Productivity / Search Tools / Developer Tools (Education suggested on Store)

**Single Purpose**
Create formatted study and explanation prompts from selected NotebookLM text and insert them directly into the page's chat box.

**Primary Language**
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1 (Annotated) | 1280×800 or 640×400 | ✅ Ready | `icons/screenshot_annotated.jpg` |
| Screenshot 2 (Prompt) | 1280×800 or 640×400 | ✅ Ready | `icons/screenshot_resulting_prompt.png` |
| Screenshot 3 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile | 440×280 PNG | ✅ Ready | `icons/small_promo_tile.png` |

### Screenshot Notes
- **Screenshot 1**: Highlighted text in a NotebookLM source with the floating action popup (Explain, Example, Summarize) visible near it.
- **Screenshot 2**: The generated prompt inserted into the NotebookLM chat panel, focused and ready to send.


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Used to retrieve the highlighted/selected text on the current NotebookLM tab and interact with the page's DOM (focusing and inserting the formatted prompt into the chat box). |
| `clipboardWrite` | permissions | Used as a fallback: if the extension fails to programmatically inject the prompt into the chat container (e.g. due to framework lockouts), it copies the prompt to the clipboard and shows a toast so the user can manually paste it. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL**
https://github.com/teklidtr/notebooklm-highlight-to-explain/blob/main/PRIVACY.md
*(See the local PRIVACY.md for privacy declaration copy).*


## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free


## Developer Info

**Publisher Name**
teklidtr

**Contact Email**
teklidtr@gmail.com

**Support URL / Email**
teklidtr@gmail.com


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-07-01 | Initial version. Local DOM traversal, clipboard fallback, dark mode matching, and scroll dismissal. | Draft |


## Review Notes

### Known Issues / Limitations
- Relies on DOM structure heuristics to find the chat text area and detect active source titles. Google updates to NotebookLM's class names may require script adjustments.

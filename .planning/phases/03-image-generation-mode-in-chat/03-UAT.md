---
status: testing
phase: 03-image-generation-mode-in-chat
source: [03-SUMMARY.md]
started: 2026-11-01T00:00:00Z
updated: 2026-11-01T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Mode switch with separate histories
expected: |
  Open /chat. The panel opens in Chat mode. Click the "Image" switch at the top — the view changes to image history only (no chat messages), and the composer changes to image mode (aspect/style chips, green round button). Click "Chat" — your chat conversation returns. Switching back and forth loses nothing.
awaiting: user response

## Tests

### 1. Mode switch with separate histories
expected: Open /chat. Panel opens in Chat mode. "Image" switch shows image history only (no chat messages) with the image composer (aspect/style chips, green round button). "Chat" returns the chat conversation. Switching loses nothing.
result: pending

### 2. Generate an image with style
expected: In Image mode, open the Style picker (Auto chip) — 8 thumbnail cards with a fox preview in different styles, selected has green ring + check. Pick a bold style (e.g. Pixel art), pick an aspect (e.g. 16:9), type a prompt and press Enter. The result card appears in the chosen aspect shape and the image clearly matches the chosen style.
result: pending

### 3. Progress bar while generating
expected: Right after submitting a prompt, a fixed aspect-shaped card shows a pulsing image icon, a green progress bar easing upward with a percentage (e.g. 61%), and "Generating image… · usually a few seconds". It is replaced by the image when done.
result: pending

### 4. Download image
expected: Click the download icon on an image card caption. The browser DOWNLOADS a .png file (does not open the CDN link in a tab).
result: pending

### 5. Chat streaming regression
expected: In Chat mode, send a message. The reply streams in progressively, no model/provider name is shown anywhere, and the counter under the composer increments.
result: pending

### 6. Reload persistence
expected: Reload the page. Chat mode restores the chat conversation; Image mode restores past generations (images still visible via their CDN URLs). Nothing crosses over between modes.
result: pending

### 7. Slim footer on /chat
expected: The /chat page footer is a single thin row (~50px): "© 2026 Ashish Gupta · Privacy · Terms" left, small social icons right. Other pages (home) still show the full footer.
result: pending

### 8. Production (Vercel) end-to-end
expected: On https://www.ashishcys.cyou/chat — generate an image, see it render, and download it. Same behavior as localhost, no broken images.
result: pending

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]

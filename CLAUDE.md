# minichord-ui

Clean minimal restyle of the [minichord minicontrol](https://minichord.com/minicontrol/) web interface.

## Project overview

This is a fully functional Web MIDI controller UI for the [minichord](https://minichord.com) synthesizer. It communicates with the device over USB via SysEx messages to read/write all synth parameters.

## Architecture

```
index.html                  — Main page, sidebar + parameter area
index.css                   — Clean minimal theme with light/dark mode (CSS variables)
javascript/
  minichordcontroller.js    — MIDI controller class (SysEx send/receive, device detection)
  index.js                  — UI logic: dynamic parameter generation, slider handlers,
                              rhythm checkbox grid, bank management, preset import/export,
                              random preset generator, dark mode
json/
  parameters.json           — All 195 parameter definitions (31 global, 67 harp, 97 chord)
  shared_presets.json        — (optional) Community presets used as seeds for randomizer
```

## Key design decisions

- **Parameters are generated dynamically** from `json/parameters.json` at runtime (the original site used static HTML rows). This makes it easier to update when firmware adds new parameters.
- **minichordcontroller.js is kept unchanged** from the original — it handles all MIDI communication and should not be modified unless the SysEx protocol changes.
- **CSS uses custom properties** for theming (`--bg`, `--text`, `--border`, etc.) with a `.dark-mode` class toggle.
- **Rhythm/arp grid** is rendered as a 7-voice x 16-step checkbox table within the Chord > Rythm parameter group.

## Running locally

The app uses `fetch()` to load `parameters.json`, so it must be served over HTTP (not `file://`):

```bash
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or `:8000`) in Chrome. Chrome is required for Web MIDI + SysEx support.

## MIDI protocol notes

- Device is detected by name containing "minichord" on MIDI port 1
- All parameters are sent as 6-byte SysEx: `[0xF0, addr_lo, addr_hi, val_lo, val_hi, 0xF7]`
- Device responds with a full parameter dump (256 params x 2 bytes + bank number)
- Rhythm patterns (addresses 220-235) are bitmasks — each bit represents a voice
- Float parameters are transmitted as `value * 100` (integer encoding)
- Exponential curve sliders use log mapping for display

## Original source

Scraped from https://minichord.com/minicontrol/ on 2026-04-05. The random preset generator includes code by TerminalWaltz (GNU GPL v3.0).

# Chore & Reward Chart

Printable weekly chore & reward boards for **Charlotte (Char, ~13)** and **Victor (Vic, ~11)** — Boyd household fridge / AirPrint sheets. TokenMax burn build.

Age-appropriate EXAMPLE chores (editable), streak stickers, points→perks menu (screen time, pick dinner, etc.). Checks persist in `localStorage`.

## Screens

1. **Char** — Charlotte’s weekly grid, streaks, perks  
2. **Vic** — Victor’s weekly grid, streaks, perks  
3. **Print sheet** — AirPrint-friendly one-page-per-kid layout  
4. **About** — export / reset save, hash routes

Hash routes: `#char` · `#vic` · `#print` · `#about`

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4311/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/chore-reward-chart.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/chores.json` — EXAMPLE kids, chores, perks (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`

Kids are only Char and Vic (not JT/Laney).


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/chore-reward-chart` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.

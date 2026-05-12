# gd Common Council District Lookup

This is the lookup tool on syr.gov where residents can type their address and find out who their Common Councilor is.

Live site: https://syr-common-councilor-lookup.netlify.app/

---

## Getting started

ex

**First time:**

```bash
git clone https://github.com/CityofSyracuse/common-council-searchable.git
cd common-council-searchable
```

**To preview:** double-click `index.html`.

If the lookup isn't matching anything when you preview locally, your browser is blocking the JS files. Run a quick local server from the folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

**Always hard-refresh after a change** — Ctrl+F5 on Windows, Cmd+Shift+R on Mac. Otherwise the browser caches `scripts.js` and you'll swear nothing changed.

---

## Making a change and pushing it live

Netlify is hooked up to GitHub. Whatever you push to `main` is live in about a minute.

1. Edit the file (see "When you need to change something" below)
2. Open `index.html`, hard-refresh, confirm it works
3. Commit and push:
   ```bash
   git add <file>
   git commit -m "what you changed and why"
   git push
   ```
4. Wait ~1 minute, check https://syr-common-councilor-lookup.netlify.app/

If something looks off after deploy, revert the commit and push — Netlify redeploys the previous version.

---

## The files

It's a plain HTML/CSS/JS site.

- `index.html` — the page itself
- `styles.css` — all the styling
- `scripts.js` — the search logic
- `data.js` — residential street ranges
- `data2.js` — residential exact addresses (the exceptions)
- `parcel_lookup_data.js` — every parcel in the city. This is what makes commercial addresses work — Destiny USA, City Hall, hotels, hospitals, all of it.
- `Syracuse_Common_Council_Boundaries_(2023).geojson` — the district boundaries.
- `council_data.py` — the Python script to build the JS data files.

---

## How it actually works

When someone types an address, `scripts.js` checks three datasets in this order:

1. **`parcel_lookup_data.js`** first. This catches commercial and government buildings.
2. **`data.js`** next. Residential street ranges (covers the bulk of homes).
3. **`data2.js`** as a backup for residential exceptions.

It stops at the first hit.

The search updates live as you type:

- Just a number → list of streets where that number exists
- Number + part of a street → narrows down
- Full address → the spotlight card pops up with district, ward, councilor, and a contact link
- Just a street name → asks for a house number

The parser handles the stuff people actually type — uppercase, lowercase, "St" vs "Street", "Ave" vs "Avenue", "1st" vs "first", "N Salina" vs "Salina N". All gets normalized to the same thing before matching.

---

## When you need to change something

**A councilor changed?** Edit `COUNCILOR_META_BY_DISTRICT` at the top of [scripts.js](scripts.js#L23-L44). Name and link for each district. That's it.

**Need to refresh the data?**

- Residential ranges → rebuild `data.js` from the City's street range source
- Exact addresses → `data2.js`
- Parcel data (commercial, etc.) → rebuild `parcel_lookup_data.js` from the City Parcels dataset: https://data.syr.gov/datasets/6dabdd6add9443128c2adc9bd6609051_0
- `council_data.py` is a starting point for the regeneration

If you rebuild `parcel_lookup_data.js` yourself, the rows have to stay in this order:

```
[houseNumber, streetName, fullAddress, CC_DIST, CITY_WARD, LAT, LONG, landUse]
```

Owner info is left out on purpose — this file is public.

**Visual change?** Everything's in `styles.css`. No framework.

---

## What still doesn't work

The code is fine. These are data gaps — they'd need to be fixed at the GIS source by NBD or the data team:

- `109 S Warren St` (State Tower) — not in the parcel feed at that number
- `401 Harrison St` (Everson Museum)
- `201 E Washington St` (City Hall Commons) — that block is filed under Salina St in the feed
- Anything outside city limits — OCC, Hancock, anywhere in DeWitt/Salina/Onondaga town. These won't show up and shouldn't, since they're not in a council district.

if you type a single letter after a space (like `233 E W`), you'll see "no matches" for a second because `S`/`N`/`E`/`W` get read as directionals. Type the next letter and it comes back. Annoying but minor.

---

## Changelog

| Date     | What changed                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Feb 2026 | First release                                                                                                                                                                                                                                                |
| Feb 2026 | UX + branding cleanup                                                                                                                                                                                                                                        |
| May 2026 | Added the parcel lookup layer + suffix stripping. |

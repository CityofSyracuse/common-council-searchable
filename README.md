# Common Council District Lookup

**Date Started:** February 2026

**Last Updated:** February 2026

**Initial Contributors:**

* Eric Adame
* Tim Liles
* Mel Saffold

**Current Maintainer:**

* Mel Saffold

---

## Project Summary

| Info                              | Answer                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Who is this for?**        | City of Syracuse residents, City staff, and public-facing web users                              |
| **What does this tool do?** | Allows users to enter an address and identify their Common Council district, ward, and councilor |
| **Primary Benefit**         | Removes guesswork for residents and staff when identifying council representation                |
| **Internal Product Owner**  | Digital Services / API                                                                           |
| **Departments Involved**    | Common Council, Digital Services                                                                 |
| **Public-Facing**           | Yes (embedded on syr.gov pages)                                                                  |

---

## Overview of the Tool

### What This Tool Does

* Accepts a street address as user input
* Normalizes and parses address data (numbers, ordinals, abbreviations, street types)
* Matches the address against authoritative street range and address datasets
* Displays:
  * Council District
  * Ward
  * Assigned Councilor

If no exact match is found, the tool suggests the closest valid matches.

---

## Technical Overview

### Data Sources

* Embedded CSV-to-JS datasets:
  * `data.js` (street ranges)
  * `data2.js` (exact address records, where applicable)

> No live API dependency. All logic runs client-side.

---

## File Structure

<pre class="overflow-visible! px-0!" data-start="2456" data-end="2701"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(var(--sticky-padding-top)+9*var(--spacing))]"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>/index.html     → Embed-ready markup
/styles.css     → Brand-aligned styling
/scripts.js     → Search, parsing, matching, and rendering logic
/data.js        → Street range dataset
/data2.js       → Exact address dataset (when available)
</span></span></code></div></div></pre>

---

## How the Tool Works

1. User types an address into the search field
2. Input is normalized (case, abbreviations, ordinals, punctuation)
3. Address is parsed into:
   * House number
   * Street name
   * Street base (without suffix)
4. The tool attempts:
   * Exact address match
   * Street range match (including odd/even logic)
   * Closest-match suggestion using string distance
5. Results are rendered live as the user types

---

## How to Modify or Extend

### Updating Street Data

* Edit or replace the CSV-derived arrays in:
  * `data.js`
  * `data2.js`
* Maintain column order to avoid breaking parsing logic

### Updating Councilor Names

* Update the `COUNCILOR_BY_DISTRICT` map in `scripts.js`

### Styling / UX Changes

* All visual changes should be made in `styles.css`

---

## Precautions

* Always test changes with:
  * Full addresses
  * Partial addresses
  * Abbreviations (St, Ave, Blvd, etc.)
  * Ordinal streets (1st, 2nd, 3rd, etc.)
* Test on mobile widths before merging
* Keep language simple and resident-facing

---

## Known Constraints

* Data accuracy depends entirely on the completeness of the street datasets
* Non-standard addresses (rear lots, informal names) may require manual clarification
* Tool does not validate USPS deliverability - it only matches council data

---


## Notable Updates

| Date     | Change                    | Impact                                                  |
| -------- | ------------------------- | ------------------------------------------------------- |
| Feb 2026 | Initial release           | Residents can identify council representation instantly |
| Feb 2026 | UX + branding refinements | Improved clarity, accessibility, and trust              |

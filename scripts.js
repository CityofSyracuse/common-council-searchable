const input = document.querySelector("#address");
const results = document.querySelector("#results");
const searchButton = document.querySelector("#search");
const v4Input = document.querySelector("#search-input") || input;
const resultsBody = document.querySelector("#results-tbody");
const noResults = document.querySelector("#no-results");
const suggestionMessage = document.querySelector("#suggestion-message");
const loadError = document.querySelector("#load-error");
const typeahead = document.querySelector("#typeahead");
const spotlight = document.querySelector("#spotlight");

const spotlightDistrict = document.querySelector("#spotlight-district");
const spotlightWard = document.querySelector("#spotlight-ward");
const spotlightAddress = document.querySelector("#spotlight-address");
const spotlightCouncilor = document.querySelector("#spotlight-councilor");

let streetData = [];
let streetDataBackup = [];
let dataLoaded = false;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        value += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

const TOKEN_MAP = {
  st: "street",
  street: "street",
  rd: "road",
  road: "road",
  ave: "avenue",
  avenue: "avenue",
  blvd: "boulevard",
  boulevard: "boulevard",
  dr: "drive",
  drive: "drive",
  ln: "lane",
  lane: "lane",
  ct: "court",
  court: "court",
  pl: "place",
  place: "place",
  ter: "terrace",
  terrace: "terrace",
  terr: "terrace",
  pkwy: "parkway",
  parkway: "parkway",
  hwy: "highway",
  highway: "highway",
  cir: "circle",
  circle: "circle",
  sq: "square",
  square: "square",
  way: "way",
  av: "avenue",
  aven: "avenue",
  n: "north",
  north: "north",
  s: "south",
  south: "south",
  e: "east",
  east: "east",
  w: "west",
  west: "west",
  ne: "northeast",
  northeast: "northeast",
  nw: "northwest",
  northwest: "northwest",
  se: "southeast",
  southeast: "southeast",
  sw: "southwest",
  southwest: "southwest",
};

const ORDINAL_MAP = {
  "1st": "first",
  "2nd": "second",
  "3rd": "third",
  "4th": "fourth",
  "5th": "fifth",
  "6th": "sixth",
  "7th": "seventh",
  "8th": "eighth",
  "9th": "ninth",
  "10th": "tenth",
  "11th": "eleventh",
  "12th": "twelfth",
  "13th": "thirteenth",
  "14th": "fourteenth",
  "15th": "fifteenth",
  "16th": "sixteenth",
  "17th": "seventeenth",
  "18th": "eighteenth",
  "19th": "nineteenth",
  "20th": "twentieth",
};

const STREET_TYPES = new Set([
  "street",
  "road",
  "avenue",
  "boulevard",
  "drive",
  "lane",
  "court",
  "place",
  "terrace",
  "parkway",
  "highway",
  "circle",
  "square",
  "way",
]);

function normalizeOrdinal(token) {
  if (ORDINAL_MAP[token]) {
    return ORDINAL_MAP[token];
  }
  return token.replace(/(\d+)(st|nd|rd|th)$/, (_, num) => {
    return ORDINAL_MAP[`${num}th`] || num;
  });
}

function normalizeTokens(value) {
  return value
    .toLowerCase()
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeOrdinal(TOKEN_MAP[token] || token));
}

function normalizeStreetName(value) {
  return normalizeTokens(value).join(" ").trim();
}

function baseStreetName(tokens) {
  if (!tokens.length) {
    return "";
  }
  const last = tokens[tokens.length - 1];
  if (STREET_TYPES.has(last)) {
    return tokens.slice(0, -1).join(" ").trim();
  }
  return tokens.join(" ").trim();
}

function parseAddress(address) {
  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }
  const base = trimmed.split(",")[0].trim();
  const match = base.match(/^(\d+)\s+(.+)$/);
  if (!match) {
    return null;
  }

  const streetRaw = match[2]
    .replace(/\b(apt|unit|suite|#)\b.*$/i, "")
    .trim();

  const tokens = normalizeTokens(streetRaw);
  const baseName = baseStreetName(tokens);
  const lastToken = tokens[tokens.length - 1];
  const hasTypeToken = STREET_TYPES.has(lastToken);

  return {
    number: Number.parseInt(match[1], 10),
    streetRaw,
    streetNormalized: tokens.join(" ").trim(),
    streetBase: baseName,
    hasTypeToken,
  };
}

function matchesRange(addressNumber, rangeType) {
  const normalized = (rangeType || "").toLowerCase();
  if (normalized.includes("odd")) {
    return addressNumber % 2 === 1;
  }
  if (normalized.includes("even")) {
    return addressNumber % 2 === 0;
  }
  return true;
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildDataset(dataArray) {
  const isRangeDataset = dataArray[0] && dataArray[0].length >= 6;
  return dataArray.map((row) => {
    const streetName = normalizeStreetName(row[isRangeDataset ? 3 : 1] || "");
    const baseName = baseStreetName(streetName.split(" "));
    return {
      numFrom: isRangeDataset ? Number.parseInt(row[0], 10) : null,
      numTo: isRangeDataset ? Number.parseInt(row[1], 10) : null,
      rangeType: isRangeDataset ? row[2] || "" : "all",
      streetName,
      streetBase: baseName,
      ward: row[isRangeDataset ? 4 : 3] || "",
      cityCouncil: row[isRangeDataset ? 5 : 2] || "",
      streetNumber: isRangeDataset ? null : String(row[0] || "").trim(),
    };
  });
}

function isExactMatch(row, parsed) {
  if (!row.streetNumber) return false;
  if (parsed.streetNormalized !== row.streetName) return false;
  return String(parsed.number) === row.streetNumber;
}

function isRangeMatch(row, addressNumber) {
  if (Number.isNaN(row.numFrom) || Number.isNaN(row.numTo)) return false;
  return (
    addressNumber >= row.numFrom &&
    addressNumber <= row.numTo &&
    matchesRange(addressNumber, row.rangeType)
  );
}

function findCandidates(parsed, dataset) {
  const hasExactData = dataset.some((row) => row.streetNumber);
  if (hasExactData) {
    const exactMatches = dataset.filter((row) => isExactMatch(row, parsed));
    if (exactMatches.length) {
      return exactMatches;
    }
  }

  if (parsed.hasTypeToken) {
    return dataset.filter((row) => {
      if (parsed.streetNormalized !== row.streetName) return false;
      if (row.streetNumber) {
        return String(parsed.number) === row.streetNumber;
      }
      return isRangeMatch(row, parsed.number);
    });
  }

  return dataset.filter((row) => {
    if (row.streetBase !== parsed.streetBase) return false;
    if (row.streetNumber) {
      return String(parsed.number) === row.streetNumber;
    }
    return isRangeMatch(row, parsed.number);
  });
}

function uniqueCandidatesByStreet(candidates) {
  const seen = new Map();
  candidates.forEach((row) => {
    if (!seen.has(row.streetName)) {
      seen.set(row.streetName, row);
    }
  });
  return Array.from(seen.values());
}

function levenshteinDistance(a, b) {
  const aLen = a.length;
  const bLen = b.length;
  if (!aLen) return bLen;
  if (!bLen) return aLen;
  const matrix = [];
  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return matrix[bLen][aLen];
}

function findClosestCandidates(parsed, dataset) {
  const nameKey = parsed.streetBase || parsed.streetNormalized;
  if (!nameKey) {
    return [];
  }

  const filtered = dataset.filter((row) => {
    if (row.streetNumber) {
      return String(parsed.number) === row.streetNumber;
    }
    return isRangeMatch(row, parsed.number);
  });

  if (!filtered.length) {
    return [];
  }

  const unique = uniqueCandidatesByStreet(filtered);
  let bestDistance = Number.POSITIVE_INFINITY;
  const best = [];

  unique.forEach((row) => {
    const compareKey = row.streetBase || row.streetName;
    const distance = levenshteinDistance(nameKey, compareKey);
    if (distance < bestDistance) {
      bestDistance = distance;
      best.length = 0;
      best.push(row);
    } else if (distance === bestDistance) {
      best.push(row);
    }
  });

  const maxLen = Math.max(nameKey.length, 1);
  const threshold = Math.max(2, Math.round(maxLen * 0.3));
  if (bestDistance > threshold) {
    return [];
  }
  return best;
}

const COUNCILOR_BY_DISTRICT = {
  "1": "Marty Nave",
  "2": "Donna Moore",
  "3": "Corey Williams",
  "4": "Patrona Jones-Rowser",
  "5": "Jimmy Monto",
};

function getCouncilorName(district) {
  return COUNCILOR_BY_DISTRICT[district] || "";
}

function toWholeNumber(value) {
  if (value == null) return "";
  const s = String(value).trim();
  const m = s.match(/\d+/);
  return m ? m[0] : "";
}

async function loadStreetData() {
  if (dataLoaded) {
    return;
  }

  const embeddedPrimary = window.STREET_DATA_V2;
  const embeddedBackup =
    window.STREET_DATA ?? (typeof STREET_DATA !== "undefined" ? STREET_DATA : null);

  if (Array.isArray(embeddedPrimary)) {
    streetData = buildDataset(embeddedPrimary);
    dataLoaded = true;
  }

  if (Array.isArray(embeddedBackup)) {
    streetDataBackup = buildDataset(embeddedBackup);
    dataLoaded = true;
  }

  if (dataLoaded) {
    dataLoaded = true;
    return;
  }

  const response = await fetch("street_data.csv");
  if (!response.ok) {
    throw new Error("Unable to load street_data.csv");
  }

  const text = await response.text();
  const rows = parseCsv(text);
  const headers = rows.shift();
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));

  streetData = rows
    .map((row) => {
      const streetName = normalizeStreetName(row[index["Street Name"]] || "");
      const baseName = baseStreetName(streetName.split(" "));
      return {
        numFrom: Number.parseInt(row[index["Num From"]], 10),
        numTo: Number.parseInt(row[index["Num To"]], 10),
        rangeType: row[index["Range Type"]] || "",
        streetName,
        streetBase: baseName,
        ward: row[index["Ward"]] || "",
        cityCouncil: row[index["City Council"]] || "",
        streetNumber: null,
      };
    })
    .filter((row) => row.streetName);

  dataLoaded = true;
}

function clearOutput() {
  if (results) {
    results.innerHTML = "";
  }
}

function addLine(html) {
  if (!results) return;
  const div = document.createElement("div");
  div.className = "result";
  div.innerHTML = html;
  results.appendChild(div);
}

function handleSearch() {
  const term = (input?.value || "").trim();
  clearOutput();

  if (!term) {
    addLine("<strong>Type an address</strong> (example: <em>201 E Jefferson St</em>).");
    return;
  }

  loadStreetData()
    .then(() => {
      const parsed = parseAddress(term);
      if (!parsed) {
        addLine(
          "<strong>Please include a house number</strong> (example: <em>201 E Jefferson St</em>)."
        );
        return;
      }

      const primaryCandidates = streetData.length ? findCandidates(parsed, streetData) : [];
      const backupCandidates = primaryCandidates.length
        ? primaryCandidates
        : (streetDataBackup.length ? findCandidates(parsed, streetDataBackup) : []);
      const candidates = uniqueCandidatesByStreet(backupCandidates);

      if (!candidates.length) {
        const combined = streetData.concat(streetDataBackup);
        const close = findClosestCandidates(parsed, combined);
        if (close.length) {
          addLine("<strong>No exact match.</strong> Did you mean:");
          close.forEach((row) => {
            addLine(`• ${titleCase(row.streetName)} (District ${toWholeNumber(row.cityCouncil)})`);
          });
          return;
        }
        addLine("<strong>No match found</strong> for that address.");
        return;
      }

      candidates.forEach((row) => {
        const districtNum = toWholeNumber(row.cityCouncil).replace(/^0+/, "");
        const wardNum = toWholeNumber(row.ward).replace(/^0+/, "");
        const councilor = getCouncilorName(districtNum);
        addLine(
          `<strong>${parsed.number} ${titleCase(row.streetName)}</strong><br/>District <strong>${districtNum}</strong>, Ward <strong>${wardNum}</strong><br/>Councilor: <strong>${councilor}</strong>`
        );
      });
    })
    .catch(() => {
      addLine("<strong>Couldn’t load district data.</strong> Please try again.");
    });
}

if (searchButton) {
  searchButton.addEventListener("click", handleSearch);
}

if (input) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });
}

// UI helpers + live search
function setCurrentDate() {
  const el = document.getElementById("current-date");
  if (!el) return;
  const today = new Date();
  el.textContent = today
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
}

function show(el) {
  if (!el) return;
  el.style.display = "";
}

function hide(el) {
  if (!el) return;
  el.style.display = "none";
}

function clearMessages() {
  if (suggestionMessage) {
    suggestionMessage.textContent = "";
    hide(suggestionMessage);
  }
  if (noResults) {
    noResults.textContent = "";
    hide(noResults);
  }
  if (loadError) {
    loadError.textContent = "";
    hide(loadError);
  }
}

function clearTable() {
  if (resultsBody) resultsBody.innerHTML = "";
}

function clearSpotlight() {
  if (!spotlight) return;
  if (spotlightDistrict) spotlightDistrict.textContent = "";
  if (spotlightWard) spotlightWard.textContent = "";
  if (spotlightAddress) spotlightAddress.textContent = "";
  if (spotlightCouncilor) spotlightCouncilor.textContent = "";
  hide(spotlight);
}

function showSpotlight(match, parsed) {
  if (!spotlight || !match) return;

  const districtNum = toWholeNumber(match.cityCouncil).replace(/^0+/, "");
  const wardNum = toWholeNumber(match.ward).replace(/^0+/, "");
  const councilorName = getCouncilorName(districtNum) || "";

  const streetDisplay = titleCase(match.streetName || parsed?.streetNormalized || "");
  const addressDisplay = `${parsed?.number || ""} ${streetDisplay}`.trim();

  if (spotlightDistrict) {
    spotlightDistrict.textContent = districtNum ? `DISTRICT ${districtNum}` : "DISTRICT";
  }
  if (spotlightWard) {
    spotlightWard.textContent = wardNum || "";
  }
  if (spotlightAddress) {
    spotlightAddress.textContent = addressDisplay;
  }
  if (spotlightCouncilor) {
    spotlightCouncilor.textContent = councilorName || "";
  }

  show(spotlight);
}

function formatRangeAddress(row) {
 
  let numberPart = "";
  if (row.streetNumber) {
    numberPart = row.streetNumber;
  } else if (
    row.numFrom !== null &&
    row.numTo !== null &&
    !Number.isNaN(row.numFrom) &&
    !Number.isNaN(row.numTo)
  ) {
    numberPart = row.numFrom === row.numTo ? String(row.numFrom) : `${row.numFrom}-${row.numTo}`;
  }

  if (
    !row.streetNumber &&
    row.rangeType &&
    String(row.rangeType).trim() &&
    String(row.rangeType).toLowerCase() !== "all"
  ) {
    const t = String(row.rangeType).trim();
    numberPart += ` (${t.charAt(0).toUpperCase()}${t.slice(1).toLowerCase()})`;
  }

  const street = titleCase(row.streetName || "");
  return `${numberPart} ${street}`.trim();
}

function renderTableV4(rows, parsed = null, opts = {}) {
  const { isSuggestion = false } = opts;

  clearTable();
  clearMessages();
  clearSpotlight();

  if (!rows || !rows.length) {
    if (noResults) {
      noResults.textContent = parsed ? "No matches found for that address." : "Start typing an address to see results.";
      show(noResults);
    }
    return;
  }

  // Suggestion banner
  if (isSuggestion || (parsed && rows.length > 1)) {
    if (suggestionMessage) {
      suggestionMessage.textContent = isSuggestion
        ? "No exact match. Did you mean one of these?"
        : "Multiple matches found. Check the address/range that matches your location.";
      show(suggestionMessage);
    }
  }

  if (parsed && rows.length === 1) {
    showSpotlight(rows[0], parsed);
  }

  // Populate table
  if (!resultsBody) return;
  rows.forEach((row) => {
    const districtNum = toWholeNumber(row.cityCouncil).replace(/^0+/, "");
    const wardNum = toWholeNumber(row.ward).replace(/^0+/, "");
    const councilorName = getCouncilorName(districtNum) || "";
    const addressStr = formatRangeAddress(row);

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${addressStr}</td><td>${districtNum || ""}</td><td>${wardNum || ""}</td><td>${councilorName || ""}</td>`;
    resultsBody.appendChild(tr);
  });
}

// street suggestions
let __V4_INDEX_BUILT__ = false;
let __V4_STREETS__ = [];
let __V4_ACTIVE_INDEX__ = -1;

function buildTypeaheadIndex() {
  if (__V4_INDEX_BUILT__) return;
  const combined = streetData.concat(streetDataBackup);
  const seen = new Set();
  const out = [];
  combined.forEach((row) => {
    const name = titleCase(row.streetName || "").trim();
    if (!name) return;
    if (seen.has(name)) return;
    seen.add(name);
    out.push(name);
  });
  out.sort((a, b) => a.localeCompare(b));
  __V4_STREETS__ = out;
  __V4_INDEX_BUILT__ = true;
}

function closeTypeahead() {
  if (!typeahead) return;
  typeahead.innerHTML = "";
  hide(typeahead);
  __V4_ACTIVE_INDEX__ = -1;
}

function openTypeahead(items, onPick) {
  if (!typeahead) return;
  if (!items.length) {
    closeTypeahead();
    return;
  }
  typeahead.innerHTML = items
    .map((t, idx) => `<div class="typeahead-item" data-idx="${idx}">${t}</div>`)
    .join("");
  show(typeahead);
  __V4_ACTIVE_INDEX__ = -1;

  // Click handling
  Array.from(typeahead.querySelectorAll(".typeahead-item")).forEach((el) => {
    el.addEventListener("mousedown", (e) => {
    
      e.preventDefault();
      const text = el.textContent || "";
      onPick(text);
      closeTypeahead();
    });
  });
}

function setActiveTypeaheadIndex(nextIndex) {
  if (!typeahead) return;
  const items = Array.from(typeahead.querySelectorAll(".typeahead-item"));
  items.forEach((el) => el.classList.remove("active"));
  if (nextIndex >= 0 && nextIndex < items.length) {
    items[nextIndex].classList.add("active");
    __V4_ACTIVE_INDEX__ = nextIndex;
  
    items[nextIndex].scrollIntoView({ block: "nearest" });
  }
}

function getStreetSearchTerm(raw) {
  const t = (raw || "").trim();
  if (!t) return "";

  const m = t.match(/^(\d+)\s+(.*)$/);
  if (m) return m[2].trim();
  return t;
}

function computeStreetSuggestions(term, max = 8) {
  const s = normalizeStreetName(getStreetSearchTerm(term));
  if (!s || s.length < 2) return [];

  const sLower = s.toLowerCase();
  const out = [];
  for (let i = 0; i < __V4_STREETS__.length; i += 1) {
    const street = __V4_STREETS__[i];
    const n = normalizeStreetName(street);
    if (n.startsWith(sLower) || n.includes(` ${sLower}`)) {
      out.push(street);
      if (out.length >= max) break;
    }
  }
  return out;
}

function debounce(fn, wait = 120) {
  let t = null;
  return (...args) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), wait);
  };
}

// Live search 
async function doSearchV4() {
  const term = (v4Input?.value || "").trim();

  clearMessages();
  clearSpotlight();

  if (input && v4Input && input !== v4Input) {
    input.value = term;
  }

  if (!term) {
    clearTable();
    closeTypeahead();
    return;
  }

  try {
    await loadStreetData();
  } catch (e) {
    clearTable();
    closeTypeahead();
    if (loadError) {
      loadError.textContent = "Couldn’t load district data. Please try again.";
      show(loadError);
    }
    return;
  }

  buildTypeaheadIndex();

  const suggestions = computeStreetSuggestions(term);
  openTypeahead(suggestions, (picked) => {
    const m = term.match(/^(\d+)\s+/);
    v4Input.value = m ? `${m[1]} ${picked}` : picked;
    doSearchV4();
  });

  const parsed = parseAddress(term);
  if (!parsed) {
    const normalizedTerm = normalizeStreetName(getStreetSearchTerm(term));
    const combined = streetDataBackup.concat(streetData);
    const matches = combined
      .filter((row) => (row.streetName || "").includes(normalizedTerm) || (row.streetBase || "").includes(normalizedTerm))
      .slice(0, 50);
    renderTableV4(uniqueCandidatesByStreet(matches));
    return;
  }

  // Find matches - address dataset preferred; then ranges
  const primaryCandidates = streetData.length ? findCandidates(parsed, streetData) : [];
  const backupCandidates = primaryCandidates.length
    ? primaryCandidates
    : (streetDataBackup.length ? findCandidates(parsed, streetDataBackup) : []);
  const candidates = uniqueCandidatesByStreet(backupCandidates);

  if (!candidates.length) {
    const combined = streetData.concat(streetDataBackup);
    const closeCandidates = findClosestCandidates(parsed, combined);
    if (closeCandidates.length) {
      renderTableV4(closeCandidates, parsed, { isSuggestion: true });
      return;
    }
    renderTableV4([], parsed);
    if (noResults) {
      noResults.textContent = `No results found for "${term}".`;
      show(noResults);
    }
    return;
  }

  renderTableV4(candidates, parsed, { isSuggestion: candidates.length > 1 });
}

const doSearchV4Debounced = debounce(doSearchV4, 120);

function attachV4Handlers() {
  if (!v4Input) return;

  // Live search
  v4Input.addEventListener("input", () => doSearchV4Debounced());

  v4Input.addEventListener("keydown", (e) => {
    if (!typeahead || typeahead.style.display === "none") return;
    const items = Array.from(typeahead.querySelectorAll(".typeahead-item"));
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(__V4_ACTIVE_INDEX__ + 1, items.length - 1);
      setActiveTypeaheadIndex(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(__V4_ACTIVE_INDEX__ - 1, 0);
      setActiveTypeaheadIndex(next);
    } else if (e.key === "Enter") {
      if (__V4_ACTIVE_INDEX__ >= 0 && __V4_ACTIVE_INDEX__ < items.length) {
        e.preventDefault();
        const picked = items[__V4_ACTIVE_INDEX__].textContent || "";
        const term = (v4Input.value || "").trim();
        const m = term.match(/^(\d+)\s+/);
        v4Input.value = m ? `${m[1]} ${picked}` : picked;
        closeTypeahead();
        doSearchV4();
      }
    } else if (e.key === "Escape") {
      closeTypeahead();
    }
  });

  // Click-away to close
  document.addEventListener("mousedown", (e) => {
    if (!typeahead || typeahead.style.display === "none") return;
    const target = e.target;
    if (target === typeahead || typeahead.contains(target) || target === v4Input) return;
    closeTypeahead();
  });

  // Initial state
  clearTable();
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentDate();
  attachV4Handlers();
});

(() => {
  const input =
    document.querySelector("#search-input") || document.querySelector("#address");
  const searchBtn =
    document.querySelector("#search-btn") || document.querySelector("#search");

  const resultsSection = document.querySelector("#results");
  const resultsBody = document.querySelector("#results-tbody");

  const suggestionMessage = document.querySelector("#suggestion-message");
  const noResults = document.querySelector("#no-results");
  const loadError = document.querySelector("#load-error");

  const spotlight = document.querySelector("#spotlight");
  const spotlightDistrict = document.querySelector("#spotlight-district");
  const spotlightWard = document.querySelector("#spotlight-ward");
  const spotlightAddress = document.querySelector("#spotlight-address");
  const spotlightTitleName = document.querySelector("#spotlight-title-name");
  const spotlightContactLink = document.querySelector("#spotlight-contact-link");

  if (!input) return;

  const COUNCILOR_META_BY_DISTRICT = {
    "1": {
      name: "Marino L. Nave",
      url: "https://www.syr.gov/Departments/Common-Council/Councilors/Councilor-District-1",
    },
    "2": {
      name: "Donna Moore",
      url: "https://www.syr.gov/Departments/Common-Council/Councilors/Councilor-District-2",
    },
    "3": {
      name: "Corey J. Williams",
      url: "https://www.syr.gov/Departments/Common-Council/Councilors/Councilor-District-3",
    },
    "4": {
      name: "Patrona Jones-Rowser",
      url: "https://www.syr.gov/Departments/Common-Council/Councilors/Councilor-District-4",
    },
    "5": {
      name: "Jimmy Monto",
      url: "https://www.syr.gov/Departments/Common-Council/Councilors/Councilor-District-5",
    },
  };

  function getCouncilorMeta(districtNum) {
    const key = String(districtNum || "").trim();
    return COUNCILOR_META_BY_DISTRICT[key] || { name: "", url: "" };
  }

  function show(el) {
    if (!el) return;
    el.hidden = false;
  }

  function hide(el) {
    if (!el) return;
    el.hidden = true;
  }

  function setBanner(el, text, isError = false) {
    if (!el) return;

    if (!text) {
      el.textContent = "";
      el.classList.remove("error");
      hide(el);
      return;
    }

    el.textContent = text;
    el.classList.toggle("error", !!isError);
    show(el);
  }

  function clearTable() {
    if (resultsBody) resultsBody.innerHTML = "";
  }

  function hideAllBanners() {
    setBanner(suggestionMessage, "");
    setBanner(noResults, "");
    setBanner(loadError, "");
  }

  function showResultsSection() {
    if (resultsSection) show(resultsSection);
  }

  function hideResultsSection() {
    if (resultsSection) hide(resultsSection);
  }

  function hideSpotlight() {
    if (!spotlight) return;

    if (spotlightDistrict) spotlightDistrict.textContent = "";
    if (spotlightWard) spotlightWard.textContent = "";
    if (spotlightAddress) spotlightAddress.textContent = "";
    if (spotlightTitleName) spotlightTitleName.textContent = "";

    if (spotlightContactLink) {
      spotlightContactLink.href =
        "https://www.syr.gov/Departments/Common-Council/Councilors";
      spotlightContactLink.textContent = "Contact";
      spotlightContactLink.style.display = "none";
    }

    hide(spotlight);
  }

  const TOKEN_MAP = {
    st: "street",
    street: "street",
    rd: "road",
    road: "road",
    ave: "avenue",
    avenue: "avenue",
    av: "avenue",
    aven: "avenue",
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

  const DISPLAY_ABBR = {
    street: "St",
    road: "Rd",
    avenue: "Ave",
    boulevard: "Blvd",
    drive: "Dr",
    lane: "Ln",
    court: "Ct",
    place: "Pl",
    terrace: "Ter",
    parkway: "Pkwy",
    highway: "Hwy",
    circle: "Cir",
    square: "Sq",
    north: "N",
    south: "S",
    east: "E",
    west: "W",
    northeast: "NE",
    northwest: "NW",
    southeast: "SE",
    southwest: "SW",
  };

  function normalizeOrdinal(token) {
    if (ORDINAL_MAP[token]) return ORDINAL_MAP[token];
    return token.replace(/(\d+)(st|nd|rd|th)$/, (_, num) => {
      return ORDINAL_MAP[`${num}th`] || num;
    });
  }

  function normalizeTokens(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,]/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => normalizeOrdinal(TOKEN_MAP[t] || t));
  }

  function normalizeStreetName(value) {
    return normalizeTokens(value).join(" ").trim();
  }

  function baseStreetName(tokens) {
    if (!tokens.length) return "";
    const last = tokens[tokens.length - 1];
    if (STREET_TYPES.has(last)) return tokens.slice(0, -1).join(" ").trim();
    return tokens.join(" ").trim();
  }

  function titleCaseStreetFromNormalized(streetNorm) {
    const tokens = String(streetNorm || "")
      .split(/\s+/)
      .filter(Boolean);

    return tokens
      .map((t) => {
        const lower = t.toLowerCase();
        if (DISPLAY_ABBR[lower]) return DISPLAY_ABBR[lower];
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  function toWholeNumber(value) {
    if (value == null) return "";
    const s = String(value).trim();
    const m = s.match(/\d+/);
    return m ? m[0] : "";
  }

  function cleanDistrict(value) {
    return toWholeNumber(value).replace(/^0+/, "") || "";
  }

  function cleanWard(value) {
    return toWholeNumber(value).replace(/^0+/, "") || "";
  }

  function parseNumberFirst(raw) {
    const t = String(raw || "").trim();
    if (!t) return null;

    const m = t.match(/^(\d+)\s*(.*)$/);
    if (!m) return null;

    const number = Number.parseInt(m[1], 10);
    const restRaw = String(m[2] || "")
      .replace(/\b(apt|unit|suite|#)\b.*$/i, "")
      .trim();

    const tokens = normalizeTokens(restRaw);
    const streetNormalized = tokens.join(" ").trim();
    const streetBase = baseStreetName(tokens);
    const hasTypeToken = tokens.length
      ? STREET_TYPES.has(tokens[tokens.length - 1])
      : false;

    return {
      number,
      streetRaw: restRaw,
      streetNormalized,
      streetBase,
      hasTypeToken,
      hasStreet: !!streetNormalized,
    };
  }

  function parseStreetOnly(raw) {
    const t = String(raw || "").trim();
    if (!t) return null;

    const tokens = normalizeTokens(t);
    const streetNormalized = tokens.join(" ").trim();
    if (!streetNormalized) return null;

    const streetBase = baseStreetName(tokens);
    const hasTypeToken = tokens.length
      ? STREET_TYPES.has(tokens[tokens.length - 1])
      : false;

    return {
      streetRaw: t,
      streetNormalized,
      streetBase,
      hasTypeToken,
    };
  }

  let dataLoaded = false;
  let rangeRows = [];
  let exactRows = [];

  function matchesOddEven(addressNumber, rangeType) {
    const t = String(rangeType || "").toLowerCase().trim();
    if (t === "o" || t.includes("odd")) return addressNumber % 2 === 1;
    if (t === "e" || t.includes("even")) return addressNumber % 2 === 0;
    return true;
  }

  function parseNumberSpec(rawSpec) {
    const s = String(rawSpec || "").trim();
    if (!s) return null;

    const firstNum = s.match(/^(\d+)/);
    if (!firstNum) return null;

    const startStr = firstNum[1];
    const dash = s.match(/^(\d+)\s*-\s*([0-9]+)\b/);

    if (!dash) {
      const n = Number.parseInt(startStr, 10);
      return Number.isNaN(n) ? null : { start: n, end: n };
    }

    const start = Number.parseInt(dash[1], 10);
    let endStr = dash[2];

    if (endStr.length < dash[1].length) {
      const prefix = dash[1].slice(0, dash[1].length - endStr.length);
      endStr = `${prefix}${endStr}`;
    }

    const end = Number.parseInt(endStr, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;

    return { start: Math.min(start, end), end: Math.max(start, end) };
  }

  function loadData() {
    if (dataLoaded) return true;

    const rawRanges = window.STREET_DATA;
    const rawExact = window.STREET_DATA_V2;

    if (!Array.isArray(rawRanges)) {
      setBanner(
        loadError,
        "Data could not be loaded....",
        true
      );
      showResultsSection();
      dataLoaded = false;
      return false;
    }

    rangeRows = rawRanges
      .map((row) => {
        const numFrom = Number.parseInt(row[0], 10);
        const numTo = Number.parseInt(row[1], 10);
        const rangeType = String(row[2] || "").trim();
        const streetRaw = String(row[3] || "").trim();

        const ward = cleanWard(row[4]);
        const district = cleanDistrict(row[5]);

        const streetNorm = normalizeStreetName(streetRaw);
        const streetBase = baseStreetName(streetNorm.split(" "));

        if (!streetNorm) return null;
        if (Number.isNaN(numFrom) || Number.isNaN(numTo)) return null;

        return {
          kind: "range",
          numFrom,
          numTo,
          rangeType,
          streetNorm,
          streetBase,
          ward,
          district,
        };
      })
      .filter(Boolean);

    exactRows = Array.isArray(rawExact)
      ? rawExact
          .map((row) => {
            const spec = String(row[0] || "").trim();
            const streetRaw = String(row[1] || "").trim();
            const district = cleanDistrict(row[2]);
            const ward = cleanWard(row[3]);

            const numberSpec = parseNumberSpec(spec);
            if (!numberSpec) return null;

            const streetNorm = normalizeStreetName(streetRaw);
            const streetBase = baseStreetName(streetNorm.split(" "));

            if (!streetNorm) return null;

            return {
              kind: "exact",
              numberSpec,
              streetNorm,
              streetBase,
              ward,
              district,
            };
          })
          .filter(Boolean)
      : [];

    dataLoaded = true;
    setBanner(loadError, "");
    return true;
  }

  function rangeRowMatchesNumber(row, n) {
    if (n < row.numFrom || n > row.numTo) return false;
    return matchesOddEven(n, row.rangeType);
  }

  function exactRowMatchesNumber(row, n) {
    return n >= row.numberSpec.start && n <= row.numberSpec.end;
  }

  function streetMatchesRow(streetQuery, row) {
    if (!streetQuery || !row) return false;

    if (streetQuery.hasTypeToken) {
      return streetQuery.streetNormalized === row.streetNorm;
    }

    if (streetQuery.streetBase) {
      return streetQuery.streetBase === row.streetBase;
    }

    return false;
  }

  function dedupe(rows) {
    const out = [];
    const seen = new Set();

    for (const r of rows) {
      const k = `${r.streetNorm}|${r.district}|${r.ward}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }

    return out;
  }

  function findDirectCandidates(parsed) {
    const rangeHits = rangeRows.filter(
      (r) =>
        rangeRowMatchesNumber(r, parsed.number) && streetMatchesRow(parsed, r)
    );
    if (rangeHits.length) return dedupe(rangeHits);

    const exactHits = exactRows.filter(
      (r) =>
        exactRowMatchesNumber(r, parsed.number) && streetMatchesRow(parsed, r)
    );
    return dedupe(exactHits);
  }

  function computeNumberSuggestions(parsed, limit = 200) {
    const n = parsed.number;

    const fragNorm = normalizeStreetName(parsed.streetRaw || "");
    const fragTokens = fragNorm.split(/\s+/).filter(Boolean);
    const fragBase = baseStreetName(fragTokens);

    const hits = [];

    for (const r of rangeRows) {
      if (!rangeRowMatchesNumber(r, n)) continue;

      if (fragNorm) {
        const ok =
          r.streetNorm.startsWith(fragNorm) ||
          r.streetNorm.includes(fragNorm) ||
          (fragBase &&
            (r.streetBase === fragBase || r.streetBase.includes(fragBase)));

        if (!ok) continue;
      }

      hits.push(r);
      if (hits.length >= limit) break;
    }

    const unique = dedupe(hits);
    unique.sort((a, b) =>
      titleCaseStreetFromNormalized(a.streetNorm).localeCompare(
        titleCaseStreetFromNormalized(b.streetNorm)
      )
    );

    return unique;
  }

  function computeStreetOnlySuggestions(streetQuery, limit = 200) {
    const fragNorm = normalizeStreetName(streetQuery.streetRaw || "");
    const fragTokens = fragNorm.split(/\s+/).filter(Boolean);
    const fragBase = baseStreetName(fragTokens);

    const hits = [];

    for (const r of rangeRows) {
      if (!fragNorm) continue;

      const ok =
        r.streetNorm.startsWith(fragNorm) ||
        r.streetNorm.includes(fragNorm) ||
        (fragBase &&
          (r.streetBase === fragBase || r.streetBase.includes(fragBase)));

      if (!ok) continue;

      hits.push(r);
      if (hits.length >= limit) break;
    }

    const unique = dedupe(hits);
    unique.sort((a, b) =>
      titleCaseStreetFromNormalized(a.streetNorm).localeCompare(
        titleCaseStreetFromNormalized(b.streetNorm)
      )
    );

    return unique;
  }

  function formatAddress(number, row) {
    return `${number} ${titleCaseStreetFromNormalized(row.streetNorm || "")}`.trim();
  }

  function formatStreetOnly(row) {
    return titleCaseStreetFromNormalized(row.streetNorm || "");
  }

  function renderSpotlight(row, number) {
    hideAllBanners();
    hideResultsSection();
    clearTable();

    const districtNum = cleanDistrict(row.district);
    const wardNum = cleanWard(row.ward);

    if (spotlightDistrict) spotlightDistrict.textContent = districtNum || "—";
    if (spotlightWard) spotlightWard.textContent = wardNum || "—";
    if (spotlightAddress) spotlightAddress.textContent = formatAddress(number, row);

    const meta = getCouncilorMeta(districtNum);
    const councilorName = meta.name || "Common Council";
    const councilorUrl =
      meta.url || "https://www.syr.gov/Departments/Common-Council/Councilors";

    if (spotlightTitleName) spotlightTitleName.textContent = councilorName;

    if (spotlightContactLink) {
      spotlightContactLink.href = councilorUrl;
      spotlightContactLink.textContent = `Contact ${councilorName}`;
      spotlightContactLink.style.display = "inline-flex";
    }

    show(spotlight);
  }

  function renderTableSelect(rows, number, bannerText) {
    hideSpotlight();
    hideAllBanners();
    clearTable();

    setBanner(suggestionMessage, bannerText || "");

    if (!rows || !rows.length) {
      hideResultsSection();
      return;
    }

    for (const row of rows) {
      const districtNum = cleanDistrict(row.district);
      const wardNum = cleanWard(row.ward);
      const meta = getCouncilorMeta(districtNum);
      const councilorName = meta.name || "—";

      const tr = document.createElement("tr");
      tr.tabIndex = 0;

      const addrTd = document.createElement("td");
      addrTd.textContent = formatAddress(number, row);

      const distTd = document.createElement("td");
      distTd.textContent = districtNum || "";

      const wardTd = document.createElement("td");
      wardTd.textContent = wardNum || "";

      const councilTd = document.createElement("td");
      councilTd.innerHTML = meta.url
        ? `<a class="councilor-link" href="${meta.url}" target="_blank" rel="noopener">${councilorName}</a>`
        : councilorName;

      tr.appendChild(addrTd);
      tr.appendChild(distTd);
      tr.appendChild(wardTd);
      tr.appendChild(councilTd);

      const pick = () => {
        const streetDisplay = titleCaseStreetFromNormalized(row.streetNorm || "");
        input.value = `${number} ${streetDisplay}`.trim();
        renderSpotlight(row, number);
      };

      tr.addEventListener("click", pick);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          pick();
        }
      });

      resultsBody.appendChild(tr);
    }

    showResultsSection();
  }

  function renderTableBrowse(rows, bannerText) {
    hideSpotlight();
    hideAllBanners();
    clearTable();

    setBanner(suggestionMessage, bannerText || "");

    if (!rows || !rows.length) {
      hideResultsSection();
      return;
    }

    for (const row of rows) {
      const districtNum = cleanDistrict(row.district);
      const wardNum = cleanWard(row.ward);
      const meta = getCouncilorMeta(districtNum);
      const councilorName = meta.name || "—";

      const tr = document.createElement("tr");

      const addrTd = document.createElement("td");
      addrTd.textContent = formatStreetOnly(row);

      const distTd = document.createElement("td");
      distTd.textContent = districtNum || "";

      const wardTd = document.createElement("td");
      wardTd.textContent = wardNum || "";

      const councilTd = document.createElement("td");
      councilTd.innerHTML = meta.url
        ? `<a class="councilor-link" href="${meta.url}" target="_blank" rel="noopener">${councilorName}</a>`
        : councilorName;

      tr.appendChild(addrTd);
      tr.appendChild(distTd);
      tr.appendChild(wardTd);
      tr.appendChild(councilTd);

      resultsBody.appendChild(tr);
    }

    showResultsSection();
  }

  function updateUI() {
    const term = String(input.value || "").trim();

    hideAllBanners();
    hideSpotlight();
    clearTable();

    if (!term) {
      hideResultsSection();
      return;
    }

    if (!loadData()) return;

    const parsed = parseNumberFirst(term);

    if (parsed) {
      if (!parsed.hasStreet) {
        const rows = computeNumberSuggestions(parsed, 200);
        if (rows.length) {
          renderTableSelect(
            rows,
            parsed.number,
            "Keep typing the street name to narrow the list."
          );
          return;
        }

        hideResultsSection();
        setBanner(noResults, "No matches found. Check the address and try again.", true);
        showResultsSection();
        return;
      }

      const direct = findDirectCandidates(parsed);

      if (direct.length === 1) {
        renderSpotlight(direct[0], parsed.number);
        return;
      }

      if (direct.length > 1) {
        renderTableSelect(
          direct,
          parsed.number,
          "Select your address from the list."
        );
        return;
      }

      if ((parsed.streetRaw || "").trim().length < 2) {
        hideResultsSection();
        setBanner(suggestionMessage, "Keep typing the street name to see matches.");
        showResultsSection();
        return;
      }

      const suggestions = computeNumberSuggestions(parsed, 200);
      if (suggestions.length) {
        renderTableSelect(
          suggestions,
          parsed.number,
          "Select your address from the list."
        );
        return;
      }

      hideResultsSection();
      setBanner(noResults, "No matches found. Check the address and try again.", true);
      showResultsSection();
      return;
    }

    const streetQuery = parseStreetOnly(term);
    if (!streetQuery) {
      hideResultsSection();
      setBanner(
        noResults,
        "Enter a street number and street name.",
        true
      );
      showResultsSection();
      return;
    }

    const streetRows = computeStreetOnlySuggestions(streetQuery, 200);
    if (streetRows.length) {
      renderTableBrowse(streetRows, "Add a house number");
      return;
    }

    hideResultsSection();
    setBanner(noResults, "No matches found. Check the street name and try again.", true);
    showResultsSection();
  }

  function debounce(fn, wait = 120) {
    let t = null;
    return (...args) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), wait);
    };
  }

  const updateUIDebounced = debounce(updateUI, 120);

  input.addEventListener("input", () => updateUIDebounced());

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateUI();
    }
  });

  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      updateUI();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    hideAllBanners();
    hideSpotlight();
    hideResultsSection();
    loadData();
  });
})();
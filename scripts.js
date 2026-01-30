const input = document.querySelector("#address");
const results = document.querySelector("#results");
const searchButton = document.querySelector("#search");

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

function normalizeOrdinal(token) {
  if (ORDINAL_MAP[token]) {
    return ORDINAL_MAP[token];
  }
  return token.replace(/(\d+)(st|nd|rd|th)$/, (_, num) => {
    return ORDINAL_MAP[`${num}th`] || num;
  });
}

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

function formatAddress(number, streetRaw) {
  return `${number} ${streetRaw}`;
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStreetFromMatch(parsed, match) {
  const streetName = match ? match.streetName : parsed.streetNormalized;
  return titleCase(streetName);
}

function toWholeNumber(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) ? "" : String(parsed);
}

function buildDataset(embeddedData) {
  const isRangeDataset = embeddedData[0] && embeddedData[0].length >= 6;
  return embeddedData.map((row) => {
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
        rangeType: row[index["RangeType"]] || "",
        streetName,
        streetBase: baseName,
        ward: row[index["Ward"]] || "",
        cityCouncil: row[index["CityCouncilCode"]] || "",
        streetNumber: null,
      };
    })
    .filter((row) => row.streetName);

  dataLoaded = true;
}

function isRangeMatch(row, addressNumber) {
  if (Number.isNaN(row.numFrom) || Number.isNaN(row.numTo)) {
    return false;
  }
  if (addressNumber < row.numFrom || addressNumber > row.numTo) {
    return false;
  }
  return matchesRange(addressNumber, row.rangeType);
}

function isExactMatch(row, parsed) {
  if (!row.streetNumber) {
    return false;
  }
  if (parsed.streetNormalized !== row.streetName) {
    return false;
  }
  return String(parsed.number) === row.streetNumber;
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
      if (parsed.streetNormalized !== row.streetName) {
        return false;
      }
      if (row.streetNumber) {
        return String(parsed.number) === row.streetNumber;
      }
      return isRangeMatch(row, parsed.number);
    });
  }

  return dataset.filter((row) => {
    if (row.streetBase !== parsed.streetBase) {
      return false;
    }
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
  if (aLen === 0) {
    return bLen;
  }
  if (bLen === 0) {
    return aLen;
  }

  const prev = new Array(bLen + 1);
  const curr = new Array(bLen + 1);
  for (let j = 0; j <= bLen; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    curr[0] = i;
    const aChar = a.charAt(i - 1);
    for (let j = 1; j <= bLen; j += 1) {
      const cost = aChar === b.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= bLen; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[bLen];
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

function setResultsText(message) {
  results.textContent = message;
}

function setResultsOptions(message, parsed, candidates) {
  const items = candidates
    .map((row) => {
      const street = formatStreetFromMatch(parsed, row);
      const district = toWholeNumber(row.cityCouncil).replace(/^0+/, "");
      const ward = toWholeNumber(row.ward).replace(/^0+/, "");
      const councilor = getCouncilorName(district);
      const suffixParts = [];
      if (district) {
        suffixParts.push(`District ${district}`);
      }
      if (ward) {
        suffixParts.push(`Ward ${ward}`);
      }
      if (councilor) {
        suffixParts.push(`Councilor ${councilor}`);
      }
      const suffix = suffixParts.length ? ` — ${suffixParts.join(", ")}` : "";
      return `<li class="results-item"><span class="results-address">${formatAddress(parsed.number, street)}</span>${suffix}</li>`;
    })
    .join("");

  results.innerHTML = `
    <div class="results-banner">${message}</div>
    <ul class="results-list">${items}</ul>
  `;
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

async function handleSearch() {
  const address = input.value.trim();
  if (!address) {
    setResultsText("Enter a Syracuse address to see district details.");
    return;
  }

  setResultsText("Searching the district database...");

  try {
    await loadStreetData();
  } catch (error) {
    setResultsText("Unable to load district data. Check street_data.csv.");
    return;
  }

  const parsed = parseAddress(address);
  if (!parsed) {
    setResultsText("Enter a street number and street name.");
    return;
  }

  const primaryCandidates = findCandidates(parsed, streetData);
  const backupCandidates = primaryCandidates.length
    ? primaryCandidates
    : findCandidates(parsed, streetDataBackup);
  const candidates = uniqueCandidatesByStreet(backupCandidates);

  if (!candidates.length) {
    const combined = streetData.concat(streetDataBackup);
    const closeCandidates = findClosestCandidates(parsed, combined);
    if (closeCandidates.length) {
      setResultsOptions(
        "No exact match, did you mean one of the options below?",
        parsed,
        closeCandidates
      );
      return;
    }
    setResultsText("No results found for this address.");
    return;
  }

  if (candidates.length > 1) {
    setResultsOptions(
      "No exact match, did you mean one of the options below?",
      parsed,
      candidates
    );
    return;
  }

  const match = candidates[0];
  const formattedStreet = formatStreetFromMatch(parsed, match);
  const formatted = formatAddress(parsed.number, formattedStreet);
  const district = toWholeNumber(match.cityCouncil).replace(/^0+/, "");
  const ward = toWholeNumber(match.ward).replace(/^0+/, "");
  const councilor = getCouncilorName(district);
  const councilorLine = `Common Councilor: ${councilor || "Unknown"}`;
  setResultsText(
    `${formatted}\nDistrict ${district || "Unknown"}\nWard ${ward || "Unknown"}\n${councilorLine}`
  );
}

searchButton.addEventListener("click", handleSearch);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});

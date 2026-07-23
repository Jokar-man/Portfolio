/** Minimal parser for the flat 4-column ccvi.csv (pgid,lat,lon,iso3) — no quoted fields. */
export async function loadCsv(url) {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [pgid, lat, lon, iso3] = line.split(',');
    rows.push({
      pgid,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      iso3: iso3 ? iso3.trim() : '',
    });
  }

  return rows;
}

/** Deterministic hash (0..1) from a short string, used to give each country a stable hue. */
export function hashToUnit(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

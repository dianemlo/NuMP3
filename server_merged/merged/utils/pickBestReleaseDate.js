function normalizeToISO(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();

  // YYYY
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;

  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // NEW: extract a year if it appears inside a longer string
  const match = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (match) return `${match[1]}-01-01`;

  return null;
}

function pickBestReleaseDate({ musicbrainzDate, spotifyDate, discogsYear }) {
  const candidates = [];

  // 1) MusicBrainz (preferred authority)
  const mb = normalizeToISO(musicbrainzDate);
  if (mb) candidates.push({ source: "musicbrainz", iso: mb });

  // 2) Spotify (fallback)
  const sp = normalizeToISO(spotifyDate);
  if (sp) candidates.push({ source: "spotify", iso: sp });

  // 3) Discogs (optional last-resort backup)
  const dg = normalizeToISO(discogsYear ? String(discogsYear) : null);
  if (dg) candidates.push({ source: "discogs", iso: dg });

  if (!candidates.length) return { releaseDate: null, source: null };

  // Earliest date wins (this is what fixes compilation vs original when MB gives original)
  candidates.sort((a, b) => a.iso.localeCompare(b.iso));

  return { releaseDate: candidates[0].iso, source: candidates[0].source };
}

module.exports = { pickBestReleaseDate };
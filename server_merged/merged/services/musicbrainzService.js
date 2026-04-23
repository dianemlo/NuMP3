const axios = require("axios");
const MB_BASE = "https://musicbrainz.org/ws/2";

function mbHeaders() {
  return {
    "User-Agent": `${process.env.APP_NAME}/${process.env.APP_VERSION} (${process.env.APP_CONTACT})`,
  };
}

function normalizeDate(d) {
  if (!d) return null;
  const s = String(d).trim();
  if (/^\d{4}(-\d{2}){0,2}$/.test(s)) return s;
  const m = s.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? m[1] : null;
}

// Keep this name so enrichSong.js doesn't break
async function musicbrainzSearchRecording({ title, artist }) {
  const query = `recording:"${title}" AND artist:"${artist}"`;

  const recRes = await axios.get(`${MB_BASE}/recording`, {
    params: {
      query,
      fmt: "json",
      limit: 10,
    },
    headers: mbHeaders(),
  });

  const recordings = recRes.data?.recordings || [];
  if (!recordings.length) {
    return { musicbrainzId: null, firstReleaseDate: null, releaseDate: null };
  }

  // best match by score
  const best = recordings
    .slice()
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];

  const firstReleaseDate = normalizeDate(best?.["first-release-date"] || null);

  return {
    musicbrainzId: best?.id || null,
    firstReleaseDate: firstReleaseDate || null,
    // keep releaseDate field for backward compatibility
    releaseDate: firstReleaseDate || null,
  };
}

module.exports = { musicbrainzSearchRecording };
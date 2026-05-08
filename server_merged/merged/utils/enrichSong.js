const { spotifySearchTrack } = require("../services/spotifyService");
const { discogsSearchRelease } = require("../services/discogsService");
const { musicbrainzSearchRecording } = require("../services/musicbrainzService");
const { classifyEra } = require("./era");
const { pickBestReleaseDate } = require("./pickBestReleaseDate");

function toYear(value) {
  if (!value) return null;
  const m = String(value).match(/\b(19\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function buildSpotifyTrackQuery(title, artist) {
  const safeTitle = String(title || "").trim();
  const safeArtist = String(artist || "").trim();

  if (!safeTitle && !safeArtist) return "";
  if (!safeArtist) return safeTitle;
  if (!safeTitle) return safeArtist;

  return `${safeArtist} ${safeTitle}`;
}

async function enrichSong({ title, artist }) {
  const spotifyQuery = buildSpotifyTrackQuery(title, artist);

  const spotifyTrack = spotifyQuery
    ? await spotifySearchTrack(spotifyQuery).catch((err) => {
        console.error("[enrichSong] spotifySearchTrack FAILED", err?.message || err);
        return null;
      })
    : null;

  const discogs = await discogsSearchRelease({ title, artist }).catch((err) => {
    console.error("[enrichSong] discogsSearchRelease FAILED", err?.message || err);
    return null;
  });

  const musicbrainz = await musicbrainzSearchRecording({ title, artist }).catch((err) => {
    console.error("[enrichSong] musicbrainzSearchRecording FAILED", err?.message || err);
    return null;
  });

  const picked = pickBestReleaseDate({
    musicbrainzDate: musicbrainz?.firstReleaseDate || musicbrainz?.releaseDate,
    spotifyDate: spotifyTrack?.album?.release_date,
    discogsYear: discogs?.year,
  });

  const candidates = [
    toYear(musicbrainz?.firstReleaseDate),
    toYear(musicbrainz?.releaseDate),
    toYear(discogs?.year),
    toYear(spotifyTrack?.album?.release_date),
    toYear(picked?.releaseDate),
  ].filter((y) => Number.isFinite(y));

  const originalYear = candidates.length ? Math.min(...candidates) : null;

  const releaseDate = picked?.releaseDate ?? null;
  const releaseDateSource = picked?.source ?? null;

  const spotifyPopularity = spotifyTrack?.popularity ?? null;

  return {
    spotify: spotifyTrack,
    spotifyArtist: null,
    discogs,
    musicbrainz,
    releaseDate,
    releaseDateSource,
    originalYear,
    era: classifyEra(originalYear ?? releaseDate),
    genres: discogs?.genres ?? [],
    styles: discogs?.styles ?? [],
    spotifyPopularity,
    spotifyArtistFollowers: null,
  };
}


module.exports = { enrichSong };
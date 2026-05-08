const Track = require("../models/Track");

const {
  spotifySearchArtist,
  spotifySearchTracks,
} = require("./spotifyService");

const { enrichSong } = require("../utils/enrichSong");
const { classifyEra } = require("../utils/era");

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function normalizeTrackTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\[[^\]]*?\]|\([^\)]*?\)/g, " ")
    .replace(
      /\b(remaster(ed)?|mono|stereo mix|radio edit|edit|version|deluxe|expanded)\b/g,
      " "
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArtistAlias(s) {
  return norm(s)
    .replace(/^the\s+/, "")
    .replace(/^a\s+/, "")
    .replace(/^an\s+/, "")
    .trim();
}

function bestSpotifyImage(images = []) {
  return images?.[0]?.url || images?.[1]?.url || images?.[2]?.url || "";
}

function looksLikeArtistQuery(q, artistName) {
  const a = norm(artistName);
  const x = norm(q);
  return a && (x === a || x.includes(a) || a.includes(x));
}

function trackMatchesArtist(track, artistName) {
  const wanted = normalizeArtistAlias(artistName);
  const primaryArtist = normalizeArtistAlias(track?.artist || "");
  const title = normalizeTrackTitle(track?.title || "");
  const album = norm(track?.album?.name || "");

  if (!wanted) return false;

  if (primaryArtist === wanted) return true;
  if (primaryArtist.includes(wanted)) return true;
  if (wanted.includes(primaryArtist)) return true;

  return title.includes(wanted) || album.includes(wanted);
}

function isBadSpotifyTitle(title = "") {
  return /\b(live|session|sessions|acoustic|demo|remix|karaoke|instrumental|commentary|interlude|rehearsal|radio edit|edit|mono|stereo mix|version|from the motion picture|score)\b/i.test(
    String(title || "")
  );
}

function isBadSpotifyAlbumName(name = "") {
  return /(live|session|sessions|acoustic|demo|karaoke|instrumental|deluxe|anniversary|expanded|commentary)/i.test(
    String(name || "")
  );
}

function filterSpotifyCandidates(tracks = []) {
  return (Array.isArray(tracks) ? tracks : []).filter((t) => {
    const title = t?.title || "";
    const albumName = t?.album?.name || "";

    if (isBadSpotifyTitle(title)) return false;
    if (isBadSpotifyAlbumName(albumName)) return false;

    return true;
  });
}

function dedupeTracksAggressive(tracks = [], limit = 12) {
  const seen = new Set();
  const out = [];

  for (const t of tracks) {
    const key = `${normalizeArtistAlias(t.artist)}|${normalizeTrackTitle(t.title)}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(t);

    if (out.length >= limit) break;
  }

  return out;
}

function scoreTrackForQuery(track, query) {
  const q = normalizeTrackTitle(query);

  const title = normalizeTrackTitle(track?.title);
  const artist = norm(track?.artist);
  const album = norm(track?.album?.name);

  const popularity = Number(track?.popularity ?? 0);

  let score = 0;

  if (title === q) score += 120;
  if (`${artist} ${title}` === q || `${title} ${artist}` === q) score += 100;
  if (title.includes(q)) score += 50;
  if (q.includes(title)) score += 30;
  if (artist.includes(q)) score += 25;
  if (album.includes(q)) score += 10;

  score += popularity * 0.4;

  if (track?.album?.release_date) {
    const year = Number(String(track.album.release_date).slice(0, 4));
    if (Number.isFinite(year)) {
      score += Math.max(0, year - 1970) * 0.03;
    }
  }

  return score;
}

function sortTracksByQueryRelevance(tracks = [], query = "") {
  return [...tracks].sort((a, b) => {
    const diff = scoreTrackForQuery(b, query) - scoreTrackForQuery(a, query);
    if (diff !== 0) return diff;

    return String(b?.album?.release_date || "").localeCompare(
      String(a?.album?.release_date || "")
    );
  });
}

function limitPerAlbum(tracks = [], maxPerAlbum = 3, limit = 12) {
  const counts = new Map();
  const out = [];

  for (const t of tracks) {
    const albumKey = t?.album?.id || `${norm(t.artist)}|${norm(t.album?.name)}`;
    const n = counts.get(albumKey) || 0;
    if (n >= maxPerAlbum) continue;

    counts.set(albumKey, n + 1);
    out.push(t);

    if (out.length >= limit) break;
  }

  return out;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);

  let i = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (i < list.length) {
      const idx = i++;
      try {
        results[idx] = await mapper(list[idx], idx);
      } catch (err) {
        console.error("[mapWithConcurrency] item failed", idx, err?.message || err);
        results[idx] = null;
      }
    }
  });

  await Promise.all(workers);
  return results;
}

function buildFastMetadata(track, cached = null) {
  const spotifyRelease = track?.album?.release_date || null;
  const cachedMeta = cached?.metadata || null;

  const hasGenres =
    Array.isArray(cachedMeta?.genres) && cachedMeta.genres.length > 0;
  const hasStyles =
    Array.isArray(cachedMeta?.styles) && cachedMeta.styles.length > 0;

  return {
    spotifyTrackId:
      cachedMeta?.spotifyTrackId || track?.spotifyTrackId || null,
    releaseDate: cachedMeta?.releaseDate || spotifyRelease || null,
    releaseDateSource:
      cachedMeta?.releaseDateSource || (spotifyRelease ? "spotify" : null),
    era:
      cachedMeta?.era ||
      classifyEra(cachedMeta?.releaseDate || spotifyRelease || null) ||
      null,
    genres: hasGenres ? cachedMeta.genres : [],
    styles: hasStyles ? cachedMeta.styles : [],
    discogsId: cachedMeta?.discogsId ?? null,
    musicbrainzId: cachedMeta?.musicbrainzId ?? null,
    ytViews: cachedMeta?.ytViews ?? null,
    popularityScore: cachedMeta?.popularityScore ?? null,
    isTopic: cachedMeta?.isTopic ?? false,
    enrichmentStatus: cachedMeta?.enrichmentStatus || "partial",
    pendingEnrichment:
      cachedMeta?.enrichmentStatus !== "full" &&
      !(hasGenres || hasStyles),
  };
}

function needsBackgroundEnrichment(cached = null) {
  const meta = cached?.metadata || null;
  if (!meta) return true;
  return meta.enrichmentStatus !== "full";
}

async function searchTrackCatalog(q, limit = 12) {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 20);

  const page1 = await spotifySearchTracks(q, 10, 0).catch((err) => {
    console.error("[searchTrackCatalog] page1 FAILED", err?.message || err);
    return [];
  });

  const page2 =
    safeLimit > 10
      ? await spotifySearchTracks(q, 10, 10).catch((err) => {
          console.error("[searchTrackCatalog] page2 FAILED", err?.message || err);
          return [];
        })
      : [];

  const tracks = filterSpotifyCandidates([...page1, ...page2].filter(Boolean));

  let ranked = sortTracksByQueryRelevance(tracks, q);
  const normalizedQuery = normalizeTrackTitle(q);

  ranked.sort((a, b) => {
    const aExact = normalizeTrackTitle(a.title) === normalizedQuery ? 1 : 0;
    const bExact = normalizeTrackTitle(b.title) === normalizedQuery ? 1 : 0;

    if (aExact !== bExact) return bExact - aExact;
    return scoreTrackForQuery(b, q) - scoreTrackForQuery(a, q);
  });

  const deduped = dedupeTracksAggressive(ranked, safeLimit * 2);
  const finalResults = limitPerAlbum(deduped, 2, safeLimit);

  return finalResults;
}

async function searchArtistCatalog(q, limit = 12, artistSeed = null) {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 20);

  const artist =
    artistSeed ||
    (await spotifySearchArtist(q).catch((err) => {
      console.error("[searchArtistCatalog] spotifySearchArtist FAILED", err?.message || err);
      return null;
    }));

  if (!artist) return [];

  if (!looksLikeArtistQuery(q, artist.name)) {
    return [];
  }

  const popularPage1 = await spotifySearchTracks(`artist:${artist.name}`, 10, 0).catch((err) => {
    console.error("[searchArtistCatalog] popularPage1 FAILED", err?.message || err);
    return [];
  });

  const popularPage2 =
    safeLimit > 10
      ? await spotifySearchTracks(`artist:${artist.name}`, 10, 10).catch((err) => {
          console.error("[searchArtistCatalog] popularPage2 FAILED", err?.message || err);
          return [];
        })
      : [];

  const popularTracks = filterSpotifyCandidates(
    [...popularPage1, ...popularPage2].filter((t) =>
      trackMatchesArtist(t, artist.name)
    )
  );

  const broadPage1 = await spotifySearchTracks(artist.name, 10, 0).catch((err) => {
    console.error("[searchArtistCatalog] broadPage1 FAILED", err?.message || err);
    return [];
  });

  const broadPage2 =
    safeLimit > 10
      ? await spotifySearchTracks(artist.name, 10, 10).catch((err) => {
          console.error("[searchArtistCatalog] broadPage2 FAILED", err?.message || err);
          return [];
        })
      : [];

  const broadTracks = filterSpotifyCandidates(
    [...broadPage1, ...broadPage2].filter((t) =>
      trackMatchesArtist(t, artist.name)
    )
  );

  const combined = dedupeTracksAggressive(
    [
      ...popularTracks.map((t) => ({
        ...t,
        artist: t.artist || artist.name,
        artistId: t.artistId || artist.id,
      })),
      ...broadTracks.map((t) => ({
        ...t,
        artist: t.artist || artist.name,
        artistId: t.artistId || artist.id,
      })),
    ],
    safeLimit * 4
  );

  if (!combined.length) return [];

  const anchorTracks = [...combined]
    .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
    .slice(0, 5);

  const anchorKeys = new Set(
    anchorTracks.map(
      (t) => t.spotifyTrackId || `${norm(t.artist)}|${normalizeTrackTitle(t.title)}`
    )
  );

  const remainder = combined
    .filter(
      (t) =>
        !anchorKeys.has(
          t.spotifyTrackId || `${norm(t.artist)}|${normalizeTrackTitle(t.title)}`
        )
    )
    .sort((a, b) => {
      const ap = Number(a?.popularity ?? 0);
      const bp = Number(b?.popularity ?? 0);
      const ay = Number(String(a?.album?.release_date || "").slice(0, 4)) || 0;
      const by = Number(String(b?.album?.release_date || "").slice(0, 4)) || 0;

      const aScore = ap * 0.75 + ay * 0.03;
      const bScore = bp * 0.75 + by * 0.03;

      return bScore - aScore;
    });

  const ranked = [...anchorTracks, ...remainder];
  const finalResults = limitPerAlbum(ranked, 3, safeLimit);

  return finalResults;
}

async function fetchCachedTracksBySpotifyIds(tracks = []) {
  const spotifyIds = tracks.map((t) => t.spotifyTrackId).filter(Boolean);
  if (!spotifyIds.length) return [];

  const docs = await Track.find({
    $or: [
      { spotifyTrackId: { $in: spotifyIds } },
      { "metadata.spotifyTrackId": { $in: spotifyIds } },
    ],
  }).lean();

  return docs;
}

function buildCacheBySpotifyId(cachedTracks = []) {
  const map = new Map();

  for (const doc of cachedTracks) {
    const sid = doc?.spotifyTrackId || doc?.metadata?.spotifyTrackId;
    if (sid) map.set(sid, doc);
  }

  return map;
}

async function attachCachedPlaybackAndMetadata(tracks = []) {
  const cachedTracks = await fetchCachedTracksBySpotifyIds(tracks);
  const cacheBySpotifyId = buildCacheBySpotifyId(cachedTracks);

  const results = tracks.map((t) => {
    const cached = cacheBySpotifyId.get(t.spotifyTrackId) || null;
    const metadata = buildFastMetadata(t, cached);

    return {
      spotifyTrackId: t.spotifyTrackId || null,
      title: t.title,
      artist: t.artist,
      artistId: t.artistId || null,
      album: {
        id: t.album?.id || null,
        name: t.album?.name || null,
        images: t.album?.images || [],
        release_date: t.album?.release_date || null,
      },
      thumbnail: bestSpotifyImage(t.album?.images),
      videoId: cached?.videoId || null,
      metadata,
    };
  });

  return { results, cacheBySpotifyId };
}

const activeBackgroundSpotifyEnrichments = new Set();

async function upsertBackgroundEnrichedTrack(track, cachedDoc = null) {
  const spotifyTrackId = track?.spotifyTrackId || null;
  if (!spotifyTrackId) return;

  const enriched = await enrichSong({
    title: track.title,
    artist: track.artist,
  }).catch((err) => {
    console.error(
      "[upsertBackgroundEnrichedTrack] enrichSong FAILED",
      spotifyTrackId,
      err?.message || err
    );
    return null;
  });

  const spotifyRelease = track?.album?.release_date || null;
  const releaseDate =
    enriched?.releaseDate || cachedDoc?.metadata?.releaseDate || spotifyRelease || null;

  const metadata = {
    spotifyTrackId,
    releaseDate,
    releaseDateSource:
      enriched?.releaseDateSource ||
      cachedDoc?.metadata?.releaseDateSource ||
      (spotifyRelease ? "spotify" : null),
    era:
      enriched?.era ||
      cachedDoc?.metadata?.era ||
      classifyEra(releaseDate) ||
      null,
    genres:
      enriched?.genres ??
      cachedDoc?.metadata?.genres ??
      [],
    styles:
      enriched?.styles ??
      cachedDoc?.metadata?.styles ??
      [],
    discogsId:
      enriched?.discogs?.discogsId ??
      cachedDoc?.metadata?.discogsId ??
      null,
    musicbrainzId:
      enriched?.musicbrainz?.musicbrainzId ??
      cachedDoc?.metadata?.musicbrainzId ??
      null,
    ytViews: cachedDoc?.metadata?.ytViews ?? null,
    popularityScore: cachedDoc?.metadata?.popularityScore ?? null,
    isTopic: cachedDoc?.metadata?.isTopic ?? false,
    enrichmentStatus: enriched ? "full" : "partial",
    pendingEnrichment: false,
  };

  const selector = cachedDoc?._id
    ? { _id: cachedDoc._id }
    : { trackId: `sp:${spotifyTrackId}` };

  await Track.findOneAndUpdate(
    selector,
    {
      $set: {
        trackId: cachedDoc?.trackId || `sp:${spotifyTrackId}`,
        videoId: cachedDoc?.videoId || null,
        title: track.title,
        artist: track.artist,
        channel: cachedDoc?.channel || null,
        thumbnail: cachedDoc?.thumbnail || bestSpotifyImage(track?.album?.images),
        spotifyTrackId,
        artistId: track?.artistId || cachedDoc?.artistId || null,
        albumId: track?.album?.id || cachedDoc?.albumId || null,
        albumName: track?.album?.name || cachedDoc?.albumName || null,
        metadata,
        enrichedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );
}

function scheduleBackgroundEnrichment(tracks = [], cacheBySpotifyId = new Map()) {
  const candidates = tracks
    .filter((t) => t?.spotifyTrackId)
    .filter((t) => {
      const cached = cacheBySpotifyId.get(t.spotifyTrackId) || null;
      return needsBackgroundEnrichment(cached);
    })
    .slice(0, 6);

  if (!candidates.length) return;

  setTimeout(async () => {
    await mapWithConcurrency(candidates, 2, async (track) => {
      const spotifyTrackId = track.spotifyTrackId;
      if (!spotifyTrackId) return null;

      if (activeBackgroundSpotifyEnrichments.has(spotifyTrackId)) {
        return null;
      }

      activeBackgroundSpotifyEnrichments.add(spotifyTrackId);

      try {
        const cachedDoc = cacheBySpotifyId.get(spotifyTrackId) || null;
        await upsertBackgroundEnrichedTrack(track, cachedDoc);
      } catch (err) {
        console.error(
          "[background-enrichment] failed:",
          spotifyTrackId,
          err?.message || err
        );
      } finally {
        activeBackgroundSpotifyEnrichments.delete(spotifyTrackId);
      }

      return null;
    });
  }, 0);
}

async function searchCatalog(q, limit = 12) {
  const query = String(q || "").trim();
  if (!query) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 20);

  const artistHit = await spotifySearchArtist(query).catch((err) => {
    console.error("[searchCatalog] spotifySearchArtist FAILED", err?.message || err);
    return null;
  });

  let rawResults = [];

  try {
    if (artistHit && looksLikeArtistQuery(query, artistHit.name)) {
      rawResults = await searchArtistCatalog(query, safeLimit, artistHit);
    } else {
      rawResults = await searchTrackCatalog(query, safeLimit);
    }
  } catch (e) {
    console.error("[searchCatalog] primary branch FAILED", e?.message || e);
    rawResults = await searchTrackCatalog(query, safeLimit).catch((err) => {
      console.error("[searchCatalog] fallback track search FAILED", err?.message || err);
      return [];
    });
  }

  const { results, cacheBySpotifyId } =
    await attachCachedPlaybackAndMetadata(rawResults);

  scheduleBackgroundEnrichment(rawResults, cacheBySpotifyId);

  return results;
}

module.exports = { searchCatalog };
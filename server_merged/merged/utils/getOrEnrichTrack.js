const Track = require("../models/Track");
const { enrichSong } = require("./enrichSong");
const { computePopularityScore } = require("./popularityScore");
const { classifyEra } = require("./era");

async function getOrEnrichTrack({ videoId, title, artist, channel, thumbnail,
  viewCount = 0, publishedAt = null, spotify = null,
  ytChannel = null, ytTitle = null,
}) {
  const trackId = `yt:${videoId}`;
  const topicSource = ytChannel || channel || "";
  const isTopic = /\s*-\s*Topic\s*$/i.test(topicSource);
  const popularityScore = computePopularityScore({
    viewCount, channel: topicSource, publishedAt,
  });

  // 1) Cache check — return immediately if fully enriched
  const existing = await Track.findOne({ trackId }).lean();

  if (existing) {
    const status = existing.metadata?.enrichmentStatus;
    if (status === "full") return existing;

    // Partial but has genres — skip API calls, return as-is
    const hasGenres =
      existing.metadata?.genres?.length > 0 ||
      existing.metadata?.styles?.length > 0;

    if (hasGenres) return existing;
  }

  // 2) Full enrichment (never-seen track)
  const enriched = title && artist
    ? await enrichSong({ title, artist }).catch(() => null)
    : null;

  const spotifyTrackIdFallback =
    spotify?.trackId ||
    spotify?.spotifyTrackId ||
    existing?.spotifyTrackId ||
    null;

  const spotifyReleaseFallback =
    spotify?.release_date ||
    spotify?.releaseDate ||
    existing?.metadata?.releaseDate ||
    null;

  const releaseDateFinal = enriched?.releaseDate || spotifyReleaseFallback || null;
  const eraFinal =
    enriched?.era || existing?.metadata?.era || classifyEra(releaseDateFinal) || null;

  const metadataFinal = {
    spotifyTrackId: enriched?.spotify?.spotifyTrackId ?? spotifyTrackIdFallback,
    releaseDate: releaseDateFinal,
    releaseDateSource:
      enriched?.releaseDateSource ??
      existing?.metadata?.releaseDateSource ??
      (spotifyReleaseFallback ? "spotify" : null),
    era: eraFinal,
    genres: enriched?.genres ?? existing?.metadata?.genres ?? [],
    styles: enriched?.styles ?? existing?.metadata?.styles ?? [],
    discogsId: enriched?.discogs?.discogsId ?? existing?.metadata?.discogsId ?? null,
    musicbrainzId:
      enriched?.musicbrainz?.musicbrainzId ?? existing?.metadata?.musicbrainzId ?? null,
    ytViews: viewCount ?? existing?.metadata?.ytViews ?? 0,
    popularityScore: popularityScore ?? existing?.metadata?.popularityScore ?? 0,
    isTopic,
    enrichmentStatus: enriched ? "full" : "partial",
    pendingEnrichment: false,
  };

  const doc = await Track.findOneAndUpdate(
    { trackId },
    {
      $set: {
        trackId, videoId, title, artist, channel, thumbnail,
        spotifyTrackId: spotifyTrackIdFallback,
        artistId: spotify?.artistId || existing?.artistId || null,
        albumId: spotify?.albumId || existing?.albumId || null,
        albumName: spotify?.albumName || existing?.albumName || null,
        metadata: metadataFinal,
        enrichedAt: new Date(),
      },
    },
    { returnDocument: "after", upsert: true }
  );

  return doc?.toObject ? doc.toObject() : doc;
}

module.exports = { getOrEnrichTrack };
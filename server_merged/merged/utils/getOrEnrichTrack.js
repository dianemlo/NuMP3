const Track = require("../models/Track");
const { enrichSong } = require("./enrichSong");
const { computePopularityScore } = require("./popularityScore");
const { classifyEra } = require("./era");

async function getOrEnrichTrack({
  videoId,
  title,
  artist,
  channel,
  thumbnail,
  viewCount = 0,
  publishedAt = null,

  // optional inputs from smartSearch / spotify-backed result
  spotify = null,
  ytChannel = null,
  ytTitle = null,
}) {
  const trackId = `yt:${videoId}`;

  const topicSource = ytChannel || channel || "";
  const isTopic = /\s*-\s*Topic\s*$/i.test(topicSource);

  const popularityScore = computePopularityScore({
    viewCount,
    channel: topicSource,
    publishedAt,
  });

  // 1) Check cache first
  const existing = await Track.findOne({ trackId });

  if (existing) {
    const meta = existing.metadata || null;
    const isFullyEnriched = meta?.enrichmentStatus === "full";

    if (isFullyEnriched) {
      return existing;
    }
  }

  // 2) Enrich on demand (single-track click/play path)
  const enriched = title && artist ? await enrichSong({ title, artist }).catch(() => null) : null;

  const spotifyTrackIdFallback =
    spotify?.trackId || spotify?.spotifyTrackId || existing?.spotifyTrackId || null;

  const spotifyReleaseFallback =
    spotify?.release_date ||
    spotify?.releaseDate ||
    existing?.metadata?.releaseDate ||
    null;

  const releaseDateFinal =
    enriched?.releaseDate || spotifyReleaseFallback || null;

  const eraFinal =
    enriched?.era ||
    existing?.metadata?.era ||
    classifyEra(releaseDateFinal) ||
    null;

  const metadataFinal = {
    spotifyTrackId:
      enriched?.spotify?.spotifyTrackId ??
      spotifyTrackIdFallback,

    releaseDate: releaseDateFinal,

    releaseDateSource:
      enriched?.releaseDateSource ??
      existing?.metadata?.releaseDateSource ??
      (spotifyReleaseFallback ? "spotify" : null),

    era: eraFinal,

    genres:
      enriched?.genres ??
      existing?.metadata?.genres ??
      [],

    styles:
      enriched?.styles ??
      existing?.metadata?.styles ??
      [],

    discogsId:
      enriched?.discogs?.discogsId ??
      existing?.metadata?.discogsId ??
      null,

    musicbrainzId:
      enriched?.musicbrainz?.musicbrainzId ??
      existing?.metadata?.musicbrainzId ??
      null,

    ytViews: viewCount ?? existing?.metadata?.ytViews ?? 0,
    popularityScore: popularityScore ?? existing?.metadata?.popularityScore ?? 0,
    isTopic,
    enrichmentStatus: enriched ? "full" : "partial",
    pendingEnrichment: false,
  };

  // 3) Upsert final clicked/resolved track
  const doc = await Track.findOneAndUpdate(
    { trackId },
    {
      $set: {
        trackId,
        videoId,
        title,
        artist,
        channel,
        thumbnail,

        spotifyTrackId: spotifyTrackIdFallback,
        artistId: spotify?.artistId || existing?.artistId || null,
        albumId: spotify?.albumId || existing?.albumId || null,
        albumName: spotify?.albumName || existing?.albumName || null,

        metadata: metadataFinal,
        enrichedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
      upsert: true,
    }
  );

  return doc;
}

module.exports = { getOrEnrichTrack };
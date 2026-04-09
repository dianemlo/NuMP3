const ArtistTopicChannel = require("../models/ArtistTopicChannel");

const {
  youtubeSearch,
  getChannelUploadsPlaylistId,
  getPlaylistItems,
  playlistContainsVideo,
} = require("../services/youtubeService");

const BAD_TITLE =
  /\b(official\s*(music\s*)?video|video\s*version|vevo|\bmv\b|promo|visualizer|live|performance|session|sessions|siriusxm|kexp|npr|tiny\s*desk|cover|acoustic|reaction|interview|trailer|karaoke|sped\s*up|slowed|remix|edit|extended|full\s*album|playlist|mix|demo|remaster(ed)?|mono|stereo\s*mix|instrumental|fan\s*made|tribute)\b/i;

const GOOD_TITLE = /(official\s*audio|\baudio\b|provided\s+to\s+youtube)/i;

const ytResolveCache = new Map();

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function normalizeLoose(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s*-\s*topic\s*$/i, "")
    .replace(/\[[^\]]*?\]|\([^\)]*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreYT(item, { preferOfficialAudio = true } = {}) {
  const title = item?.title || "";
  const channel = item?.channel || "";
  const views = Number(item?.viewCount || 0);

  let score = 0;

  if (preferOfficialAudio) {
    if (/provided\s+to\s+youtube/i.test(title)) score += 35;
    if (/\s*-\s*topic\s*$/i.test(channel)) score += 30;
    if (/\btopic\b/i.test(channel)) score += 20;
    if (/official\s*audio/i.test(title)) score += 20;
    if (GOOD_TITLE.test(title)) score += 12;
  }

  if (BAD_TITLE.test(title)) score -= 80;

  score += Math.log10(views + 1);
  return score;
}

function isStrongOfficialMatch(item) {
  const title = item?.title || "";
  const channel = item?.channel || "";
  return (
    /provided\s+to\s+youtube/i.test(title) ||
    /\s*-\s*Topic\s*$/i.test(channel) ||
    /\btopic\b/i.test(channel)
  );
}

function looksRelevantToTrack(item, artist, title) {
  const itemTitleRaw = String(item?.title || "");
  const itemTitle = normalizeLoose(itemTitleRaw);
  const itemChannel = normalizeLoose(item?.channel);
  const a = normalizeLoose(artist);
  const t = normalizeLoose(title);

  if (!itemTitle || !a || !t) return false;

  // reject obvious non-studio variants early
  if (BAD_TITLE.test(itemTitleRaw)) return false;

  const exactTitle = itemTitle === t;
  const containsTitle = itemTitle.includes(t) || t.includes(itemTitle);

  const artistOk = itemTitle.includes(a) || itemChannel.includes(a);

  return artistOk && (exactTitle || containsTitle);
}

function looksLikeArtistOwnedOrOfficial(item, artist) {
  const channel = normalizeLoose(item?.channel);
  const a = normalizeLoose(artist);

  return (
    channel.includes(a) ||
    /\s*-\s*topic\s*$/i.test(item?.channel || "") ||
    /provided\s+to\s+youtube/i.test(item?.title || "")
  );
}

async function verifyCandidateOwnership(item, artist) {
  if (!item?.channelId || !item?.videoId) {
    return looksLikeArtistOwnedOrOfficial(item, artist);
  }

  if (/\s*-\s*topic\s*$/i.test(item?.channel || "")) return true;
  if (/provided\s+to\s+youtube/i.test(item?.title || "")) return true;

  if (!looksLikeArtistOwnedOrOfficial(item, artist)) return false;

  try {
    const uploadsPlaylistId = await getChannelUploadsPlaylistId(item.channelId);
    if (!uploadsPlaylistId) return false;

    const existsInUploads = await playlistContainsVideo(
      uploadsPlaylistId,
      item.videoId,
      2
    );

    return existsInUploads;
  } catch {
    return false;
  }
}

async function findAndCacheArtistTopicChannel(artist) {
  const artistKey = norm(artist);
  if (!artistKey) return null;

  let existing = await ArtistTopicChannel.findOne({ artistKey }).lean();
  if (existing?.channelId && existing?.uploadsPlaylistId) {
    return existing;
  }

  const searchQueries = [
    `${artist} topic`,
    `${artist} - topic`,
    `${artist} provided to youtube`,
  ];

  for (const q of searchQueries) {
    const items = await youtubeSearch(q, 5);

    const match = (items || []).find((item) => {
      const channel = item?.channel || "";
      const title = item?.title || "";

      return (
        /\s*-\s*topic\s*$/i.test(channel) ||
        (/provided\s+to\s+youtube/i.test(title) &&
          looksLikeArtistOwnedOrOfficial(item, artist))
      );
    });

    if (!match?.channelId) continue;

    const uploadsPlaylistId = await getChannelUploadsPlaylistId(match.channelId).catch(
      () => null
    );

    const doc = await ArtistTopicChannel.findOneAndUpdate(
      { artistKey },
      {
        $set: {
          artistKey,
          artist,
          channelId: match.channelId,
          uploadsPlaylistId,
          channelTitle: match.channel || "",
          source: "youtube-topic-search",
          lastVerifiedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return doc?.toObject ? doc.toObject() : doc;
  }

  return null;
}

async function findViaArtistTopicChannel(artist, title) {
  const artistKey = norm(artist);
  if (!artistKey) return null;

  let topicDoc = await ArtistTopicChannel.findOne({ artistKey }).lean();

  if (!topicDoc?.channelId) {
    topicDoc = await findAndCacheArtistTopicChannel(artist);
  }

  if (!topicDoc?.channelId) return null;

  let uploadsPlaylistId = topicDoc.uploadsPlaylistId || null;

  if (!uploadsPlaylistId) {
    uploadsPlaylistId = await getChannelUploadsPlaylistId(topicDoc.channelId).catch(
      () => null
    );

    if (uploadsPlaylistId) {
      await ArtistTopicChannel.updateOne(
        { artistKey },
        {
          $set: {
            uploadsPlaylistId,
            lastVerifiedAt: new Date(),
          },
        }
      );
    }
  }

  if (!uploadsPlaylistId) return null;

  const items = await getPlaylistItems(uploadsPlaylistId, 50).catch(() => []);
  if (!items.length) return null;

  let best = null;
  let bestScore = -Infinity;

  for (const item of items) {
    if (!item?.videoId) continue;
    if (BAD_TITLE.test(item?.title || "")) continue;

    const itemTitle = normalizeLoose(item?.title);
    const wantedTitle = normalizeLoose(title);
    const wantedArtist = normalizeLoose(artist);
    const itemChannel = normalizeLoose(item?.channel);

    const strongTitleMatch =
      itemTitle.includes(wantedTitle) || wantedTitle.includes(itemTitle);

    const artistMatch =
      itemChannel.includes(wantedArtist) || itemTitle.includes(wantedArtist);

    if (!strongTitleMatch || !artistMatch) continue;

    const s = scoreYT(item, { preferOfficialAudio: true }) + 12;
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }

  return best;
}

async function findBestYouTubeForTrack(
  { artist, title },
  {
    maxResultsPerQuery = 5,
    preferOfficialAudio = true,
    allowNonOfficialFallback = true,
  } = {}
) {
  const a = String(artist || "").trim();
  const t = String(title || "").trim();
  if (!a || !t) return null;

  const cacheKey = `${norm(a)}|${norm(t)}`;
  if (ytResolveCache.has(cacheKey)) return ytResolveCache.get(cacheKey);

  const topicMatch = await findViaArtistTopicChannel(a, t);
  if (topicMatch) {
    ytResolveCache.set(cacheKey, topicMatch);
    return topicMatch;
  }

  const queries = [
    `${a} ${t} provided to youtube by`,
    `${a} ${t} official audio`,
  ];

  let best = null;
  let bestScore = -Infinity;

  for (const q of queries) {
    const items = await youtubeSearch(q, maxResultsPerQuery);

    const candidates = items
      .filter((x) => x?.videoId)
      .filter((x) => !BAD_TITLE.test(x.title || ""))
      .filter((x) => looksRelevantToTrack(x, a, t));

    for (const c of candidates) {
      const verified = await verifyCandidateOwnership(c, a);
      if (!verified) continue;

      const s = scoreYT(c, { preferOfficialAudio });
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }

    if (best && isStrongOfficialMatch(best)) {
      ytResolveCache.set(cacheKey, best);
      return best;
    }
  }

  if (!best && allowNonOfficialFallback) {
    const items = await youtubeSearch(`${a} ${t}`, maxResultsPerQuery);

    const candidates = items
      .filter((x) => x?.videoId)
      .filter((x) => looksRelevantToTrack(x, a, t))
      .filter((x) => !BAD_TITLE.test(x?.title || ""));

    for (const c of candidates) {
      let verified = false;

      try {
        verified = await verifyCandidateOwnership(c, a);
      } catch {
        verified = false;
      }

      const acceptableFallback =
        verified ||
        /\s*-\s*topic\s*$/i.test(c?.channel || "") ||
        /provided\s+to\s+youtube/i.test(c?.title || "") ||
        looksLikeArtistOwnedOrOfficial(c, a);

      if (!acceptableFallback) continue;

      const s = scoreYT(c, { preferOfficialAudio: false });
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
  }

  ytResolveCache.set(cacheKey, best);
  return best;
}

module.exports = {
  BAD_TITLE,
  GOOD_TITLE,
  findBestYouTubeForTrack,
};
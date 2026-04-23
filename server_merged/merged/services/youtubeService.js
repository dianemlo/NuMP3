const axios = require("axios");

const YT_BASE = "https://www.googleapis.com/youtube/v3";

function parseISODurationToSeconds(iso = "") {
  const s = String(iso || "");
  const match = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

async function youtubeSearch(query, maxResults = 25) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY");

  const searchRes = await axios.get(`${YT_BASE}/search`, {
    params: {
      part: "snippet",
      q: query,
      type: "video",
      maxResults,
      videoCategoryId: "10",
      key,
      videoEmbeddable: "true",
      videoSyndicated: "true",
    },
    timeout: 10000,
  });

  const items = searchRes.data?.items || [];

  let mapped = items
    .filter((i) => i?.id?.videoId)
    .map((i) => ({
      videoId: i.id.videoId,
      channelId: i.snippet.channelId || null,
      title: i.snippet.title,
      channel: i.snippet.channelTitle,
      thumbnail:
        i.snippet.thumbnails?.maxres?.url ||
        i.snippet.thumbnails?.standard?.url ||
        i.snippet.thumbnails?.high?.url ||
        i.snippet.thumbnails?.medium?.url ||
        "",
      publishedAt: i.snippet.publishedAt || null,
      liveBroadcastContent: i.snippet.liveBroadcastContent || "none",
    }));

  mapped = mapped.filter((m) => m.liveBroadcastContent === "none");

  const ids = mapped.map((m) => m.videoId);
  if (!ids.length) return [];

  const detailsRes = await axios.get(`${YT_BASE}/videos`, {
    params: {
      part: "statistics,contentDetails",
      id: ids.join(","),
      key,
    },
    timeout: 10000,
  });

  const detailItems = detailsRes.data?.items || [];

  const detailsMap = new Map(
    detailItems.map((v) => [
      v.id,
      {
        viewCount: Number(v.statistics?.viewCount || 0),
        duration: v.contentDetails?.duration || null,
        durationSeconds: parseISODurationToSeconds(v.contentDetails?.duration || ""),
      },
    ])
  );

  return mapped
    .map((m) => {
      const details = detailsMap.get(m.videoId) || {
        viewCount: 0,
        duration: null,
        durationSeconds: 0,
      };

      return {
        ...m,
        viewCount: details.viewCount,
        duration: details.duration,
        durationSeconds: details.durationSeconds,
      };
    })
    .filter((m) => m.durationSeconds === 0 || m.durationSeconds >= 90); // reject likely previews/clips
}

async function getChannelUploadsPlaylistId(channelId) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !channelId) return null;

  const res = await axios.get(`${YT_BASE}/channels`, {
    params: {
      part: "contentDetails",
      id: channelId,
      key,
    },
    timeout: 10000,
  });

  const item = res.data?.items?.[0];
  return item?.contentDetails?.relatedPlaylists?.uploads || null;
}

async function playlistContainsVideo(playlistId, videoId, maxPages = 3) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !playlistId || !videoId) return false;

  let pageToken = null;
  let pages = 0;

  while (pages < maxPages) {
    const res = await axios.get(`${YT_BASE}/playlistItems`, {
      params: {
        part: "snippet",
        playlistId,
        maxResults: 50,
        pageToken: pageToken || undefined,
        key,
      },
      timeout: 10000,
    });

    const items = res.data?.items || [];
    const found = items.some(
      (item) => item?.snippet?.resourceId?.videoId === videoId
    );
    if (found) return true;

    pageToken = res.data?.nextPageToken || null;
    if (!pageToken) break;

    pages += 1;
  }

  return false;
}

async function getPlaylistItems(playlistId, maxResults = 10) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY");

  const res = await axios.get(`${YT_BASE}/playlistItems`, {
    params: {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: Math.min(Math.max(Number(maxResults) || 10, 1), 50),
      key,
    },
    timeout: 10000,
  });

  return (res.data?.items || []).map((item) => ({
    videoId: item?.contentDetails?.videoId || null,
    title: item?.snippet?.title || "",
    channel: item?.snippet?.videoOwnerChannelTitle || item?.snippet?.channelTitle || "",
    channelId: item?.snippet?.videoOwnerChannelId || item?.snippet?.channelId || null,
    publishedAt: item?.contentDetails?.videoPublishedAt || item?.snippet?.publishedAt || null,
    thumbnail:
      item?.snippet?.thumbnails?.medium?.url ||
      item?.snippet?.thumbnails?.default?.url ||
      "",
    _raw: item,
  }));
}

module.exports = {
  youtubeSearch,
  getChannelUploadsPlaylistId,
  playlistContainsVideo,
  getPlaylistItems,
};
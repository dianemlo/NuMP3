const API_KEY = import.meta.env.VITE_YT_API_KEY;

// hard exclusions: most common non-studio/official cases
const BAD_TITLE =
  /(official\s*video|music\s*video|\bmv\b|live|performance|vevo|session|sessions|siriusxm|kexp|npr|tiny\s*desk|cover|acoustic|reaction|interview|trailer|instrumental|karaoke|sped\s*up|slowed|remix|edit|extended|full\s*album|playlist|mix)/i;

// strong positive signals for official audio
const GOOD_TITLE = /(official\s*audio|\baudio\b|provided\s+to\s+youtube)/i;

function scoreItem(item) {
  const title = item.title || "";
  const channel = item.channel || "";

  let score = 0;

  // biggest win: "Provided to YouTube" uploads
  if (/provided\s+to\s+youtube/i.test(title)) score += 8;

  // Topic channels are usually official audio (auto-generated)
  if (/\btopic\b/i.test(channel)) score += 7;

  // explicit audio hint
  if (GOOD_TITLE.test(title)) score += 4;

  // slight preference: contains a dash which often implies "Artist - Track"
  if (title.includes(" - ")) score += 1;

  // punish common non-official patterns even if not fully excluded
  if (/lyrics?/i.test(title)) score -= 2;
  if (/visualizer/i.test(title)) score -= 2;

  // hard penalty if it matches BAD_TITLE (we also filter, but keep defensive)
  if (BAD_TITLE.test(title)) score -= 999;

  return score;
}

export async function ytSearch(query, maxResults = 12) {
  if (!query?.trim()) return [];

  // Pull more than you display so you can filter/rank better
  const fetchCount = Math.min(Math.max(maxResults * 2, 15), 25);

  const params = new URLSearchParams({
    part: "snippet",
    // stronger bias toward audio
    q: `${query} official audio`,
    type: "video",
    videoCategoryId: "10",
    maxResults: String(fetchCount),
    key: API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "YouTube search failed");
  }

  const mapped = (data.items || [])
    .filter((i) => i?.id?.videoId)
    .map((i) => ({
      videoId: i.id.videoId,
      title: i.snippet.title,
      channel: i.snippet.channelTitle,
      thumbnail: i.snippet.thumbnails?.medium?.url || "",
    }));

  // Strict filter first
  const filtered = mapped.filter((item) => !BAD_TITLE.test(item.title));

  // Rank by score
  const ranked = filtered
    .map((item) => ({ item, s: scoreItem(item) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);

  // Return only what the UI asked for
  return ranked.slice(0, maxResults);
}
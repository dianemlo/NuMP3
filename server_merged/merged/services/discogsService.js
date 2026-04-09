const axios = require("axios");

const DISCOGS_BASE = "https://api.discogs.com";

function discogsHeaders() {
  return {
    Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
    "User-Agent": `${process.env.APP_NAME}/${process.env.APP_VERSION} (${process.env.APP_CONTACT})`,
  };
}

async function discogsSearchRelease({ title, artist }) {
  if (!process.env.DISCOGS_TOKEN) return null;

  const res = await axios.get(`${DISCOGS_BASE}/database/search`, {
    params: {
      q: `${artist} ${title}`,
      type: "release",
      per_page: 1,
    },
    headers: discogsHeaders(),
  });

  const item = res.data?.results?.[0];
  if (!item) return null;

  return {
    discogsId: item.id,
    year: item.year ?? null,
    genres: item.genre ?? [],
    styles: item.style ?? [],
  };
}

module.exports = { discogsSearchRelease };
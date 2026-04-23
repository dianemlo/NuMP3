function computePopularityScore({ viewCount = 0, channel = "", publishedAt = null }) {
  const views = Number(viewCount) || 0;

  const base = Math.log10(views + 1) * 15;

  const topicBonus = /\s*-\s*Topic\s*$/i.test(channel) ? 10 : 0;

  let recencyBonus = 0;
  if (publishedAt) {
    const days = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) recencyBonus = 10;
    else if (days <= 180) recencyBonus = 5;
  }

  const score = Math.round(Math.min(100, Math.max(0, base + topicBonus + recencyBonus)));
  return score;
}

module.exports = { computePopularityScore };
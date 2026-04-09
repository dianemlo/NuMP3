function classifyEra(dateStr) {
  if (!dateStr) return null;
  const year = parseInt(String(dateStr).slice(0, 4), 10);
  if (Number.isNaN(year)) return null;

  if (year < 1950) return "40s";
  if (year < 1960) return "50s";
  if (year < 1970) return "60s";
  if (year < 1980) return "70s";
  if (year < 1990) return "80s";
  if (year < 2000) return "90s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s+";
}

module.exports = { classifyEra };
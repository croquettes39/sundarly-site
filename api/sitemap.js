// Sundarly — plan du site (sitemap.xml) généré à chaque visite des robots.
// Pages fixes + pages destinations + logements « En ligne » (uniquement quand le site est ouvert au public).
const SITE = "https://www.sundarly.com";
const SUPABASE_URL = "https://gbdjiczesmhhsrqhvrgj.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn"; // clé publique (la même que sur le site)
const DESTINATIONS = require("./destinations.json");

function url(loc, lastmod, freq, prio) {
  return "  <url><loc>" + loc + "</loc>" + (lastmod ? "<lastmod>" + lastmod + "</lastmod>" : "") +
    "<changefreq>" + freq + "</changefreq><priority>" + prio + "</priority></url>";
}

module.exports = async function (req, res) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const lignes = [
    url(SITE + "/", aujourdhui, "daily", "1.0"),
    url(SITE + "/logements", aujourdhui, "daily", "0.9"),
    url(SITE + "/hotes", aujourdhui, "weekly", "0.9"),
    url(SITE + "/pourquoi-sundarly", aujourdhui, "weekly", "0.9"),
    url(SITE + "/locations-vacances", aujourdhui, "weekly", "0.8"),
    url(SITE + "/conditions-generales", null, "yearly", "0.2")
  ];
  DESTINATIONS.forEach(function (d) { lignes.push(url(SITE + "/locations-vacances/" + d.slug, aujourdhui, "weekly", "0.8")); });
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/catalogue", {
      method: "POST",
      headers: { apikey: CLE_PUBLIQUE, Authorization: "Bearer " + CLE_PUBLIQUE, "Content-Type": "application/json" },
      body: "{}"
    });
    if (r.ok) {
      const annonces = await r.json();
      (annonces || []).forEach(function (a) {
        lignes.push(url(SITE + "/logement?id=" + a.id, (a.created_at || "").slice(0, 10) || null, "weekly", "0.7"));
      });
    }
  } catch (e) { /* le plan du site reste valide même sans les logements */ }
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + lignes.join("\n") + "\n</urlset>\n");
};

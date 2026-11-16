// Sundarly — plan du site (sitemap.xml) généré à chaque visite des robots.
// Pages fixes + pages destinations + logements « En ligne » (uniquement quand le site est ouvert au public).
const SITE = "https://www.sundarly.com";
const SUPABASE_URL = "https://gbdjiczesmhhsrqhvrgj.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn"; // clé publique (la même que sur le site)
const DESTINATIONS = require("./destinations.json");

// Chaque page publique existe en français (adresse de base) et dans 6 autres langues (/en/…, /es/…) :
// on les liste toutes, chacune avec ses versions dans les autres langues (hreflang), comme le demande Google.
const LANGUES = ["fr", "en", "es", "pt", "de", "it", "nl"];
function adresse(l, base) { return SITE + (l === "fr" ? base : "/" + l + (base === "/" ? "" : base)); }

function url(loc, lastmod, freq, prio, base) {
  const versions = base == null ? "" : LANGUES.map(function (l) {
    return '<xhtml:link rel="alternate" hreflang="' + l + '" href="' + adresse(l, base) + '"/>';
  }).join("") + '<xhtml:link rel="alternate" hreflang="x-default" href="' + adresse("fr", base) + '"/>';
  return "  <url><loc>" + loc + "</loc>" + (lastmod ? "<lastmod>" + lastmod + "</lastmod>" : "") +
    "<changefreq>" + freq + "</changefreq><priority>" + prio + "</priority>" + versions + "</url>";
}
// une ligne par langue pour la même page
function toutes(base, lastmod, freq, prio) {
  return LANGUES.map(function (l) { return url(adresse(l, base), lastmod, freq, prio, base); });
}

module.exports = async function (req, res) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const lignes = [].concat(
    toutes("/", aujourdhui, "daily", "1.0"),
    toutes("/logements", aujourdhui, "daily", "0.9"),
    toutes("/hotes", aujourdhui, "weekly", "0.9"),
    toutes("/pourquoi-sundarly", aujourdhui, "weekly", "0.9"),
    toutes("/locations-vacances", aujourdhui, "weekly", "0.8"),
    [url(SITE + "/conditions-generales", null, "yearly", "0.2")]
  );
  DESTINATIONS.forEach(function (d) { lignes.push.apply(lignes, toutes("/locations-vacances/" + d.slug, aujourdhui, "weekly", "0.8")); });
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/catalogue", {
      method: "POST",
      headers: { apikey: CLE_PUBLIQUE, Authorization: "Bearer " + CLE_PUBLIQUE, "Content-Type": "application/json" },
      body: "{}"
    });
    if (r.ok) {
      const annonces = await r.json();
      (annonces || []).forEach(function (a) {
        const jour = (a.created_at || "").slice(0, 10) || null;
        if (a.slug) lignes.push.apply(lignes, toutes("/logement/" + a.slug, jour, "weekly", "0.7"));
        else lignes.push(url(SITE + "/logement?id=" + a.id, jour, "weekly", "0.7"));
      });
    }
  } catch (e) { /* le plan du site reste valide même sans les logements */ }
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + lignes.join("\n") + "\n</urlset>\n");
};

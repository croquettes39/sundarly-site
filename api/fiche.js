// Sundarly — fiche d'un logement (/logement/<slug>, /en/logement/<slug>…) envoyée avec SA photo et SON titre.
// Facebook, WhatsApp, Instagram, LinkedIn… ne lancent pas le JavaScript de la page : sans ce passage par le serveur,
// leur aperçu montrait l'image générale de Sundarly au lieu de la photo du bien.
// La page elle-même reste logement.html (ou en/logement.html…) : on remplace seulement les balises d'aperçu.
const fs = require("fs");
const path = require("path");
const SITE = "https://www.sundarly.com";
const SUPABASE_URL = "https://gbdjiczesmhhsrqhvrgj.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn"; // clé publique (la même que sur le site)
const LANGUES = ["en", "es", "pt", "de", "it", "nl"];
const MOTS = {
  fr: { a: "à", voy: ["voyageur", "voyageurs"], ch: ["chambre", "chambres"] },
  en: { a: "in", voy: ["guest", "guests"], ch: ["bedroom", "bedrooms"] },
  es: { a: "en", voy: ["viajero", "viajeros"], ch: ["habitación", "habitaciones"] },
  pt: { a: "em", voy: ["hóspede", "hóspedes"], ch: ["quarto", "quartos"] },
  de: { a: "in", voy: ["Gast", "Gäste"], ch: ["Schlafzimmer", "Schlafzimmer"] },
  it: { a: "a", voy: ["ospite", "ospiti"], ch: ["camera", "camere"] },
  nl: { a: "in", voy: ["gast", "gasten"], ch: ["slaapkamer", "slaapkamers"] }
};

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function lireFichier(rel) {
  try { return fs.readFileSync(path.join(process.cwd(), rel), "utf8"); } catch (e) { return null; }
}
async function page(l) {
  const local = lireFichier((l ? l + "/" : "") + "logement.html");
  if (local) return local;
  const r = await fetch(SITE + (l ? "/" + l : "") + "/logement");
  return r.ok ? r.text() : null;
}
async function rpc(nom, corps) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + nom, {
    method: "POST",
    headers: { apikey: CLE_PUBLIQUE, Authorization: "Bearer " + CLE_PUBLIQUE, "Content-Type": "application/json" },
    body: JSON.stringify(corps)
  });
  if (!r.ok) return null;
  return r.json();
}
function joli(v) {
  v = String(v || "").trim();
  if (v && v === v.toUpperCase()) v = v.toLowerCase().replace(/(^|[\s'-])\S/g, function (m) { return m.toUpperCase(); });
  return v;
}
// remplace le contenu d'une balise <meta …> repérée par son attribut (property="og:title"…)
function metaRemplace(html, attr, nom, valeur) {
  const rx = new RegExp('<meta\\s+(?=[^>]*\\b' + attr + '="' + nom.replace(/[:.]/g, "\\$&") + '")[^>]*>', "i");
  const balise = '<meta ' + attr + '="' + nom + '" content="' + esc(valeur) + '">';
  return rx.test(html) ? html.replace(rx, balise) : html.replace("</head>", balise + "\n</head>");
}

module.exports = async function (req, res) {
  const slug = String((req.query && req.query.slug) || "").toLowerCase();
  const l = LANGUES.indexOf(String((req.query && req.query.l) || "")) >= 0 ? String(req.query.l) : "";
  let html = await page(l).catch(function () { return null; });
  if (!html) { res.status(500).send("Page indisponible"); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  try {
    if (!/^[a-z0-9-]{1,200}$/.test(slug)) throw new Error("adresse");
    const id = await rpc("annonce_par_slug", { p_slug: slug });
    const A = id ? await rpc("fiche_logement", { annonce: id }) : null;
    if (A && A.titre) {
      const dico = l ? (JSON.parse(lireFichier("assets/langues/" + l + ".json") || "{}").t || {}) : {};
      const tr = function (x) { return dico[x] || x; };
      const m = MOTS[l || "fr"];
      const pl = function (n, mots) { n = Number(n) || 0; return n + " " + (n > 1 ? mots[1] : mots[0]); };
      const ville = joli(A.ville), prep = (l === "it" && /^a/i.test(ville)) ? "ad" : m.a;
      const adresse = SITE + (l ? "/" + l : "") + "/logement/" + slug;
      const titre = A.titre + " – " + tr(A.type_logement) + " " + prep + " " + ville + " | Sundarly";
      const texte = String(A.description || "").replace(/\s+/g, " ").trim();
      const desc = (tr(A.type_logement) + " " + prep + " " + ville + ", " + tr(A.pays) + " · " + pl(A.voyageurs, m.voy) + ", " + pl(A.chambres, m.ch) + ". " + texte).slice(0, 220);
      let photo = (A.photos || [])[0] || "";
      if (photo && photo.charAt(0) === "/") photo = SITE + photo;
      html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>" + esc(titre) + "</title>");
      html = metaRemplace(html, "name", "description", desc);
      html = metaRemplace(html, "property", "og:type", "website");
      html = metaRemplace(html, "property", "og:title", titre);
      html = metaRemplace(html, "property", "og:description", desc);
      html = metaRemplace(html, "property", "og:url", adresse);
      html = metaRemplace(html, "name", "twitter:title", titre);
      html = metaRemplace(html, "name", "twitter:description", desc);
      if (photo) {
        // la photo du bien (les dimensions de l'image générale ne valent plus)
        html = html.replace(/<meta\s+[^>]*property="og:image:(width|height)"[^>]*>\s*/gi, "");
        html = metaRemplace(html, "property", "og:image", photo);
        html = metaRemplace(html, "property", "og:image:alt", A.titre);
        html = metaRemplace(html, "name", "twitter:image", photo);
      }
      html = html.replace(/<link\s+[^>]*rel="canonical"[^>]*>/i, '<link rel="canonical" href="' + adresse + '">');
      html = html.replace(/(<link\s+[^>]*hreflang="([a-zA-Z-]+)"[^>]*href=")[^"]*(")|(<link\s+[^>]*href=")[^"]*("[^>]*hreflang="([a-zA-Z-]+)"[^>]*>)/g,
        function (tout, a1, h1, a3, b1, b3, h2) {
          const h = h1 || h2, url = SITE + (h === "fr" || h === "x-default" ? "" : "/" + h) + "/logement/" + slug;
          return a1 ? a1 + url + a3 : b1 + url + b3;
        });
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    } else {
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
    }
  } catch (e) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
  }
  res.status(200).send(html);
};

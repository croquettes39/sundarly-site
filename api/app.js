// Sundarly — téléchargement de l'application Android (adresse www.sundarly.com/app).
// Compte le téléchargement pour les statistiques de l'admin, puis envoie le fichier APK.
// Aucune adresse IP n'est conservée. Le pays et la ville viennent des en-têtes Vercel.
const SUPABASE_URL = "https://gbdjiczesmhhsrqhvrgj.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn"; // clé publique (la même que sur le site)
const FICHIER = "/telechargements/sundarly.apk";
const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|vercel|curl|wget|python|monitor/i;

function appareil(ua) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "Tablette";
  if (/mobi|iphone|android/i.test(ua)) return "Mobile";
  return "Ordinateur";
}
function provenance(ref) {
  const h = String(ref || "").toLowerCase();
  if (!h) return "Direct";
  try {
    const u = new URL(h);
    if (/sundarly\.com$/.test(u.hostname)) return (u.pathname.replace(/\.html$/, "") || "/").slice(0, 60);
    return u.hostname.replace(/^www\./, "").slice(0, 60);
  } catch (e) { return "Direct"; }
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  const ua = req.headers["user-agent"] || "";
  // Les aperçus de liens (WhatsApp, Facebook…) et les robots ne sont pas comptés
  if (!ROBOTS.test(ua) && req.method === "GET") {
    const s = String((req.query && req.query.s) || "");
    let ville = req.headers["x-vercel-ip-city"] || "";
    try { ville = decodeURIComponent(ville); } catch (e) {}
    try {
      await fetch(SUPABASE_URL + "/rest/v1/rpc/enregistrer_telechargement", {
        method: "POST",
        headers: { apikey: CLE_PUBLIQUE, Authorization: "Bearer " + CLE_PUBLIQUE, "Content-Type": "application/json" },
        body: JSON.stringify({
          p_source: s === "site" ? "Bouton du site" : "QR code / lien direct",
          p_provenance: provenance(req.headers.referer),
          p_pays: (req.headers["x-vercel-ip-country"] || "").toUpperCase(), p_ville: ville,
          p_appareil: appareil(ua)
        })
      });
    } catch (e) { console.error(e); }
  }
  res.statusCode = 302;
  res.setHeader("Location", FICHIER);
  res.end();
};

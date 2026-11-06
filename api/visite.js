// Sundarly — enregistre une visite (page, provenance, pays, appareil) pour les statistiques de l'admin.
// Aucune adresse IP n'est conservée. Le pays et la ville viennent des en-têtes Vercel.
const SUPABASE_URL = "https://gbdjiczesmhhsrqhvrgj.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn"; // clé publique (la même que sur le site)
const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|vercel|curl|wget|python|monitor/i;

function provenance(ref, utm) {
  const src = (utm || "").toLowerCase();
  const h = (ref || "").toLowerCase();
  const t = src + " " + h;
  if (/tiktok/.test(t)) return "TikTok";
  if (/instagram/.test(t)) return "Instagram";
  if (/facebook|fb\.|fb$|^fb/.test(t)) return "Facebook";
  if (/whatsapp|wa\.me/.test(t)) return "WhatsApp";
  if (/youtube|youtu\.be/.test(t)) return "YouTube";
  if (/linkedin|lnkd/.test(t)) return "LinkedIn";
  if (/google/.test(t)) return "Google";
  if (/bing/.test(t)) return "Bing";
  if (/mail|gmx|outlook|yahoo/.test(t)) return "E-mail";
  if (src) return src.slice(0, 40);
  if (!h || /sundarly\.com$/.test(h)) return "Direct";
  return h.replace(/^www\./, "").slice(0, 40);
}
function appareil(ua) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "Tablette";
  if (/mobi|iphone|android/i.test(ua)) return "Mobile";
  return "Ordinateur";
}

module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
  const ua = req.headers["user-agent"] || "";
  if (ROBOTS.test(ua)) { res.statusCode = 204; return res.end(); }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  let ville = req.headers["x-vercel-ip-city"] || "";
  try { ville = decodeURIComponent(ville); } catch (e) {}
  try {
    await fetch(SUPABASE_URL + "/rest/v1/rpc/enregistrer_visite", {
      method: "POST",
      headers: { apikey: CLE_PUBLIQUE, Authorization: "Bearer " + CLE_PUBLIQUE, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_visiteur: String(b.v || ""), p_page: String(b.p || "/").slice(0, 200),
        p_provenance: provenance(String(b.r || ""), String(b.u || "")),
        p_pays: (req.headers["x-vercel-ip-country"] || "").toUpperCase(), p_ville: ville,
        p_appareil: appareil(ua)
      })
    });
  } catch (e) { console.error(e); }
  res.statusCode = 204; res.end();
};

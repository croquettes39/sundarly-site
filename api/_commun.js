// Sundarly — outils communs des fonctions serveur (paiement Stripe)
// Variables à définir dans Vercel : STRIPE_SECRET_KEY, SUNDARLY_CLE_SERVEUR
const SUPABASE_URL = "https://gbdjiczesmhhsrqhvrgj.supabase.co";
const CLE_PUBLIQUE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn";

function json(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}
async function corps(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const morceaux = []; for await (const m of req) morceaux.push(m);
  try { return JSON.parse(Buffer.concat(morceaux).toString("utf8") || "{}"); } catch (e) { return {}; }
}
// Appel d'une fonction de la base, avec le jeton de l'utilisateur ou en anonyme
async function rpc(nom, params, jeton) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + nom, {
    method: "POST",
    headers: { apikey: CLE_PUBLIQUE, Authorization: "Bearer " + (jeton || CLE_PUBLIQUE), "Content-Type": "application/json" },
    body: JSON.stringify(params || {})
  });
  const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
  if (!r.ok) { const err = new Error((d && d.message) || "Erreur base de données"); err.status = r.status; throw err; }
  return d;
}
// Appel de l'API Stripe (sans dépendance)
async function stripe(chemin, params, methode) {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("Paiement pas encore configuré (clé Stripe manquante)");
  const corpsForm = params ? encoder(params) : undefined;
  const r = await fetch("https://api.stripe.com/v1/" + chemin, {
    method: methode || (params ? "POST" : "GET"),
    headers: { Authorization: "Bearer " + cle, "Content-Type": "application/x-www-form-urlencoded" },
    body: corpsForm
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || "Erreur Stripe");
  return d;
}
function encoder(obj, prefixe) {
  const parts = [];
  for (const k in obj) {
    const v = obj[k]; if (v === undefined || v === null) continue;
    const cle = prefixe ? prefixe + "[" + k + "]" : k;
    if (typeof v === "object") parts.push(encoder(v, cle));
    else parts.push(encodeURIComponent(cle) + "=" + encodeURIComponent(v));
  }
  return parts.filter(Boolean).join("&");
}
function jetonDe(req) { const h = req.headers.authorization || ""; return h.startsWith("Bearer ") ? h.slice(7) : null; }
function origine(req) { return "https://" + (req.headers["x-forwarded-host"] || req.headers.host || "www.sundarly.com"); }
// Confirme une session Stripe en la relisant chez Stripe (on ne fait jamais confiance au navigateur)
async function confirmerSession(idSession) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(idSession || "")) throw new Error("Session invalide");
  const s = await stripe("checkout/sessions/" + encodeURIComponent(idSession));
  if (s.payment_status !== "paid") return { paye: false };
  const id = await rpc("serveur_confirmer_paiement", {
    p_cle: process.env.SUNDARLY_CLE_SERVEUR, p_session: s.id, p_paiement: s.payment_intent,
    p_montant_centimes: s.amount_total, p_devise: s.currency
  });
  return { paye: true, reservation: id };
}
module.exports = { json, corps, rpc, stripe, jetonDe, origine, confirmerSession };

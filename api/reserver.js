// Sundarly — crée la réservation (prix calculé par la base) puis la page de paiement Stripe
const { json, corps, rpc, stripe, jetonDe, origine } = require("./_commun");
module.exports = async function (req, res) {
  if (req.method !== "POST") return json(res, 405, { erreur: "Méthode non autorisée" });
  const jeton = jetonDe(req);
  if (!jeton) return json(res, 401, { erreur: "Connectez-vous pour réserver" });
  try {
    const b = await corps(req);
    const d = await rpc("creer_reservation", {
      p_annonce: String(b.annonce || ""), p_arrivee: String(b.arrivee || ""), p_depart: String(b.depart || ""),
      p_voyageurs: parseInt(b.voyageurs, 10) || 1, p_animal: !!b.animal
    }, jeton);
    const base = origine(req);
    const session = await stripe("checkout/sessions", {
      mode: "payment",
      locale: "fr",
      line_items: { 0: { quantity: 1, price_data: {
        currency: String(d.devise).toLowerCase(), unit_amount: Math.round(Number(d.total) * 100),
        product_data: { name: d.titre, description: d.nuits + " nuit(s) · " + new Date(b.arrivee + "T12:00:00").toLocaleDateString("fr-FR") + " → " + new Date(b.depart + "T12:00:00").toLocaleDateString("fr-FR") }
      } } },
      metadata: { reservation: d.reservation, annonce: d.annonce },
      payment_intent_data: { metadata: { reservation: d.reservation }, description: "Sundarly — réservation " + d.reservation },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: base + "/contrat.html?id=" + d.reservation + "&session={CHECKOUT_SESSION_ID}",
      cancel_url: base + "/logement.html?id=" + d.annonce + "&arrivee=" + encodeURIComponent(b.arrivee) + "&depart=" + encodeURIComponent(b.depart)
    });
    await rpc("serveur_lier_session", { p_cle: process.env.SUNDARLY_CLE_SERVEUR, p_reservation: d.reservation, p_session: session.id });
    return json(res, 200, { url: session.url });
  } catch (e) {
    console.error(e);
    return json(res, 400, { erreur: e.message || "La réservation n'a pas pu être créée" });
  }
};

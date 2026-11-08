// Sundarly — remboursement intégral d'une réservation (réservé à l'administratrice)
const { json, corps, rpc, stripe, jetonDe } = require("./_commun");
module.exports = async function (req, res) {
  if (req.method !== "POST") return json(res, 405, {});
  try {
    const jeton = jetonDe(req);
    const admin = jeton ? await rpc("est_admin", {}, jeton) : false;
    if (admin !== true) return json(res, 403, { erreur: "Accès réservé" });
    const b = await corps(req);
    const info = await rpc("serveur_info_remboursement", { p_cle: process.env.SUNDARLY_CLE_SERVEUR, p_reservation: String(b.reservation || "") });
    if (!info || !info.paye || !info.paiement) return json(res, 400, { erreur: "Aucun paiement à rembourser" });
    if (info.rembourse) return json(res, 400, { erreur: "Déjà remboursée" });
    await stripe("refunds", { payment_intent: info.paiement, reason: "requested_by_customer", metadata: { reservation: String(b.reservation) } });
    await rpc("serveur_marquer_rembourse", { p_cle: process.env.SUNDARLY_CLE_SERVEUR, p_reservation: String(b.reservation), p_montant: info.total });
    return json(res, 200, { ok: true });
  } catch (e) { console.error(e); return json(res, 400, { erreur: e.message }); }
};

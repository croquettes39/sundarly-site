// Sundarly — confirmation du paiement au retour de Stripe (vérifiée directement chez Stripe)
const { json, corps, confirmerSession } = require("./_commun");
module.exports = async function (req, res) {
  try {
    const b = req.method === "POST" ? await corps(req) : {};
    const s = b.session || (req.query && req.query.session);
    const r = await confirmerSession(String(s || ""));
    return json(res, 200, r);
  } catch (e) { console.error(e); return json(res, 400, { erreur: e.message }); }
};

// Sundarly — notification Stripe « paiement terminé » (au cas où le voyageur ferme la page avant le retour)
// Sécurité : on ne croit pas le contenu reçu, on relit la session directement chez Stripe.
const { json, corps, confirmerSession } = require("./_commun");
module.exports = async function (req, res) {
  if (req.method !== "POST") return json(res, 405, {});
  try {
    const ev = await corps(req);
    if (ev && ev.type && /^checkout\.session\.(completed|async_payment_succeeded)$/.test(ev.type) && ev.data && ev.data.object) {
      await confirmerSession(ev.data.object.id);
    }
    return json(res, 200, { recu: true });
  } catch (e) { console.error(e); return json(res, 200, { recu: true, note: e.message }); }
};

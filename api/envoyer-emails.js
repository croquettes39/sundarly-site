// Sundarly — envoie les e-mails préparés dans la table emails_a_envoyer (via Resend)
// Variables Vercel : RESEND_API_KEY, SUNDARLY_CLE_SERVEUR
// Seuls les e-mails déjà mis dans la file (par l'admin, en base) partent : appeler cette adresse ne fait rien d'autre.
const { json, rpc } = require("./_commun");
const EXPEDITEUR = "Sundarly <info@sundarly.com>";

module.exports = async function (req, res) {
  try {
    const cle = process.env.RESEND_API_KEY;
    if (!cle) return json(res, 500, { erreur: "Clé Resend manquante" });
    const lot = await rpc("serveur_emails_en_attente", { p_cle: process.env.SUNDARLY_CLE_SERVEUR, p_limite: 50 });
    if (!lot || !lot.length) return json(res, 200, { envoyes: 0, erreurs: 0, reste: false });
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: "Bearer " + cle, "Content-Type": "application/json" },
      body: JSON.stringify(lot.map(e => ({
        from: EXPEDITEUR, to: [e.destinataire], reply_to: "info@sundarly.com", subject: e.sujet, html: e.html,
        headers: { "List-Unsubscribe": "<mailto:info@sundarly.com?subject=D%C3%A9sinscription>" }
      })))
    });
    const d = await r.json().catch(() => ({}));
    let envoyes = 0, erreurs = 0;
    for (let i = 0; i < lot.length; i++) {
      const id = r.ok && d.data && d.data[i] && d.data[i].id;
      if (id) envoyes++; else erreurs++;
      await rpc("serveur_email_resultat", {
        p_cle: process.env.SUNDARLY_CLE_SERVEUR, p_id: lot[i].id, p_ok: !!id, p_resend_id: id || null,
        p_erreur: id ? null : ((d && (d.message || d.name)) || ("HTTP " + r.status))
      });
    }
    return json(res, 200, { envoyes, erreurs, reste: lot.length === 50, detail: r.ok ? undefined : d });
  } catch (e) { console.error(e); return json(res, 500, { erreur: e.message }); }
};

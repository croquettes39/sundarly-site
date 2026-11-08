// Sundarly — mes réservations (voyageur et hôte)
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var SYM = { EUR: "€", MAD: "DH", CHF: "CHF" };
  function prix(v, d) { return Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " " + (SYM[d] || d); }
  function j(d) { return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
  function etat(r) {
    if (r.statut === "annulee") return '<span class="badge badge-refus">Annulée</span>';
    if (!r.contrat_accepte_le) return '<span class="badge badge-cours">Contrat à accepter</span>';
    if (r.statut === "terminee") return '<span class="badge badge-ok">Séjour terminé</span>';
    return '<span class="badge badge-ok">Confirmée</span>';
  }
  function carte(r) {
    var lien = "contrat.html?id=" + encodeURIComponent(r.id);
    var action = r.role === "voyageur" && !r.contrat_accepte_le && r.statut !== "annulee" ? '<a class="btn" href="' + lien + '">Accepter le contrat</a>' : '<a class="pilule" href="' + lien + '">Voir le contrat</a>';
    return '<article class="resa-carte">' + (r.photo ? '<img src="' + esc(r.photo) + '" alt="" loading="lazy">' : "") +
      '<div><strong>' + esc(r.titre) + '</strong><p class="gris petit">' + esc(r.ville) + " · " + j(r.arrivee) + " → " + j(r.depart) + " · " + r.voyageurs + " voyageur(s)" +
      (r.autre ? " · " + (r.role === "voyageur" ? "hôte : " : "voyageur : ") + esc(r.autre) : "") + "</p>" +
      "<p>" + etat(r) + " " + (r.role === "voyageur" ? "Payé : <strong>" + prix(r.total, r.devise) + "</strong>" : "Vous recevrez : <strong>" + prix(r.montant_hote, r.devise) + "</strong>") + "</p>" +
      (r.motif ? '<p class="gris petit">' + esc(r.motif) + "</p>" : "") + action + "</div></article>";
  }
  A.exiger("reservations.html").then(function () { return client.rpc("mes_reservations"); }).then(function (r) {
    if (r.error) throw r.error;
    var l = r.data || [];
    var v = l.filter(function (x) { return x.role === "voyageur"; }), h = l.filter(function (x) { return x.role === "hote"; });
    $("voyages").innerHTML = v.length ? v.map(carte).join("") : '<p class="vide">Aucun voyage pour le moment. <a href="logements.html">Découvrir les logements</a></p>';
    $("hote").innerHTML = h.length ? h.map(carte).join("") : '<p class="vide">Aucune réservation de vos logements pour le moment.</p>';
    $("chargement").hidden = true; $("contenu").hidden = false;
  }).catch(function (e) { console.error(e); $("chargement").textContent = "Impossible de charger vos réservations. Rechargez la page."; });
})();

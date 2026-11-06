// Sundarly — outils communs aux pages voyageurs (catalogue + fiche logement)
(function () {
  "use strict";
  var A = window.SundarlyAuth || {}, client = A.client;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pluriel(n, un, plusieurs) { return n + " " + (n > 1 ? plusieurs : un); }
  function devise() { return window.SUNDARLY_DEVISE ? window.SUNDARLY_DEVISE() : "EUR"; }
  // Prix d'une annonce (dans sa devise) converti dans la devise du visiteur
  function prix(montant, deviseAnnonce, dec) {
    if (montant == null) return "";
    var v = window.SUNDARLY_CONVERTIR ? window.SUNDARLY_CONVERTIR(Number(montant), deviseAnnonce, devise()) : Number(montant);
    return window.SUNDARLY_FORMATER ? window.SUNDARLY_FORMATER(dec ? v : Math.round(v), devise(), dec || 0) : Math.round(v) + " " + deviseAnnonce;
  }
  function valeur(montant, deviseAnnonce) {
    return window.SUNDARLY_CONVERTIR ? window.SUNDARLY_CONVERTIR(Number(montant), deviseAnnonce, devise()) : Number(montant);
  }
  function nuits(arrivee, depart) {
    if (!arrivee || !depart) return 0;
    var n = Math.round((new Date(depart + "T12:00:00") - new Date(arrivee + "T12:00:00")) / 864e5);
    return n > 0 ? n : 0;
  }
  // Calcul du séjour : nuits × prix, réductions, ménage — jamais de frais de service
  // Promotions (comme Airbnb) : on applique la plus avantageuse, elles ne se cumulent pas
  function promotions(a, n, arrivee) {
    var liste = [];
    if (a.promo_nouvelle_active) liste.push([20, "Promotion nouvelle annonce (-20 %)"]);
    if (n >= 28 && a.reduction_mois) liste.push([a.reduction_mois, "Réduction au mois (-" + a.reduction_mois + " %)"]);
    if (n >= 7 && a.reduction_semaine) liste.push([a.reduction_semaine, "Réduction à la semaine (-" + a.reduction_semaine + " %)"]);
    if (arrivee) {
      var jours = Math.round((new Date(arrivee + "T12:00:00") - new Date(new Date().toDateString() + " 12:00:00")) / 864e5);
      if (a.reduction_anticipee && jours >= (a.anticipee_jours || 90)) liste.push([a.reduction_anticipee, "Réservation anticipée (-" + a.reduction_anticipee + " %)"]);
      if (a.reduction_derniere_minute && jours >= 0 && jours <= (a.derniere_minute_jours || 7)) liste.push([a.reduction_derniere_minute, "Dernière minute (-" + a.reduction_derniere_minute + " %)"]);
    }
    liste.sort(function (x, y) { return y[0] - x[0]; });
    return liste[0] || null;
  }
  // Badge court pour les cartes d'annonces
  function badgePromo(a) {
    if (a.promo_nouvelle_active) return "-20 % · Nouvelle annonce";
    var m = Math.max(a.reduction_semaine || 0, a.reduction_mois || 0, a.reduction_anticipee || 0, a.reduction_derniere_minute || 0);
    return m ? "Jusqu'à -" + m + " %" : "";
  }
  function calculSejour(a, n, arrivee, animal) {
    var base = Number(a.prix_nuit) * n, best = promotions(a, n, arrivee);
    var red = best ? base * best[0] / 100 : 0;
    var menage = Number(a.frais_menage || 0);
    var fraisAnimaux = animal && a.animaux ? Number(a.frais_animaux || 0) : 0;
    return { base: base, reduction: red, libelleReduction: best ? best[1] : "", menage: menage, animaux: fraisAnimaux, total: base - red + menage + fraisAnimaux };
  }
  // Étoiles « ★ 4,87 (12) » ou « Nouveau »
  function note(a) {
    return a.nb_avis ? "★ " + Number(a.note_moyenne).toFixed(2).replace(".", ",") + " (" + a.nb_avis + ")" : "★ Nouveau";
  }

  // Qui regarde ? (site ouvert au public, ou aperçu administrateur)
  function acces() {
    if (!client) return Promise.resolve({ ouvert: false, admin: false });
    return Promise.all([client.rpc("site_ouvert"), A.session ? A.session() : Promise.resolve(null)]).then(function (r) {
      var ouvert = !!(r[0] && r[0].data);
      if (!r[1]) return { ouvert: ouvert, admin: false };
      return client.rpc("est_admin").then(function (x) { return { ouvert: ouvert, admin: !!(x && x.data) }; });
    }).catch(function () { return { ouvert: false, admin: false }; });
  }

  var TYPES_ESPACE = { logement_entier: "Logement entier", chambre_privee: "Chambre privée", chambre_partagee: "Chambre partagée" };

  window.SundarlyVoyage = {
    client: client, esc: esc, pluriel: pluriel, devise: devise, prix: prix, valeur: valeur,
    nuits: nuits, calculSejour: calculSejour, promotions: promotions, badgePromo: badgePromo, note: note, acces: acces, TYPES_ESPACE: TYPES_ESPACE
  };
})();

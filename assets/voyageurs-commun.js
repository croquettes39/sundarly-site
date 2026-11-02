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
  function calculSejour(a, n) {
    var base = Number(a.prix_nuit) * n, red = 0, libelleRed = "";
    if (n >= 28 && a.reduction_mois) { red = base * a.reduction_mois / 100; libelleRed = "Réduction au mois (-" + a.reduction_mois + " %)"; }
    else if (n >= 7 && a.reduction_semaine) { red = base * a.reduction_semaine / 100; libelleRed = "Réduction à la semaine (-" + a.reduction_semaine + " %)"; }
    var menage = Number(a.frais_menage || 0);
    return { base: base, reduction: red, libelleReduction: libelleRed, menage: menage, total: base - red + menage };
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
    nuits: nuits, calculSejour: calculSejour, acces: acces, TYPES_ESPACE: TYPES_ESPACE
  };
})();

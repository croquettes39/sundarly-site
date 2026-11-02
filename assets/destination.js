// Sundarly — pages destinations : affiche les logements de la ville (quand le site est ouvert, ou en aperçu admin)
(function () {
  "use strict";
  var V = window.SundarlyVoyage, zone = document.getElementById("logements-dest");
  if (!V || !zone || !V.client) return;
  var esc = V.esc;
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  var ville = norm(zone.getAttribute("data-ville"));
  var DONNEES = [];

  function afficher() {
    var g = document.getElementById("grille-dest");
    var liste = DONNEES.filter(function (a) { return norm(a.ville + " " + a.titre).indexOf(ville) >= 0; }).slice(0, 8);
    document.getElementById("vide-dest").hidden = liste.length > 0;
    g.innerHTML = liste.map(function (a) {
      var photo = a.photos && a.photos[0] ? '<img src="' + esc(a.photos[0]) + '" alt="' + esc(a.titre) + '" loading="lazy">' : "";
      return '<article class="carte-logement"><a class="cl-photos" href="/logement?id=' + a.id + '" style="display:block">' + photo + "</a>" +
        '<a class="cl-texte" href="/logement?id=' + a.id + '"><span class="cl-lieu">' + esc(a.ville) + ", " + esc(a.pays) + '</span><span class="cl-titre">' + esc(a.titre) + "</span>" +
        '<span class="cl-gris">' + esc(a.type_logement) + " · " + V.pluriel(a.voyageurs, "voyageur", "voyageurs") + "</span>" +
        '<span class="cl-prix"><strong>' + esc(V.prix(a.prix_nuit, a.devise)) + "</strong> par nuit</span></a></article>";
    }).join("");
  }

  V.acces().then(function (acc) {
    if (!acc.ouvert && !acc.admin) return;
    return V.client.rpc("catalogue").then(function (r) { if (!r.error) { DONNEES = r.data || []; afficher(); } });
  }).catch(function () {});
  document.addEventListener("sundarly:devise", function () { if (DONNEES.length) afficher(); });
})();

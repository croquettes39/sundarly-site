// Sundarly — page « Trouver un logement » (catalogue + carte)
(function () {
  "use strict";
  var V = window.SundarlyVoyage, client = V.client, esc = V.esc;
  function $(id) { return document.getElementById(id); }
  var TOUS = [], TYPE = "", ACCES = { admin: false };
  var form = $("recherche");
  var params = new URLSearchParams(location.search);
  ["q", "arrivee", "depart", "voyageurs"].forEach(function (n) { if (params.get(n)) form.elements[n].value = params.get(n); });
  TYPE = params.get("type") || "";

  // Dates : pas dans le passé, départ après l'arrivée
  var aujourd = new Date().toISOString().slice(0, 10);
  form.elements.arrivee.min = aujourd;
  form.elements.arrivee.addEventListener("change", function () {
    form.elements.depart.min = this.value || aujourd;
    if (form.elements.depart.value && form.elements.depart.value <= this.value) form.elements.depart.value = "";
  });

  V.acces().then(function (acc) {
    ACCES = acc;
    if (!acc.ouvert && !acc.admin) { fermer(); return; }
    if (acc.admin && !acc.ouvert) $("bandeau-apercu").hidden = false;
    return client.rpc("catalogue").then(function (r) {
      if (r.error) throw r.error;
      TOUS = r.data || [];
      construireFiltres(); afficher();
    });
  }).catch(function (e) { console.error(e); $("resultats-titre").textContent = "Impossible de charger les logements pour le moment."; });

  function fermer() {
    $("zone").hidden = true; form.hidden = true; $("filtres").hidden = true;
    $("bientot").hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = new URLSearchParams();
    ["q", "arrivee", "depart", "voyageurs"].forEach(function (n) { if (form.elements[n].value) p.set(n, form.elements[n].value); });
    if (TYPE) p.set("type", TYPE);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
    afficher();
  });
  document.addEventListener("sundarly:devise", function () { if (TOUS.length) afficher(); });

  function construireFiltres() {
    var types = [];
    TOUS.forEach(function (a) { if (types.indexOf(a.type_logement) < 0) types.push(a.type_logement); });
    var z = $("filtres");
    z.innerHTML = ['<button type="button" data-type=""' + (TYPE ? "" : ' aria-pressed="true"') + ">Tous les logements</button>"]
      .concat(types.sort().map(function (t) { return '<button type="button" data-type="' + esc(t) + '"' + (TYPE === t ? ' aria-pressed="true"' : "") + ">" + esc(t) + "</button>"; })).join("");
    z.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        TYPE = b.getAttribute("data-type");
        z.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        afficher();
      });
    });
  }

  function filtrer() {
    var q = (form.elements.q.value || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    var voy = parseInt(form.elements.voyageurs.value, 10) || 0;
    return TOUS.filter(function (a) {
      if (TYPE && a.type_logement !== TYPE) return false;
      if (voy && a.voyageurs < voy) return false;
      if (q) {
        var t = (a.ville + " " + a.pays + " " + a.titre + " " + a.type_logement).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (t.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function lienFiche(a) {
    var p = new URLSearchParams({ id: a.id });
    ["arrivee", "depart", "voyageurs"].forEach(function (n) { if (form.elements[n].value) p.set(n, form.elements[n].value); });
    return "logement.html?" + p;
  }

  function afficher() {
    var liste = filtrer();
    var n = V.nuits(form.elements.arrivee.value, form.elements.depart.value);
    var q = form.elements.q.value.trim();
    $("resultats-titre").textContent = liste.length
      ? V.pluriel(liste.length, "logement", "logements") + (q ? " · « " + q + " »" : "") + (n ? " · " + V.pluriel(n, "nuit", "nuits") : "")
      : "Aucun logement ne correspond à votre recherche.";
    var g = $("grille"); g.innerHTML = "";
    liste.forEach(function (a) { g.appendChild(carte(a, n)); });
    majCarte(liste);
  }

  function carte(a, n) {
    var el = document.createElement("article"); el.className = "carte-logement";
    var photos = (a.photos || []).slice(0, 6);
    var statut = ACCES.admin && a.statut !== "en_ligne" ? '<span class="pastille-statut">' + (a.statut === "validee" ? "Validée · pas encore en ligne" : "En attente de validation") + "</span>" : "";
    var badge = V.badgePromo(a);
    var prixTxt = n ? "<strong>" + esc(V.prix(V.calculSejour(a, n, form.elements.arrivee.value).total, a.devise)) + "</strong> au total" : "<strong>" + esc(V.prix(a.prix_nuit, a.devise)) + "</strong> par nuit";
    el.innerHTML =
      '<div class="cl-photos">' +
        '<a class="cl-lien-photo" href="' + lienFiche(a) + '"><div class="cl-piste">' + photos.map(function (u, i) { return '<img src="' + esc(u) + '" alt="" loading="' + (i ? "lazy" : "eager") + '">'; }).join("") + "</div></a>" +
        statut + (badge && !statut ? '<span class="pastille-promo">' + esc(badge) + "</span>" : "") +
        (photos.length > 1 ? '<button type="button" class="cl-fleche cl-prec" aria-label="Photo précédente">‹</button><button type="button" class="cl-fleche cl-suiv" aria-label="Photo suivante">›</button><div class="cl-points">' + photos.map(function (_, i) { return "<i" + (i ? "" : ' class="actif"') + "></i>"; }).join("") + "</div>" : "") +
      "</div>" +
      '<a class="cl-texte" href="' + lienFiche(a) + '">' +
        '<span class="cl-ligne1"><span class="cl-lieu">' + esc(a.ville) + ", " + esc(a.pays) + '</span><span class="cl-note">' + esc(V.note(a)) + "</span></span>" +
        '<span class="cl-titre">' + esc(a.titre) + "</span>" +
        '<span class="cl-gris">' + esc(a.type_logement) + " · " + V.pluriel(a.voyageurs, "voyageur", "voyageurs") + " · " + V.pluriel(a.chambres, "chambre", "chambres") + "</span>" +
        '<span class="cl-gris">Hôte : ' + esc(a.hote_prenom || "") + (a.hote_verifie ? ' <span class="cl-verifie">· identité vérifiée</span>' : "") + "</span>" +
        '<span class="cl-prix">' + prixTxt + (n ? ' <span class="cl-gris">· ' + V.pluriel(n, "nuit", "nuits") + "</span>" : "") + "</span>" +
      "</a>";
    // Mini-carrousel de photos
    var piste = el.querySelector(".cl-piste"), i = 0;
    function aller(k) {
      i = (k + photos.length) % photos.length;
      piste.style.transform = "translateX(-" + (i * 100) + "%)";
      el.querySelectorAll(".cl-points i").forEach(function (p, j) { p.classList.toggle("actif", j === i); });
    }
    if (photos.length > 1) {
      el.querySelector(".cl-prec").addEventListener("click", function () { aller(i - 1); });
      el.querySelector(".cl-suiv").addEventListener("click", function () { aller(i + 1); });
    }
    el.addEventListener("mouseenter", function () { var m = MARQUEURS[a.id]; if (m) m.getElement() && m.getElement().classList.add("survol"); });
    el.addEventListener("mouseleave", function () { var m = MARQUEURS[a.id]; if (m) m.getElement() && m.getElement().classList.remove("survol"); });
    return el;
  }

  // ---------- Carte (position approximative, ~1 km) ----------
  var CARTE = null, COUCHE = null, MARQUEURS = {};
  function majCarte(liste) {
    if (!window.L) { $("carte-zone").hidden = true; return; }
    if (!CARTE) {
      CARTE = L.map("carte", { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(CARTE);
      COUCHE = L.layerGroup().addTo(CARTE);
      CARTE.setView([31.63, -8.0], 6);
    }
    COUCHE.clearLayers(); MARQUEURS = {};
    var points = [];
    // décale légèrement les logements qui tombent au même endroit
    var vus = {};
    liste.forEach(function (a) {
      if (a.latitude == null) return;
      var cle = a.latitude + "," + a.longitude, k = vus[cle] = (vus[cle] || 0) + 1;
      var lat = a.latitude + (k - 1) * 0.004, lng = a.longitude + (k - 1) * 0.004;
      var icone = L.divIcon({ className: "marqueur-prix", html: "<span>" + esc(V.prix(a.prix_nuit, a.devise)) + "</span>", iconSize: null });
      var m = L.marker([lat, lng], { icon: icone }).addTo(COUCHE);
      m.on("click", function () { location.href = lienFiche(a); });
      MARQUEURS[a.id] = m; points.push([lat, lng]);
    });
    if (points.length === 1) CARTE.setView(points[0], 12);
    else if (points.length) CARTE.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
    setTimeout(function () { CARTE.invalidateSize(); }, 50);
  }

  // Sur téléphone : bouton « Carte » / « Liste »
  var bc = $("bouton-carte");
  function majBouton() { bc.hidden = window.innerWidth >= 1000 || $("zone").hidden; }
  window.addEventListener("resize", majBouton); setTimeout(majBouton, 0);
  bc.addEventListener("click", function () {
    var montre = document.body.classList.toggle("voir-carte");
    bc.querySelector("span").textContent = montre ? "Liste" : "Carte";
    if (CARTE) setTimeout(function () { CARTE.invalidateSize(); }, 50);
  });
})();

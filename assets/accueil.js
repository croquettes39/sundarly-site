// Sundarly — page d'accueil façon Airbnb : rangées de logements par ville
(function () {
  "use strict";
  var V = window.SundarlyVoyage; if (!V || !V.client) return;
  var esc = V.esc, zone = document.getElementById("rangees");
  if (!zone) return;

  // Favoris (cœur) : gardés dans ce navigateur
  var FAV = {};
  try { FAV = JSON.parse(localStorage.getItem("sundarly-favoris") || "{}") || {}; } catch (e) {}
  function sauverFav() { try { localStorage.setItem("sundarly-favoris", JSON.stringify(FAV)); } catch (e) {} }

  function nomVille(v) {
    v = String(v || "").trim();
    if (/ourika/i.test(v)) return "Vallée de l'Ourika";
    return v.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
  }
  var COEUR = '<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true"><path d="M16 28c7-4.7 14-10 14-17 0-3.9-3.1-7-7-7-2.7 0-5 1.5-7 4-2-2.5-4.3-4-7-4-3.9 0-7 3.1-7 7 0 7 7 12.3 14 17z"/></svg>';

  function carte(a) {
    var badge = V.badgePromo(a) || (a.nb_avis && a.note_moyenne >= 4.8 ? "Coup de cœur voyageurs" : "");
    return '<a class="ac-carte" href="' + (a.slug ? "/logement/" + a.slug : "/logement?id=" + encodeURIComponent(a.id)) + '">' +
      '<div class="ac-photo"><img src="' + esc(a.photos && a.photos[0]) + '" alt="" loading="lazy">' +
      (badge ? '<span class="ac-badge">' + esc(badge) + "</span>" : "") +
      '<button type="button" class="ac-coeur' + (FAV[a.id] ? " actif" : "") + '" data-fav="' + esc(a.id) + '" aria-label="Ajouter aux favoris" aria-pressed="' + (FAV[a.id] ? "true" : "false") + '">' + COEUR + "</button></div>" +
      '<p class="ac-titre">' + esc(a.type_logement || "Logement") + " · " + esc(nomVille(a.ville)) + "</p>" +
      '<p class="ac-info">' + V.pluriel(a.lits || 1, "lit", "lits") + " · " + esc(V.note(a)) + "</p>" +
      '<p class="ac-prix"><strong>' + esc(V.prix(a.prix_nuit, a.devise)) + "</strong> par nuit</p></a>";
  }
  function rangee(titre, lien, liste) {
    if (!liste.length) return "";
    return '<div class="rangee"><div class="rangee-tete"><h2>' + (lien ? '<a href="' + lien + '">' + esc(titre) + ' <span aria-hidden="true">›</span></a>' : esc(titre)) + "</h2>" +
      '<div class="rangee-fleches"><button type="button" data-defiler="-1" aria-label="Précédent">‹</button><button type="button" data-defiler="1" aria-label="Suivant">›</button></div></div>' +
      '<div class="rangee-piste">' + liste.map(carte).join("") + "</div></div>";
  }

  V.acces().then(function (acc) {
    if (!acc.ouvert && !acc.admin) return null;
    return V.client.rpc("catalogue");
  }).then(function (r) {
    if (!r || r.error || !r.data || !r.data.length) { zone.closest("section").hidden = true; return; }
    var L = r.data.filter(function (a) { return a.statut === "en_ligne" || a.statut === "validee"; });
    // Regroupement par ville, de la plus fournie à la moins fournie
    var villes = {};
    L.forEach(function (a) { var v = nomVille(a.ville); (villes[v] = villes[v] || []).push(a); });
    var ordre = Object.keys(villes).sort(function (x, y) { return villes[y].length - villes[x].length; });
    var html = "";
    var promos = L.filter(function (a) { return V.badgePromo(a); });
    if (promos.length >= 3) html += rangee("En promotion en ce moment", "logements.html", promos);
    ordre.forEach(function (v) { html += rangee("Logements à " + v, "logements.html?q=" + encodeURIComponent(v), villes[v]); });
    html += rangee("Nouveautés sur Sundarly", "logements.html", L.slice().sort(function (x, y) { return new Date(y.created_at) - new Date(x.created_at); }).slice(0, 12));
    zone.innerHTML = html;
    var dl = document.getElementById("br-villes");
    if (dl) dl.innerHTML = ordre.map(function (v) { return '<option value="' + esc(v) + '">'; }).join("");
  }).catch(function (e) { console.error(e); zone.closest("section").hidden = true; });

  zone.addEventListener("click", function (e) {
    var f = e.target.closest("[data-fav]");
    if (f) {
      e.preventDefault(); e.stopPropagation();
      var id = f.getAttribute("data-fav");
      if (FAV[id]) delete FAV[id]; else FAV[id] = 1;
      sauverFav();
      f.classList.toggle("actif", !!FAV[id]); f.setAttribute("aria-pressed", FAV[id] ? "true" : "false");
      return;
    }
    var d = e.target.closest("[data-defiler]");
    if (d) {
      var piste = d.closest(".rangee").querySelector(".rangee-piste");
      piste.scrollBy({ left: Number(d.getAttribute("data-defiler")) * piste.clientWidth * 0.9, behavior: "smooth" });
    }
  });

  // Barre de recherche : le départ ne peut pas précéder l'arrivée
  var f = document.querySelector(".barre-recherche");
  if (f) {
    var auj = new Date().toISOString().slice(0, 10);
    f.elements.arrivee.min = auj; f.elements.depart.min = auj;
    f.elements.arrivee.addEventListener("change", function () { f.elements.depart.min = this.value || auj; if (f.elements.depart.value && f.elements.depart.value <= this.value) f.elements.depart.value = ""; });
    f.addEventListener("submit", function () { Array.prototype.forEach.call(f.elements, function (el) { if (el.name && !el.value) el.disabled = true; }); });
  }
})();

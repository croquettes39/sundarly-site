// Sundarly — fiche d'un logement (côté voyageur)
(function () {
  "use strict";
  var V = window.SundarlyVoyage, client = V.client, esc = V.esc;
  function $(id) { return document.getElementById(id); }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  var params = new URLSearchParams(location.search);
  var ID = params.get("id") || "";
  var A = null, ACCES = null;
  var OUVERTURE = "2026-11-20";

  var ANNULATION = {
    souple: ["Souple", "Annulation gratuite jusqu'à 24 h avant l'arrivée : remboursement intégral."],
    moderee: ["Modérée", "Annulation gratuite jusqu'à 5 jours avant l'arrivée : remboursement intégral."],
    stricte: ["Stricte", "Remboursement de 50 % jusqu'à 7 jours avant l'arrivée, aucun remboursement ensuite."]
  };

  if (!/^[0-9a-f-]{36}$/i.test(ID)) { indisponible(); return; }
  // garde la recherche pour le lien « Tous les logements »
  (function () { var p = new URLSearchParams(location.search); p.delete("id"); if (p.toString()) $("lien-retour").href = "logements.html?" + p; })();

  V.acces().then(function (acc) {
    ACCES = acc;
    if (!acc.ouvert && !acc.admin) { indisponible(); return; }
    if (acc.admin && !acc.ouvert) $("bandeau-apercu").hidden = false;
    return client.rpc("fiche_logement", { annonce: ID }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) { indisponible(); return; }
      A = r.data; rendre();
    });
  }).catch(function (e) { console.error(e); $("chargement").textContent = "Impossible de charger ce logement pour le moment."; });

  function indisponible() {
    $("fiche").hidden = true; $("bientot").hidden = false;
    var m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m);
  }

  // Référencement : titre, description, lien canonique, partage et données structurées du logement
  function meta(attr, nom, valeur) {
    var el = document.head.querySelector("meta[" + attr + '="' + nom + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, nom); document.head.appendChild(el); }
    el.setAttribute("content", valeur);
  }
  function seo() {
    var url = "https://www.sundarly.com/logement?id=" + A.id;
    var titre = A.titre + " – " + A.type_logement + " à " + A.ville + " | Sundarly";
    var desc = (A.type_logement + " à " + A.ville + ", " + A.pays + " · " + V.pluriel(A.voyageurs, "voyageur", "voyageurs") + ", " + V.pluriel(A.chambres, "chambre", "chambres") + ". " + String(A.description || "").replace(/\s+/g, " ")).slice(0, 155);
    document.title = titre;
    meta("name", "description", desc);
    meta("property", "og:title", titre); meta("property", "og:description", desc); meta("property", "og:url", url);
    meta("name", "twitter:title", titre); meta("name", "twitter:description", desc);
    if (A.photos && A.photos[0]) { meta("property", "og:image", A.photos[0]); meta("name", "twitter:image", A.photos[0]); }
    var c = document.head.querySelector('link[rel="canonical"]'); if (c) c.href = url;
    var ld = {
      "@context": "https://schema.org", "@type": "VacationRental", "@id": url, "identifier": A.id, "name": A.titre, "url": url,
      "description": String(A.description || ""), "image": (A.photos || []).slice(0, 8),
      "address": { "@type": "PostalAddress", "addressLocality": A.ville, "addressCountry": A.pays },
      "latitude": Number(A.latitude), "longitude": Number(A.longitude),
      "containsPlace": { "@type": "Accommodation", "additionalType": A.type_espace === "logement_entier" ? "EntirePlace" : "PrivateRoom",
        "occupancy": { "@type": "QuantitativeValue", "value": A.voyageurs }, "numberOfBedrooms": A.chambres, "numberOfBathroomsTotal": A.salles_de_bain,
        "amenityFeature": (A.equipements || []).map(function (e) { return { "@type": "LocationFeatureSpecification", "name": e, "value": true }; }) },
      "brand": { "@type": "Brand", "name": "Sundarly" }
    };
    var s = document.getElementById("ld-logement");
    if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ld-logement"; document.head.appendChild(s); }
    s.textContent = JSON.stringify(ld);
  }
  document.addEventListener("sundarly:devise", function () { if (A) { rendre(); } });

  function liste(t, items) { return items && items.length ? "<section class=\"fi-bloc\"><h2>" + esc(t) + '</h2><ul class="fi-equip">' + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" : ""; }
  function texte(t, s) { return s ? '<section class="fi-bloc"><h2>' + esc(t) + "</h2><p>" + nl(s) + "</p></section>" : ""; }

  function rendre() {
    seo();
    var p = A.photos || [];
    var depuis = A.hote_depuis ? new Date(A.hote_depuis).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
    var regles = [];
    if (A.heure_arrivee) regles.push("Arrivée à partir de " + A.heure_arrivee);
    if (A.heure_depart) regles.push("Départ avant " + A.heure_depart);
    regles.push("Jusqu'à " + V.pluriel(A.voyageurs, "voyageur", "voyageurs"));
    regles.push(A.animaux ? "Animaux acceptés" + (A.frais_animaux ? " (frais : " + V.prix(A.frais_animaux, A.devise) + " par séjour)" : ", sans frais") : "Animaux non acceptés");
    regles.push(A.fumeurs ? "Logement fumeur" : "Non-fumeur");
    regles.push(A.fetes ? "Fêtes autorisées" : "Pas de fêtes ni d'événements");
    if (A.nuits_min > 1) regles.push(V.pluriel(A.nuits_min, "nuit", "nuits") + " minimum");
    var secu = (A.securite || []).slice();
    (A.equipements || []).forEach(function (e) { if (/Détecteur|Extincteur|premiers secours|Caméras/.test(e) && secu.indexOf(e) < 0) secu.push(e); });
    if (!secu.some(function (x) { return /monoxyde/.test(x); })) secu.push("Aucune indication de la présence d'un détecteur de monoxyde de carbone");
    if (!secu.some(function (x) { return /fumée/.test(x); })) secu.push("Aucune indication de la présence d'un détecteur de fumée");
    var an = ANNULATION[A.annulation] || ["", ""];
    var statut = ACCES.admin && A.statut !== "en_ligne" ? '<p class="fi-statut">' + (A.statut === "validee" ? "Validée — pas encore en ligne pour les visiteurs" : "En attente de validation — visible seulement par vous") + "</p>" : "";

    $("fiche").innerHTML =
      statut +
      '<h1 class="fi-titre">' + esc(A.titre) + "</h1>" +
      '<p class="fi-sous">' + esc(A.ville) + ", " + esc(A.pays) + (A.hote_verifie ? ' · <span class="fi-verifie">Hôte vérifié</span>' : "") + ' · <a href="#fi-avis" class="fi-note" id="fi-note">★ Nouveau</a></p>' +
      '<div class="fi-photos n' + Math.min(p.length, 5) + '">' + p.slice(0, 5).map(function (u, i) { return '<button type="button" class="fi-photo" data-photo="' + i + '"><img src="' + esc(u) + '" alt="Photo ' + (i + 1) + '"' + (i ? ' loading="lazy"' : "") + "></button>"; }).join("") +
        (p.length > 1 ? '<button type="button" class="fi-toutes" data-photo="0">Afficher les ' + p.length + " photos</button>" : "") + "</div>" +
      '<div class="fi-grille"><div class="fi-gauche">' +
        '<section class="fi-resume"><h2>' + esc(V.TYPES_ESPACE[A.type_espace] || "") + " · " + esc(A.type_logement) + " · " + esc(A.ville) + "</h2>" +
          "<p>" + V.pluriel(A.voyageurs, "voyageur", "voyageurs") + " · " + V.pluriel(A.chambres, "chambre", "chambres") + " · " + V.pluriel(A.lits, "lit", "lits") + " · " + V.pluriel(A.salles_de_bain, "salle de bain", "salles de bain") + "</p></section>" +
        '<section class="fi-hote"><span class="fi-avatar">' + esc((A.hote_prenom || "H").charAt(0)) + "</span><div><strong>Hôte : " + esc(A.hote_prenom || "") + "</strong><span>" + (A.hote_verifie ? "Identité vérifiée par Sundarly" : "") + (depuis ? (A.hote_verifie ? " · " : "") + "Sur Sundarly depuis " + depuis : "") + "</span></div></section>" +
        '<section class="fi-atouts">' +
          "<div><strong>Aucun frais caché</strong><span>Le prix affiché est le prix que vous payez : pas de frais de service.</span></div>" +
          "<div><strong>Annulation " + esc(an[0].toLowerCase()) + "</strong><span>" + esc(an[1]) + "</span></div>" +
          "<div><strong>Paiement sécurisé</strong><span>Vous payez sur Sundarly ; l'hôte est payé après votre arrivée.</span></div>" +
        "</section>" +
        '<section class="fi-bloc"><p>' + nl(A.description) + "</p></section>" +
        texte("Le logement", A.mon_logement) + texte("Accès des voyageurs", A.acces_voyageurs) + texte("Échanges avec l'hôte", A.echanges_voyageurs) + texte("Autres informations à noter", A.autres_infos) +
        liste("Ce que propose ce logement", (A.equipements || []).filter(function (e) { return !/Détecteur|Extincteur|premiers secours|Caméras/.test(e); })) +
        liste("Accessibilité", A.accessibilite) +
        '<section class="fi-bloc" id="fi-avis"></section>' +
        '<section class="fi-bloc"><h2>Où se situe le logement</h2><p>' + esc(A.ville) + ", " + esc(A.pays) + '</p><div class="fi-carte" id="fi-carte"></div><p class="fi-gris">Pour la sécurité de l\'hôte, la zone affichée est approximative. L\'adresse exacte vous est communiquée après la réservation.</p></section>' +
        '<section class="fi-bloc fi-trois"><div><h3>Règlement intérieur</h3><ul>' + regles.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" + (A.reglement ? "<p>" + nl(A.reglement) + "</p>" : "") + "</div>" +
          "<div><h3>Sécurité et logement</h3><ul>" + secu.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
          "<div><h3>Conditions d'annulation</h3><p><strong>" + esc(an[0]) + "</strong><br>" + esc(an[1]) + "</p>" + (A.caution ? '<p class="fi-gris">Caution : ' + esc(V.prix(A.caution, A.devise)) + "</p>" : "") + "</div></section>" +
      "</div>" +
      '<aside class="fi-reservation" id="reservation"></aside></div>' +
      '<div class="fi-barre-mobile" id="barre-mobile"></div>';

    chargerAvis();
    $("fiche").querySelectorAll("[data-photo]").forEach(function (b) { b.addEventListener("click", function () { ouvrirGalerie(+b.getAttribute("data-photo")); }); });
    rendreReservation();
    carte();
  }

  // ---------- Réservation (calcul du prix, réservations ouvertes le 20 novembre) ----------
  var SEJ = { arrivee: params.get("arrivee") || "", depart: params.get("depart") || "", voyageurs: parseInt(params.get("voyageurs"), 10) || 1 };
  function rendreReservation() {
    var z = $("reservation"), n = V.nuits(SEJ.arrivee, SEJ.depart);
    var c = n ? V.calculSejour(A, n, SEJ.arrivee, SEJ.animal) : null;
    var promos = [];
    if (A.promo_nouvelle_active) promos.push("-20 % : promotion nouvelle annonce");
    if (A.reduction_semaine) promos.push("-" + A.reduction_semaine + " % dès 7 nuits");
    if (A.reduction_mois) promos.push("-" + A.reduction_mois + " % dès 28 nuits");
    if (A.reduction_anticipee) promos.push("-" + A.reduction_anticipee + " % en réservant " + (A.anticipee_jours >= 365 ? "1 an" : Math.round(A.anticipee_jours / 30) + " mois") + " à l'avance");
    if (A.reduction_derniere_minute) promos.push("-" + A.reduction_derniere_minute + " % pour une arrivée dans moins de " + V.pluriel(A.derniere_minute_jours, "jour", "jours"));
    var min = new Date().toISOString().slice(0, 10);
    var erreur = "";
    if (n && n < (A.nuits_min || 1)) erreur = "Ce logement se loue " + V.pluriel(A.nuits_min, "nuit", "nuits") + " minimum.";
    else if (n && A.nuits_max && n > A.nuits_max) erreur = "Ce logement se loue " + A.nuits_max + " nuits maximum.";
    if (SEJ.voyageurs > A.voyageurs) erreur = "Ce logement accueille " + V.pluriel(A.voyageurs, "voyageur", "voyageurs") + " maximum.";
    var ouvert = ACCES.ouvert && new Date().toISOString().slice(0, 10) >= OUVERTURE;
    z.innerHTML =
      '<p class="fr-prix"><strong>' + esc(V.prix(A.prix_nuit, A.devise)) + "</strong> par nuit</p>" +
      (promos.length ? '<div class="fr-promos"><strong>🎁 Promotions</strong><ul>' + promos.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul><small>La meilleure s'applique automatiquement.</small></div>" : "") +
      '<div class="fr-champs"><label><span>Arrivée</span><input type="date" name="arrivee" min="' + min + '" value="' + esc(SEJ.arrivee) + '"></label>' +
      '<label><span>Départ</span><input type="date" name="depart" min="' + esc(SEJ.arrivee || min) + '" value="' + esc(SEJ.depart) + '"></label>' +
      '<label class="fr-large"><span>Voyageurs</span><select name="voyageurs">' + Array.from({ length: A.voyageurs }, function (_, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === SEJ.voyageurs ? " selected" : "") + ">" + V.pluriel(i + 1, "voyageur", "voyageurs") + "</option>"; }).join("") + "</select></label>" +
        (A.animaux ? '<label class="fr-large fr-animal"><input type="checkbox" name="animal"' + (SEJ.animal ? " checked" : "") + "><span>Je viens avec un animal" + (A.frais_animaux ? " (+" + esc(V.prix(A.frais_animaux, A.devise)) + ")" : " (gratuit)") + "</span></label>" : '<p class="fr-large fr-animal-non">🐾 Animaux non acceptés</p>') + "</div>" +
      '<button type="button" class="btn btn-large" id="btn-reserver"' + (ouvert && n && !erreur ? "" : " disabled") + ">" + (ouvert ? (n ? "Réserver" : "Choisissez vos dates") : "Réservations ouvertes le 20 novembre") + "</button>" +
      (erreur ? '<p class="fr-erreur">' + esc(erreur) + "</p>" : "") +
      '<p class="mention-verif">🔒 Identité vérifiée obligatoire pour réserver</p>' +
      (c && !erreur ? '<p class="fr-note">Vous ne payez rien pour le moment</p><dl class="fr-detail">' +
        "<div><dt>" + esc(V.prix(A.prix_nuit, A.devise)) + " × " + V.pluriel(n, "nuit", "nuits") + "</dt><dd>" + esc(V.prix(c.base, A.devise)) + "</dd></div>" +
        (c.reduction ? '<div class="fr-reduc"><dt>' + esc(c.libelleReduction) + "</dt><dd>-" + esc(V.prix(c.reduction, A.devise)) + "</dd></div>" : "") +
        (c.menage ? "<div><dt>Frais de ménage</dt><dd>" + esc(V.prix(c.menage, A.devise)) + "</dd></div>" : "") +
        (c.animaux ? "<div><dt>Frais pour l'animal</dt><dd>" + esc(V.prix(c.animaux, A.devise)) + "</dd></div>" : "") +
        '<div class="fr-zero"><dt>Frais de service Sundarly</dt><dd>' + esc(V.prix(0, A.devise)) + "</dd></div>" +
        '<div class="fr-total"><dt>Total</dt><dd>' + esc(V.prix(c.total, A.devise)) + "</dd></div></dl>" : "") +
      (A.devise !== V.devise() ? '<p class="fr-gris">Prix fixé par l\'hôte en ' + esc(A.devise) + " ; conversion indicative.</p>" : "");
    z.querySelectorAll("input,select").forEach(function (i) {
      i.addEventListener("change", function () {
        SEJ[i.name] = i.name === "voyageurs" ? +i.value : i.type === "checkbox" ? i.checked : i.value;
        if (i.name === "arrivee" && SEJ.depart && SEJ.depart <= SEJ.arrivee) SEJ.depart = "";
        rendreReservation();
      });
    });
    var br = $("btn-reserver");
    if (br) br.addEventListener("click", reserver);
    var bm = $("barre-mobile");
    bm.innerHTML = "<div><strong>" + esc(c && !erreur ? V.prix(c.total, A.devise) : V.prix(A.prix_nuit, A.devise)) + "</strong> " + (c && !erreur ? "pour " + V.pluriel(n, "nuit", "nuits") : "par nuit") + '<span class="fr-zero-mobile">Aucun frais de service</span></div><a class="btn" href="#reservation">' + (ouvert ? "Réserver" : "Dès le 20 nov.") + "</a>";
  }

  // Réserver : compte + identité vérifiée obligatoires
  function reserver() {
    var ici = "logement.html?id=" + ID;
    var A2 = window.SundarlyAuth;
    if (!A2 || !A2.client) return;
    A2.session().then(function (s) {
      if (!s) { location.href = "compte.html?mode=inscription&retour=" + encodeURIComponent(ici); return; }
      return A2.profil(s).then(function (p) {
        if (p.statut_verification !== "verifie") { location.href = "verification.html?retour=" + encodeURIComponent(ici); return; }
        alert("Votre identité est vérifiée ✓ La réservation en ligne s'ouvre très bientôt sur cette page.");
      });
    }).catch(function (e) { console.error(e); });
  }

  // ---------- Avis des voyageurs ----------
  var CRITERES = [["proprete", "Propreté"], ["exactitude", "Précision"], ["communication", "Communication"], ["emplacement", "Emplacement"], ["arrivee", "Arrivée"], ["qualite_prix", "Qualité-prix"]];
  function etoiles(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function chargerAvis() {
    var z = $("fi-avis"); if (!z || !V.client) return;
    V.client.rpc("avis_logement", { p_annonce: ID }).then(function (r) {
      var d = r.data || {}, nb = d.nombre || 0;
      if (!nb) {
        z.innerHTML = "<h2>★ Nouveau sur Sundarly</h2><p class=\"fi-gris\">Ce logement n'a pas encore d'avis. Les avis sont laissés uniquement par des voyageurs qui ont vraiment séjourné ici, après leur séjour.</p>";
        return;
      }
      var moy = Number(d.moyenne).toFixed(2).replace(".", ",");
      $("fi-note").textContent = "★ " + moy + " · " + V.pluriel(nb, "avis", "avis");
      z.innerHTML = "<h2>★ " + moy + " · " + V.pluriel(nb, "avis", "avis") + "</h2>" +
        '<div class="av-criteres">' + CRITERES.filter(function (c) { return d.criteres && d.criteres[c[0]] != null; }).map(function (c) {
          var v = Number(d.criteres[c[0]]);
          return '<div class="av-critere"><span>' + c[1] + '</span><div class="barre"><span style="width:' + (v / 5 * 100) + '%"></span></div><strong>' + v.toFixed(1).replace(".", ",") + "</strong></div>";
        }).join("") + "</div>" +
        '<div class="av-liste">' + (d.liste || []).map(function (a) {
          return '<article class="av-item"><div class="av-tete"><span class="fi-avatar">' + esc((a.prenom || "V").charAt(0)) + "</span><div><strong>" + esc(a.prenom || "Voyageur") + "</strong><span>" + esc(new Date(a.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })) + '</span></div></div><p class="av-etoiles" aria-label="' + a.note + ' sur 5">' + etoiles(a.note) + "</p><p>" + nl(a.commentaire) + "</p>" +
            (a.reponse ? '<div class="av-reponse"><strong>Réponse de l\'hôte</strong><p>' + nl(a.reponse) + "</p></div>" : "") + "</article>";
        }).join("") + "</div>" +
        '<p class="fi-gris">Avis vérifiés : seuls les voyageurs ayant séjourné dans le logement peuvent en laisser un.</p>';
    }).catch(function (e) { console.error(e); });
  }

  // ---------- Carte approximative ----------
  function carte() {
    if (!window.L || A.latitude == null) { var c = $("fi-carte"); if (c) c.hidden = true; return; }
    var m = L.map("fi-carte", { scrollWheelZoom: false }).setView([A.latitude, A.longitude], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 16, attribution: "© OpenStreetMap" }).addTo(m);
    L.circle([A.latitude, A.longitude], { radius: 900, color: "#D81B60", weight: 2, fillColor: "#D81B60", fillOpacity: 0.15 }).addTo(m);
  }

  // ---------- Galerie ----------
  function ouvrirGalerie(depart) {
    var p = A.photos || [];
    $("galerie-corps").innerHTML = p.map(function (u, i) { return '<img id="g' + i + '" src="' + esc(u) + '" alt="Photo ' + (i + 1) + '" loading="lazy">'; }).join("");
    $("galerie-compteur").textContent = V.pluriel(p.length, "photo", "photos");
    $("galerie").hidden = false; document.body.classList.add("bloque");
    var cible = $("g" + depart); if (cible) setTimeout(function () { cible.scrollIntoView({ block: "start" }); }, 30);
  }
  function fermerGalerie() { $("galerie").hidden = true; document.body.classList.remove("bloque"); }
  $("fermer-galerie").addEventListener("click", fermerGalerie);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("galerie").hidden) fermerGalerie(); });
})();

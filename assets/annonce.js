// Sundarly — outil de modification d'annonce (espace hôte)
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  var params = new URLSearchParams(location.search);
  var ID = params.get("id") || "";
  function $(id) { return document.getElementById(id); }
  if (!/^[0-9a-f-]{36}$/i.test(ID)) { location.replace("espace-hote.html"); return; }

  var SESSION = null, ANN = null, GUIDE = {}, PROFIL = null;

  // ---------- Outils ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  var SYM = { EUR: "€", MAD: "DH", CHF: "CHF" };
  function prix(n, dev) { return n == null ? "" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " " + (SYM[dev] || dev); }
  function pluriel(n, un, plusieurs) { return n + " " + (n > 1 ? plusieurs : un); }

  var MSG_LIENS = "Pour la sécurité de tous, les liens internet, adresses e-mail, numéros de téléphone et réseaux sociaux ne sont pas autorisés dans l'annonce. Les échanges se font sur Sundarly ; vos coordonnées sont transmises au voyageur après une réservation payée.";
  function contientCoordonnees(texte) {
    var x = String(texte || "").toLowerCase();
    if (!x) return false;
    if (/(https?:\/\/|www\.|\bwa\.me\b|\bbit\.ly\b)/.test(x)) return true;
    if (/[a-z0-9-]+\s*(\.|\(point\)|\[point\]| point )\s*(com|net|org|fr|ma|ch|be|tn|de|es|it|pt|io|co|info|online|site|app|me)\b/.test(x)) return true;
    if (/[^\s@]+\s*(@|\(at\)|\[at\]| arobase )\s*[^\s@]+\.[a-z]{2,}/.test(x) || /@/.test(x)) return true;
    var chiffres = x.replace(/[\s.\-()\/+]/g, "");
    if (/\d{8,}/.test(chiffres)) return true;
    if (/(instagram|facebook|whatsapp|telegram|snapchat|tiktok|airbnb|booking)\b/.test(x)) return true;
    var mots = x.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/);
    var suite = 0, L = { zero: 1, un: 1, deux: 1, trois: 1, quatre: 1, cinq: 1, six: 1, sept: 1, huit: 1, neuf: 1 };
    for (var k = 0; k < mots.length; k++) {
      if (L[mots[k]] || /^\d+$/.test(mots[k])) { suite++; if (suite >= 6) return true; } else if (mots[k]) suite = 0;
    }
    return false;
  }

  // ---------- Listes ----------
  var TYPES = ["Appartement", "Studio", "Maison", "Villa", "Riad", "Maison d'hôtes", "Chambre d'hôtes", "Chambre d'hôtel", "Auberge / hostel", "Gîte", "Chalet", "Bungalow", "Tente / glamping", "Cabane", "Bateau", "Logement insolite"];
  var ESPACES = { logement_entier: "Logement entier", chambre_privee: "Chambre privée", chambre_partagee: "Chambre partagée" };
  var EQUIP = {
    "Les essentiels": ["Wi-Fi", "Cuisine équipée", "Kitchenette", "Réfrigérateur", "Cafetière", "Bouilloire", "Micro-ondes", "Lave-linge", "Sèche-linge", "Fer à repasser", "Sèche-cheveux", "Climatisation", "Chauffage", "Télévision", "Espace de travail", "Linge de maison fourni", "Serviettes fournies", "Produits de toilette", "Parking gratuit", "Ascenseur"],
    "Les plus": ["Piscine", "Piscine partagée", "Jacuzzi", "Jardin", "Terrasse", "Balcon", "Toit-terrasse", "Barbecue", "Vue mer", "Vue montagne", "Accès plage", "Hammam", "Cheminée", "Salle de sport", "Petit-déjeuner possible", "Lit pour bébé", "Chaise haute"],
    "Sécurité": ["Détecteur de fumée", "Extincteur", "Kit de premiers secours", "Caméras extérieures"]
  };
  var ACCESSIBILITE = ["Entrée de plain-pied (sans marche)", "Entrée de plus de 81 cm de large", "Chambre accessible sans marche", "Salle de bain accessible sans marche", "Douche à l'italienne", "Barres d'appui dans la douche", "Barres d'appui près des toilettes", "Place de parking accessible", "Ascenseur"];
  var SECURITE = ["Détecteur de fumée", "Détecteur de monoxyde de carbone", "Extincteur", "Kit de premiers secours", "Caméras de surveillance à l'extérieur", "Piscine ou jacuzzi sans barrière ni verrou", "Animaux sur place", "Escaliers ou dénivelés", "Plan d'eau à proximité (lac, rivière, mer)"];
  var ANNULATION = {
    souple: ["Souple", "Remboursement intégral jusqu'à 24 h avant l'arrivée."],
    moderee: ["Modérée", "Remboursement intégral jusqu'à 5 jours avant l'arrivée."],
    stricte: ["Stricte", "Remboursement de 50 % jusqu'à 7 jours avant l'arrivée, rien ensuite."]
  };
  var MODES = { accueil: "Accueil en personne", boite_cles: "Boîte à clés sécurisée", serrure_code: "Serrure à code", gardien: "Gardien / concierge", autre: "Autre" };
  var STATUTS = {
    en_attente: ["En cours de vérification", "badge-cours", "Notre équipe vérifie votre annonce avant sa mise en ligne. Vous pouvez continuer à la compléter."],
    validee: ["Validée", "badge-ok", "Votre annonce est validée : elle sera réservable dès l'ouverture des réservations, le 20 novembre 2026."],
    en_ligne: ["En ligne", "badge-ok", "Votre annonce est visible par les voyageurs."],
    refusee: ["À corriger", "badge-refus", "Votre annonce doit être corrigée (nous vous avons écrit par e-mail). Dès que vous la modifiez, elle repart en vérification."],
    archivee: ["Masquée", "badge-attente", "Votre annonce est masquée : les voyageurs ne la voient plus."]
  };

  // ---------- Morceaux de formulaire ----------
  function champTexte(nom, label, valeur, opts) {
    opts = opts || {};
    var max = opts.max || 1500;
    var aide = opts.aide ? '<p class="aide-champ">' + esc(opts.aide) + "</p>" : "";
    if (opts.court) {
      return '<label class="champ">' + esc(label) + aide + '<input type="text" name="' + nom + '" maxlength="' + max + '" value="' + esc(valeur) + '"' + (opts.requis ? " required" : "") + "></label>";
    }
    return '<label class="champ">' + esc(label) + aide + '<textarea name="' + nom + '" maxlength="' + max + '" rows="' + (opts.lignes || 6) + '" data-compte="' + max + '"' + (opts.requis ? " required" : "") + ">" + esc(valeur) + '</textarea><span class="compte-car"></span></label>';
  }
  function cases(nom, liste, coches) {
    coches = coches || [];
    return '<div class="choix-liste">' + liste.map(function (v) {
      return '<label class="case-ligne"><span>' + esc(v) + '</span><input type="checkbox" name="' + nom + '" value="' + esc(v) + '"' + (coches.indexOf(v) >= 0 ? " checked" : "") + "></label>";
    }).join("") + "</div>";
  }
  function compteur(nom, label, valeur, min, max) {
    return '<div class="ligne-compteur"><span>' + esc(label) + '</span><div class="reglage-n"><button type="button" data-moins="' + nom + '" aria-label="Moins">−</button><output data-val="' + nom + '">' + valeur + '</output><button type="button" data-plus="' + nom + '" aria-label="Plus">+</button></div><input type="hidden" name="' + nom + '" value="' + valeur + '" data-min="' + min + '" data-max="' + max + '"></div>';
  }
  function interrupteur(nom, label, actif) {
    return '<label class="case-ligne"><span>' + esc(label) + '</span><input type="checkbox" name="' + nom + '"' + (actif ? " checked" : "") + "></label>";
  }
  function radios(nom, obj, courant) {
    return '<div class="choix-liste">' + Object.keys(obj).map(function (k) {
      var v = obj[k], t = Array.isArray(v) ? v[0] : v, d = Array.isArray(v) ? v[1] : "";
      return '<label class="case-ligne radio"><span><strong>' + esc(t) + "</strong>" + (d ? "<small>" + esc(d) + "</small>" : "") + '</span><input type="radio" name="' + nom + '" value="' + esc(k) + '"' + (courant === k ? " checked" : "") + "></label>";
    }).join("") + "</div>";
  }
  function F(f, n) { return f.elements[n] ? String(f.elements[n].value || "").trim() : ""; }
  function coches(f, n) { return Array.prototype.slice.call(f.querySelectorAll('input[name="' + n + '"]:checked')).map(function (i) { return i.value; }); }
  function nombre(f, n) { var v = F(f, n); return v === "" ? null : Math.round(parseFloat(v.replace(",", ".")) * 100) / 100; }
  function textesSansContact(f, noms) {
    for (var i = 0; i < noms.length; i++) if (contientCoordonnees(F(f, noms[i]))) return MSG_LIENS;
    return null;
  }

  // ---------- Rubriques « Mon logement » ----------
  var RUBRIQUES = [
    {
      cle: "photos", titre: "Photos",
      resume: function (a) {
        var p = a.photos || [];
        return '<p class="gris">' + pluriel(p.length, "photo", "photos") + '</p><div class="mosaique">' +
          p.slice(0, 3).map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy">'; }).join("") + "</div>";
      },
      ouvrir: ouvrirPhotos
    },
    {
      cle: "titre", titre: "Titre",
      resume: function (a) { return '<p class="gris">' + esc(a.titre) + "</p>"; },
      form: function (a) { return '<p class="aide-champ">Les titres courts fonctionnent le mieux. Ne vous inquiétez pas, vous pourrez toujours le modifier plus tard.</p>' + champTexte("titre", "Titre", a.titre, { max: 80, lignes: 2, requis: true }); },
      lire: function (f) {
        var t = F(f, "titre");
        if (t.length < 10) return "Le titre doit faire au moins 10 caractères.";
        return textesSansContact(f, ["titre"]) || { titre: t };
      }
    },
    {
      cle: "type", titre: "Type de logement",
      resume: function (a) { return '<p class="gris">' + esc(a.type_logement) + " · " + esc(ESPACES[a.type_espace] || "") + "</p>"; },
      form: function (a) {
        return '<label class="champ">Quel type de logement ?<select name="type_logement">' + TYPES.map(function (t) { return "<option" + (t === a.type_logement ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></label>" +
          "<h3>Les voyageurs disposent de</h3>" + radios("type_espace", ESPACES, a.type_espace);
      },
      lire: function (f) { return { type_logement: F(f, "type_logement"), type_espace: (f.querySelector('input[name="type_espace"]:checked') || {}).value }; }
    },
    {
      cle: "capacite", titre: "Nombre maximal de voyageurs",
      resume: function (a) { return '<p class="gris">' + pluriel(a.voyageurs, "voyageur", "voyageurs") + " · " + pluriel(a.chambres, "chambre", "chambres") + " · " + pluriel(a.lits, "lit", "lits") + " · " + pluriel(a.salles_de_bain, "salle de bain", "salles de bain") + "</p>"; },
      form: function (a) {
        return compteur("voyageurs", "Voyageurs", a.voyageurs, 1, 50) + compteur("chambres", "Chambres", a.chambres, 0, 50) +
          compteur("lits", "Lits", a.lits, 1, 100) + compteur("salles_de_bain", "Salles de bain", a.salles_de_bain, 0, 50);
      },
      lire: function (f) { return { voyageurs: +F(f, "voyageurs"), chambres: +F(f, "chambres"), lits: +F(f, "lits"), salles_de_bain: +F(f, "salles_de_bain") }; }
    },
    {
      cle: "description", titre: "Description",
      resume: function (a) { return '<p class="gris extrait">' + esc(a.description) + "</p>"; },
      ouvrir: ouvrirDescription
    },
    {
      cle: "equipements", titre: "Équipements",
      resume: function (a) {
        var e = a.equipements || [];
        if (!e.length) return '<p class="gris">Ajoutez des informations</p>';
        return '<ul class="liste-puces">' + e.slice(0, 3).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" + (e.length > 3 ? '<p class="gris">+ ' + (e.length - 3) + " autres</p>" : "");
      },
      form: function (a) {
        return Object.keys(EQUIP).map(function (g) { return "<h3>" + esc(g) + "</h3>" + cases("equipements", EQUIP[g], a.equipements); }).join("");
      },
      lire: function (f) { return { equipements: coches(f, "equipements") }; }
    },
    {
      cle: "accessibilite", titre: "Éléments d'accessibilité",
      resume: function (a) { var x = a.accessibilite || []; return '<p class="gris">' + (x.length ? esc(x.slice(0, 2).join(" · ")) + (x.length > 2 ? " + " + (x.length - 2) + " autres" : "") : "Ajoutez des informations") + "</p>"; },
      form: function (a) { return '<p class="aide-champ">Aidez les voyageurs à mobilité réduite à savoir si votre logement leur convient.</p>' + cases("accessibilite", ACCESSIBILITE, a.accessibilite); },
      lire: function (f) { return { accessibilite: coches(f, "accessibilite") }; }
    },
    {
      cle: "lieu", titre: "Lieu",
      resume: function (a) { return '<p class="gris">' + esc(a.ville) + ", " + esc(a.pays) + "</p>"; },
      form: function (a) {
        return '<div class="bloc-lieu"><p><strong>' + esc(a.adresse) + "</strong><br>" + esc(a.code_postal || "") + " " + esc(a.ville) + ", " + esc(a.pays) + "</p></div>" +
          '<p class="note-securite"><span>L\'adresse exacte n\'est jamais affichée sur l\'annonce : les voyageurs voient seulement le quartier approximatif. Elle leur est communiquée après une réservation confirmée et payée.</span></p>' +
          '<p class="aide-champ">Pour changer l\'adresse, écrivez-nous à info@sundarly.com : nous la vérifions avant de la modifier.</p>';
      },
      lecture: true
    },
    {
      cle: "prix", titre: "Prix",
      resume: function (a) {
        var t = prix(a.prix_nuit, a.devise) + " par nuit";
        if (a.frais_menage) t += " · ménage " + prix(a.frais_menage, a.devise);
        return '<p class="gris">' + esc(t) + "</p>";
      },
      form: function (a) {
        return '<label class="champ">Devise<select name="devise">' + ["EUR", "MAD", "CHF"].map(function (d) { return '<option value="' + d + '"' + (d === a.devise ? " selected" : "") + ">" + d + " (" + SYM[d] + ")</option>"; }).join("") + "</select></label>" +
          '<div class="champs">' +
          '<label class="champ">Prix par nuit<input type="number" name="prix_nuit" min="1" max="100000" step="1" required value="' + esc(a.prix_nuit) + '"></label>' +
          '<label class="champ">Frais de ménage <span class="facultatif">(facultatif)</span><input type="number" name="frais_menage" min="0" max="100000" step="1" value="' + esc(a.frais_menage == null ? "" : a.frais_menage) + '"></label>' +
          "</div>" +
          '<div class="simulation" id="simu"></div>';
      },
      apres: function (f) {
        function maj() {
          var z = $("simu"); if (!z) return;
          var p = parseFloat(F(f, "prix_nuit")) || 0, d = F(f, "devise");
          z.innerHTML = p > 0 ? "Pour une nuit à <strong>" + esc(prix(p, d)) + "</strong>, Sundarly prend 10 % (" + esc(prix(p * 0.1, d)) + ") et <strong>vous recevez " + esc(prix(p * 0.9, d)) + "</strong>. Le ménage vous revient en totalité, sans commission." : "";
        }
        f.addEventListener("input", maj); maj();
      },
      lire: function (f) {
        var p = nombre(f, "prix_nuit");
        if (!p || p <= 0) return "Indiquez un prix par nuit.";
        return {
          devise: F(f, "devise"), prix_nuit: p, frais_menage: nombre(f, "frais_menage")
        };
      }
    },
    {
      cle: "promotions", titre: "Promotions",
      resume: function (a) {
        var r = [];
        if (a.promo_nouvelle) r.push("Nouvelle annonce -20 %");
        if (a.reduction_semaine) r.push("Semaine -" + a.reduction_semaine + " %");
        if (a.reduction_mois) r.push("Mois -" + a.reduction_mois + " %");
        if (a.reduction_anticipee) r.push("Réservation anticipée -" + a.reduction_anticipee + " %");
        if (a.reduction_derniere_minute) r.push("Dernière minute -" + a.reduction_derniere_minute + " %");
        return '<p class="gris">' + (r.length ? esc(r.join(" · ")) : "Aucune promotion active. Les annonces en promotion sont mises en avant et attirent plus de voyageurs.") + "</p>";
      },
      form: function (a) {
        function pct(nom, v) { return '<input type="number" name="' + nom + '" min="0" max="90" step="1" value="' + esc(v || 0) + '">'; }
        function choix(nom, vals, cur, unite) { return '<select name="' + nom + '">' + vals.map(function (v) { return '<option value="' + v[0] + '"' + (Number(cur) === v[0] ? " selected" : "") + ">" + esc(v[1]) + "</option>"; }).join("") + "</select>"; }
        return '<div class="promo-bloc promo-vedette"><label class="case-ligne"><span><strong>Promotion « nouvelle annonce » : -20 %</strong><small>Sur vos 3 premières réservations. C\'est le meilleur moyen d\'obtenir vos premiers voyageurs et vos premiers avis. Votre annonce affiche un badge « -20 % ».</small></span><input type="checkbox" name="promo_nouvelle"' + (a.promo_nouvelle ? " checked" : "") + "></label></div>" +
          "<h3>Réductions selon la durée</h3>" +
          '<div class="champs"><label class="champ">À la semaine (7 nuits et plus), en %' + pct("reduction_semaine", a.reduction_semaine) + '</label>' +
          '<label class="champ">Au mois (28 nuits et plus), en %' + pct("reduction_mois", a.reduction_mois) + "</label></div>" +
          "<h3>Réservation anticipée</h3>" +
          '<div class="champs"><label class="champ">Réduction en %' + pct("reduction_anticipee", a.reduction_anticipee) + '</label>' +
          '<label class="champ">Si le voyageur réserve au moins' + choix("anticipee_jours", [[30, "1 mois à l'avance"], [60, "2 mois à l'avance"], [90, "3 mois à l'avance"], [180, "6 mois à l'avance"], [365, "1 an à l'avance"]], a.anticipee_jours || 90) + "</label></div>" +
          "<h3>Dernière minute</h3>" +
          '<div class="champs"><label class="champ">Réduction en %' + pct("reduction_derniere_minute", a.reduction_derniere_minute) + '</label>' +
          '<label class="champ">Si l\'arrivée est dans moins de' + choix("derniere_minute_jours", [[1, "1 jour"], [3, "3 jours"], [7, "7 jours"], [14, "14 jours"], [21, "21 jours"], [28, "28 jours"]], a.derniere_minute_jours || 7) + "</label></div>" +
          '<p class="aide-champ">Les promotions ne se cumulent pas : le voyageur profite automatiquement de la plus avantageuse. Mettez 0 pour désactiver une réduction.</p>';
      },
      lire: function (f) {
        function p(n) { return Math.max(0, Math.min(90, Math.round(nombre(f, n) || 0))); }
        return {
          promo_nouvelle: f.elements.promo_nouvelle.checked,
          reduction_semaine: p("reduction_semaine"), reduction_mois: p("reduction_mois"),
          reduction_anticipee: p("reduction_anticipee"), anticipee_jours: Number(F(f, "anticipee_jours")) || 90,
          reduction_derniere_minute: p("reduction_derniere_minute"), derniere_minute_jours: Number(F(f, "derniere_minute_jours")) || 7
        };
      }
    },
    {
      cle: "disponibilite", titre: "Disponibilité",
      resume: function (a) { return '<p class="gris">Séjour de ' + pluriel(a.nuits_min || 1, "nuit", "nuits") + " minimum" + (a.nuits_max ? ", " + a.nuits_max + " maximum" : "") + "</p>"; },
      form: function (a) { return compteur("nuits_min", "Nombre de nuits minimum", a.nuits_min || 1, 1, 365) + compteur("nuits_max", "Nombre de nuits maximum", a.nuits_max || 365, 1, 365); },
      lire: function (f) {
        var mi = +F(f, "nuits_min"), ma = +F(f, "nuits_max");
        if (ma < mi) return "Le maximum doit être supérieur ou égal au minimum.";
        return { nuits_min: mi, nuits_max: ma >= 365 ? null : ma };
      }
    },
    {
      cle: "reglement", titre: "Règlement intérieur et demandes",
      resume: function (a) {
        var r = ["Jusqu'à " + pluriel(a.voyageurs, "voyageur", "voyageurs")];
        if (a.heure_arrivee) r.push("Arrivée à partir de " + a.heure_arrivee);
        if (a.heure_depart) r.push("Départ avant " + a.heure_depart);
        r.push(a.animaux ? "Animaux acceptés" : "Pas d'animaux");
        return '<ul class="liste-puces">' + r.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      },
      form: function (a) {
        return '<div class="champs"><label class="champ">Arrivée à partir de<input type="time" name="heure_arrivee" value="' + esc(a.heure_arrivee || "") + '"></label>' +
          '<label class="champ">Départ avant<input type="time" name="heure_depart" value="' + esc(a.heure_depart || "") + '"></label></div>' +
          "<h3>Autorisés dans le logement</h3>" + '<div class="choix-liste">' + interrupteur("animaux", "Animaux", a.animaux) + interrupteur("fumeurs", "Fumeurs", a.fumeurs) + interrupteur("fetes", "Fêtes et événements", a.fetes) + "</div>" +
          champTexte("reglement", "Règles supplémentaires", a.reglement, { max: 1500, lignes: 5, aide: "Ex. : silence après 22 h, pas de chaussures dans le salon…" });
      },
      lire: function (f) {
        return textesSansContact(f, ["reglement"]) || {
          heure_arrivee: F(f, "heure_arrivee") || null, heure_depart: F(f, "heure_depart") || null,
          animaux: f.elements.animaux.checked, fumeurs: f.elements.fumeurs.checked, fetes: f.elements.fetes.checked,
          reglement: F(f, "reglement") || null
        };
      }
    },
    {
      cle: "securite", titre: "Sécurité des voyageurs",
      resume: function (a) {
        var s = a.securite || [], l = [];
        if (s.indexOf("Détecteur de monoxyde de carbone") < 0) l.push("Aucune indication de la présence d'un détecteur de monoxyde de carbone");
        if (s.indexOf("Détecteur de fumée") < 0) l.push("Aucune indication de la présence d'un détecteur de fumée");
        s.forEach(function (x) { l.push(x); });
        return '<ul class="liste-puces">' + l.slice(0, 3).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" + (l.length > 3 ? '<p class="gris">+ ' + (l.length - 3) + " autres</p>" : "");
      },
      form: function (a) { return '<p class="aide-champ">Indiquez honnêtement les équipements de sécurité et les points d\'attention : les voyageurs les voient avant de réserver.</p>' + cases("securite", SECURITE, a.securite); },
      lire: function (f) { return { securite: coches(f, "securite") }; }
    },
    {
      cle: "annulation", titre: "Conditions d'annulation",
      resume: function (a) { var c = ANNULATION[a.annulation] || ["", ""]; return '<p class="gris">' + esc(c[0]) + "<br>" + esc(c[1]) + "</p>"; },
      form: function (a) { return radios("annulation", ANNULATION, a.annulation); },
      lire: function (f) { var r = f.querySelector('input[name="annulation"]:checked'); return r ? { annulation: r.value } : "Choisissez une condition d'annulation."; }
    },
    {
      cle: "caution", titre: "Caution",
      resume: function (a) { return '<p class="gris">' + (a.caution ? esc(prix(a.caution, a.devise)) : "Aucune caution") + "</p>"; },
      form: function (a) { return '<label class="champ">Montant de la caution (' + esc(SYM[a.devise]) + ')<input type="number" name="caution" min="0" max="100000" step="1" value="' + esc(a.caution == null ? "" : a.caution) + '"></label><p class="aide-champ">Laissez vide s\'il n\'y a pas de caution.</p>'; },
      lire: function (f) { return { caution: nombre(f, "caution") }; }
    }
  ];

  // Sous-rubriques de la description (comme Airbnb)
  var DESCRIPTION = [
    { nom: "description", titre: "Description du logement", max: 3000, min: 50, aide: "Présentez ce qui rend votre logement unique." },
    { nom: "mon_logement", titre: "Mon logement", max: 2000, aide: "Décrivez les pièces, l'ambiance, la décoration, l'extérieur…" },
    { nom: "acces_voyageurs", titre: "Accès des voyageurs", max: 1500, aide: "À quelles parties du logement les voyageurs ont-ils accès ?" },
    { nom: "echanges_voyageurs", titre: "Échanges avec les voyageurs", max: 1500, aide: "Serez-vous disponible pendant le séjour ? Comment les aider ?" },
    { nom: "autres_infos", titre: "Autres informations à noter", max: 1500, aide: "Piscine partagée, travaux à proximité, escaliers…" }
  ];

  // ---------- Rubriques « Guide d'arrivée » (privé) ----------
  var RUB_GUIDE = [
    {
      cle: "horaires", titre: "Arrivée et départ",
      resume: function () { return '<p class="gris">' + (ANN.heure_arrivee ? "Arrivée à partir de " + esc(ANN.heure_arrivee) : "Arrivée : à préciser") + "<br>" + (ANN.heure_depart ? "Départ avant " + esc(ANN.heure_depart) : "Départ : à préciser") + "</p>"; },
      form: function () { return '<div class="champs"><label class="champ">Arrivée à partir de<input type="time" name="heure_arrivee" value="' + esc(ANN.heure_arrivee || "") + '"></label><label class="champ">Départ avant<input type="time" name="heure_depart" value="' + esc(ANN.heure_depart || "") + '"></label></div>'; },
      lire: function (f) { return { heure_arrivee: F(f, "heure_arrivee") || null, heure_depart: F(f, "heure_depart") || null }; }
    },
    {
      cle: "mode_arrivee", titre: "Mode d'arrivée", guide: true,
      resume: function (g) { return '<p class="gris">' + esc(MODES[g.mode_arrivee] || "Ajoutez des informations") + "</p>"; },
      form: function (g) { return radios("mode_arrivee", MODES, g.mode_arrivee) + champTexte("instructions_arrivee", "Instructions d'arrivée", g.instructions_arrivee, { max: 3000, lignes: 6, aide: "Code de la boîte à clés, étage, où se garer… (envoyé uniquement après réservation payée)" }); },
      lire: function (f) { var r = f.querySelector('input[name="mode_arrivee"]:checked'); return { mode_arrivee: r ? r.value : null, instructions_arrivee: F(f, "instructions_arrivee") || null }; }
    },
    {
      cle: "wifi", titre: "Informations du Wi-Fi", guide: true,
      resume: function (g) { return '<p class="gris">' + (g.wifi_nom ? "Réseau : " + esc(g.wifi_nom) : "Ajoutez des informations") + "</p>"; },
      form: function (g) { return champTexte("wifi_nom", "Nom du réseau", g.wifi_nom, { court: true, max: 100 }) + champTexte("wifi_mdp", "Mot de passe", g.wifi_mdp, { court: true, max: 100 }); },
      lire: function (f) { return { wifi_nom: F(f, "wifi_nom") || null, wifi_mdp: F(f, "wifi_mdp") || null }; }
    },
    {
      cle: "itineraire", titre: "Itinéraire", guide: true,
      resume: function (g) { return '<p class="gris extrait">' + esc(g.itineraire || "Ajoutez des informations") + "</p>"; },
      form: function (g) { return champTexte("itineraire", "Comment trouver le logement", g.itineraire, { max: 3000, lignes: 7, aide: "Depuis l'aéroport, la gare, repères dans la rue…" }); },
      lire: function (f) { return { itineraire: F(f, "itineraire") || null }; }
    },
    {
      cle: "manuel", titre: "Manuel de la maison", guide: true,
      resume: function (g) { return '<p class="gris extrait">' + esc(g.manuel_maison || "Ajoutez des informations") + "</p>"; },
      form: function (g) { return champTexte("manuel_maison", "Manuel de la maison", g.manuel_maison, { max: 3000, lignes: 8, aide: "Fonctionnement de la climatisation, de la piscine, du chauffe-eau, tri des déchets…" }); },
      lire: function (f) { return { manuel_maison: F(f, "manuel_maison") || null }; }
    },
    {
      cle: "depart", titre: "Instructions de départ", guide: true,
      resume: function (g) { return '<p class="gris extrait">' + esc(g.instructions_depart || "Ajoutez des informations") + "</p>"; },
      form: function (g) { return champTexte("instructions_depart", "Avant de partir, merci de…", g.instructions_depart, { max: 2000, lignes: 6, aide: "Où laisser les clés, fermer les volets, sortir les poubelles…" }); },
      lire: function (f) { return { instructions_depart: F(f, "instructions_depart") || null }; }
    }
  ];

  // ---------- Affichage ----------
  function carte(r, donnees) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "carte-rubrique";
    b.innerHTML = "<h2>" + esc(r.titre) + "</h2>" + r.resume(donnees) + '<svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    b.addEventListener("click", function () { r.ouvrir ? r.ouvrir() : ouvrir(r, donnees); });
    return b;
  }
  function rendre() {
    var v = $("vue-logement"); v.innerHTML = "";
    RUBRIQUES.forEach(function (r) { v.appendChild(carte(r, ANN)); });
    var g = $("cartes-guide"); g.innerHTML = "";
    RUB_GUIDE.forEach(function (r) { g.appendChild(carte(r, GUIDE)); });
    rendreStatut();
  }
  function rendreStatut() {
    var s = STATUTS[ANN.statut] || [ANN.statut, "badge-attente", ""];
    var z = $("statut-annonce");
    z.innerHTML = '<div><span class="badge ' + s[1] + '">' + esc(s[0]) + '</span><p class="gris">' + esc(s[2]) + "</p></div>";
    var action = null;
    if (ANN.statut === "validee" || ANN.statut === "en_ligne") action = ["Masquer l'annonce", "archivee"];
    if (ANN.statut === "archivee") action = ["Remettre en ligne", "en_attente"];
    if (action) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-contour btn-petit"; b.textContent = action[0];
      b.addEventListener("click", function () {
        b.disabled = true;
        enregistrer({ statut: action[1] }).then(rendre).catch(function () { b.disabled = false; alerte("La modification n'a pas fonctionné. Réessayez."); });
      });
      z.appendChild(b);
    }
  }
  function alerte(t) {
    var m = document.createElement("p"); m.className = "message erreur"; m.textContent = t;
    $("statut-annonce").after(m); setTimeout(function () { m.remove(); }, 6000);
  }

  // ---------- Panneau ----------
  var panneau = $("panneau"), pform = $("panneau-form"), corps = $("panneau-corps"), btnEnr = $("btn-enregistrer");
  var surEnregistrer = null;
  function msgPanneau(type, t) { var m = pform.querySelector(".message"); m.className = "message " + type; m.textContent = t; }
  function montrerPanneau(titre, html, lecture) {
    $("panneau-titre").textContent = titre;
    corps.innerHTML = html;
    msgPanneau("", "");
    btnEnr.hidden = !!lecture; btnEnr.disabled = false; btnEnr.textContent = "Enregistrer";
    panneau.querySelector(".panneau-bas [data-fermer]").textContent = lecture ? "Fermer" : "Annuler";
    panneau.hidden = false; document.body.classList.add("bloque");
    activerChamps(corps);
    var premier = corps.querySelector("input:not([type=hidden]),textarea,select");
    if (premier && window.innerWidth > 700) premier.focus();
  }
  function fermer() { panneau.hidden = true; document.body.classList.remove("bloque"); surEnregistrer = null; }
  panneau.querySelectorAll("[data-fermer]").forEach(function (b) { b.addEventListener("click", fermer); });
  panneau.addEventListener("click", function (e) { if (e.target === panneau) fermer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (!panneau.hidden) fermer(); if (!$("apercu").hidden) fermerApercu(); } });

  function activerChamps(z) {
    z.querySelectorAll("[data-compte]").forEach(function (t) {
      var c = t.parentElement.querySelector(".compte-car");
      function m() { c.textContent = t.value.length + " / " + t.getAttribute("data-compte"); }
      t.addEventListener("input", m); m();
    });
    z.querySelectorAll("[data-plus],[data-moins]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-plus") || b.getAttribute("data-moins");
        var inp = z.querySelector('input[name="' + n + '"]');
        var v = +inp.value + (b.hasAttribute("data-plus") ? 1 : -1);
        v = Math.max(+inp.getAttribute("data-min"), Math.min(+inp.getAttribute("data-max"), v));
        inp.value = v; z.querySelector('[data-val="' + n + '"]').textContent = v;
      });
    });
  }

  function ouvrir(r, donnees) {
    montrerPanneau(r.titre, r.form(donnees), r.lecture);
    if (r.apres) r.apres(pform);
    surEnregistrer = function () {
      var maj = r.lire(pform);
      if (typeof maj === "string") return Promise.reject(new Error(maj));
      return r.guide ? enregistrerGuide(maj) : enregistrer(maj);
    };
  }

  pform.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!surEnregistrer) return;
    btnEnr.disabled = true; btnEnr.textContent = "Enregistrement…";
    surEnregistrer().then(function () { fermer(); rendre(); }).catch(function (err) {
      console.error(err);
      var m = err && err.message || "";
      if (/check constraint|violates check/.test(m)) m = /description|titre|mon_logement|acces|echanges|autres|reglement/.test(m) ? MSG_LIENS : "Une des valeurs n'est pas valide. Vérifiez les champs.";
      else if (!m || /fetch|network|JWT|permission|policy/i.test(m)) m = "L'enregistrement n'a pas fonctionné. Vérifiez votre connexion et réessayez.";
      msgPanneau("erreur", m);
      btnEnr.disabled = false; btnEnr.textContent = "Enregistrer";
    });
  });

  function enregistrer(maj) {
    return client.from("annonces").update(maj).eq("id", ID).select().single().then(function (r) {
      if (r.error) throw r.error;
      ANN = r.data;
    });
  }
  function enregistrerGuide(maj) {
    var ligne = Object.assign({}, maj, { annonce_id: ID, hote_id: SESSION.user.id, modifie_le: new Date().toISOString() });
    return client.from("guides_arrivee").upsert(ligne, { onConflict: "annonce_id" }).select().single().then(function (r) {
      if (r.error) throw r.error;
      GUIDE = r.data || ligne;
    });
  }

  // Description : une liste de sous-rubriques, chacune modifiable
  function ouvrirDescription() {
    var html = '<div class="sous-rubriques">' + DESCRIPTION.map(function (d) {
      return '<button type="button" class="sous-rubrique" data-sous="' + d.nom + '"><span><strong>' + esc(d.titre) + '</strong><span class="gris extrait">' + esc(ANN[d.nom] || "Ajoutez des informations") + '</span></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>';
    }).join("") + "</div>";
    montrerPanneau("Description", html, true);
    corps.querySelectorAll("[data-sous]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = DESCRIPTION.filter(function (x) { return x.nom === b.getAttribute("data-sous"); })[0];
        montrerPanneau(d.titre, champTexte(d.nom, d.titre, ANN[d.nom], { max: d.max, lignes: 10, aide: d.aide, requis: !!d.min }));
        surEnregistrer = function () {
          var v = F(pform, d.nom);
          if (d.min && v.length < d.min) return Promise.reject(new Error("La description doit faire au moins " + d.min + " caractères."));
          if (contientCoordonnees(v)) return Promise.reject(new Error(MSG_LIENS));
          var maj = {}; maj[d.nom] = v || null;
          return enregistrer(maj);
        };
      });
    });
  }

  // Photos : réordonner, supprimer, ajouter (5 à 20)
  function cheminDepuisUrl(u) { var i = u.indexOf("/photos-annonces/"); return i < 0 ? null : decodeURIComponent(u.slice(i + 17).split("?")[0]); }
  function compresser(fichier) {
    return new Promise(function (ok) {
      var img = new Image(), url = URL.createObjectURL(fichier);
      img.onload = function () {
        var r = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
        var cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * r); cv.height = Math.round(img.naturalHeight * r);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { ok(b); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      img.src = url;
    });
  }
  function ouvrirPhotos() {
    var liste = (ANN.photos || []).map(function (u) { return { url: u }; });
    var supprimees = [];
    montrerPanneau("Photos", '<p class="aide-champ">De 5 à 20 photos. La première est la photo de couverture. Utilisez les flèches pour changer l\'ordre.</p><div class="grille-photos" id="grille-photos"></div>' +
      '<label class="btn btn-contour ajout-photos"><input type="file" accept="image/*" multiple class="sr" id="ajout-photos">+ Ajouter des photos</label>');
    var grille = $("grille-photos");
    function dessiner() {
      grille.innerHTML = "";
      liste.forEach(function (p, i) {
        var d = document.createElement("div"); d.className = "vignette";
        d.innerHTML = '<img src="' + esc(p.apercu || p.url) + '" alt="">' + (i === 0 ? '<span class="badge-couverture">Couverture</span>' : "") +
          '<div class="vignette-actions"><button type="button" data-g aria-label="Avancer">‹</button><button type="button" data-d aria-label="Reculer">›</button><button type="button" data-x aria-label="Supprimer">✕</button></div>';
        d.querySelector("[data-g]").disabled = i === 0;
        d.querySelector("[data-d]").disabled = i === liste.length - 1;
        d.querySelector("[data-x]").disabled = liste.length <= 5;
        d.querySelector("[data-g]").onclick = function () { liste.splice(i - 1, 0, liste.splice(i, 1)[0]); dessiner(); };
        d.querySelector("[data-d]").onclick = function () { liste.splice(i + 1, 0, liste.splice(i, 1)[0]); dessiner(); };
        d.querySelector("[data-x]").onclick = function () { var x = liste.splice(i, 1)[0]; if (x.url) supprimees.push(x.url); dessiner(); };
        grille.appendChild(d);
      });
      $("ajout-photos").parentElement.hidden = liste.length >= 20;
    }
    $("ajout-photos").addEventListener("change", function () {
      var f = Array.prototype.slice.call(this.files, 0, 20 - liste.length); this.value = "";
      Promise.all(f.map(compresser)).then(function (blobs) {
        blobs.forEach(function (b) { if (b) liste.push({ blob: b, apercu: URL.createObjectURL(b) }); });
        dessiner();
      });
    });
    dessiner();
    surEnregistrer = function () {
      if (liste.length < 5) return Promise.reject(new Error("Il faut au moins 5 photos."));
      var urls = [], i = 0;
      function suivante() {
        if (i >= liste.length) return Promise.resolve();
        var p = liste[i];
        if (p.url) { urls.push(p.url); i++; return suivante(); }
        btnEnr.textContent = "Envoi de la photo " + (i + 1) + "…";
        var chemin = SESSION.user.id + "/" + ID + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
        return client.storage.from("photos-annonces").upload(chemin, p.blob, { contentType: "image/jpeg", upsert: false }).then(function (r) {
          if (r.error) throw r.error;
          urls.push(client.storage.from("photos-annonces").getPublicUrl(chemin).data.publicUrl);
          i++; return suivante();
        });
      }
      return suivante().then(function () { return enregistrer({ photos: urls }); }).then(function () {
        var chemins = supprimees.map(cheminDepuisUrl).filter(function (c) { return c && c.indexOf(SESSION.user.id + "/") === 0; });
        if (chemins.length) client.storage.from("photos-annonces").remove(chemins).catch(function () {});
      });
    };
  }

  // ---------- Onglets ----------
  document.querySelectorAll("[data-vue]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-vue]").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      $("vue-logement").hidden = b.getAttribute("data-vue") !== "logement";
      $("vue-guide").hidden = b.getAttribute("data-vue") !== "guide";
    });
  });

  // ---------- Aperçu voyageur ----------
  function fermerApercu() { $("apercu").hidden = true; document.body.classList.remove("bloque"); }
  $("fermer-apercu").addEventListener("click", fermerApercu);
  $("btn-apercu").addEventListener("click", function () {
    var a = ANN, p = a.photos || [];
    function bloc(t, txt) { return txt ? "<section><h3>" + esc(t) + "</h3><p>" + nl(txt) + "</p></section>" : ""; }
    var regles = [];
    if (a.heure_arrivee) regles.push("Arrivée à partir de " + a.heure_arrivee);
    if (a.heure_depart) regles.push("Départ avant " + a.heure_depart);
    regles.push("Jusqu'à " + pluriel(a.voyageurs, "voyageur", "voyageurs"));
    regles.push(a.animaux ? "Animaux acceptés" : "Animaux non acceptés");
    regles.push(a.fumeurs ? "Logement fumeur" : "Non-fumeur");
    regles.push(a.fetes ? "Fêtes autorisées" : "Pas de fêtes ni d'événements");
    var secu = (a.securite || []).slice();
    if (secu.indexOf("Détecteur de monoxyde de carbone") < 0) secu.push("Aucune indication de la présence d'un détecteur de monoxyde de carbone");
    if (secu.indexOf("Détecteur de fumée") < 0) secu.push("Aucune indication de la présence d'un détecteur de fumée");
    var an = ANNULATION[a.annulation] || ["", ""];
    $("apercu-corps").innerHTML =
      '<h1 class="ap-titre">' + esc(a.titre) + "</h1>" +
      '<div class="ap-photos">' + p.slice(0, 5).map(function (u) { return '<img src="' + esc(u) + '" alt="">'; }).join("") + "</div>" +
      '<div class="ap-grille"><div>' +
      '<h2 class="ap-sous">' + esc(ESPACES[a.type_espace] || "") + " · " + esc(a.type_logement) + " · " + esc(a.ville) + ", " + esc(a.pays) + "</h2>" +
      '<p class="gris">' + pluriel(a.voyageurs, "voyageur", "voyageurs") + " · " + pluriel(a.chambres, "chambre", "chambres") + " · " + pluriel(a.lits, "lit", "lits") + " · " + pluriel(a.salles_de_bain, "salle de bain", "salles de bain") + "</p>" +
      '<div class="ap-hote"><span class="ap-avatar">' + esc((PROFIL && PROFIL.prenom || "H").charAt(0)) + "</span><div><strong>Hôte : " + esc(PROFIL ? PROFIL.prenom : "") + "</strong>" + (PROFIL && PROFIL.statut_verification === "verifie" ? '<span class="gris">Identité vérifiée</span>' : "") + "</div></div>" +
      '<section><p>' + nl(a.description) + "</p></section>" +
      bloc("Le logement", a.mon_logement) + bloc("Accès des voyageurs", a.acces_voyageurs) + bloc("Échanges avec les voyageurs", a.echanges_voyageurs) + bloc("Autres informations à noter", a.autres_infos) +
      ((a.equipements || []).length ? "<section><h3>Ce que propose ce logement</h3><ul class=\"ap-liste\">" + a.equipements.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" : "") +
      ((a.accessibilite || []).length ? "<section><h3>Accessibilité</h3><ul class=\"ap-liste\">" + a.accessibilite.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" : "") +
      "<section><h3>Où se situe le logement</h3><p>" + esc(a.ville) + ", " + esc(a.pays) + '</p><p class="gris">L\'adresse exacte vous sera communiquée après la réservation.</p></section>' +
      '<section class="ap-trois"><div><h3>Règlement intérieur</h3><ul>' + regles.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" + (a.reglement ? "<p>" + nl(a.reglement) + "</p>" : "") + "</div>" +
      "<div><h3>Sécurité et logement</h3><ul>" + secu.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
      "<div><h3>Conditions d'annulation</h3><p><strong>" + esc(an[0]) + "</strong><br>" + esc(an[1]) + "</p></div></section>" +
      "</div>" +
      '<aside class="ap-prix"><p><strong>' + esc(prix(a.prix_nuit, a.devise)) + "</strong> par nuit</p>" +
      (a.frais_menage ? '<p class="gris">Frais de ménage : ' + esc(prix(a.frais_menage, a.devise)) + "</p>" : "") +
      (a.reduction_semaine ? '<p class="gris">-' + a.reduction_semaine + " % à partir de 7 nuits</p>" : "") +
      (a.reduction_mois ? '<p class="gris">-' + a.reduction_mois + " % à partir de 28 nuits</p>" : "") +
      '<p class="gris">' + pluriel(a.nuits_min || 1, "nuit", "nuits") + " minimum</p>" +
      '<button type="button" class="btn btn-large" disabled>Réserver dès le 20 novembre</button>' +
      '<p class="ap-sans-frais">Aucun frais de service pour le voyageur</p></aside></div>';
    $("apercu").hidden = false; document.body.classList.add("bloque");
    $("apercu").scrollTop = 0;
  });

  // ---------- Démarrage ----------
  if (!client) { $("chargement").textContent = "Le site n'est pas encore relié à la base de données."; return; }
  A.exiger("annonce.html?id=" + ID)
    .then(function (s) {
      SESSION = s;
      return Promise.all([
        client.from("annonces").select("*").eq("id", ID).maybeSingle(),
        client.from("guides_arrivee").select("*").eq("annonce_id", ID).maybeSingle(),
        A.profil(s)
      ]);
    })
    .then(function (res) {
      if (res[0].error) throw res[0].error;
      if (!res[0].data) { location.replace("espace-hote.html"); return; }
      ANN = res[0].data;
      GUIDE = (res[1] && !res[1].error && res[1].data) || {};
      PROFIL = res[2];
      document.title = "Modifier « " + ANN.titre + " » – Sundarly";
      rendre();
      $("chargement").hidden = true; $("contenu").hidden = false; $("btn-apercu").hidden = false;
    })
    .catch(function (e) {
      console.error(e);
      $("chargement").textContent = "Impossible de charger l'annonce. Rechargez la page ; si le problème continue, écrivez à info@sundarly.com.";
    });
})();

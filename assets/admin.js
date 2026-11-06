// Sundarly — panneau d'administration (réservé aux comptes listés dans la table « admins »)
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function date(d, heure) {
    if (!d) return "";
    var x = new Date(d);
    return x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + (heure ? " " + x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");
  }
  var SYM = { EUR: "€", MAD: "DH", CHF: "CHF" };
  var STAT_ANN = { en_attente: ["À valider", "badge-cours"], validee: ["Validée", "badge-ok"], en_ligne: ["En ligne", "badge-ok"], refusee: ["Refusée", "badge-refus"], archivee: ["Masquée", "badge-attente"] };
  var STAT_ID = { non_verifie: ["Pas envoyé", "badge-attente"], en_cours: ["À vérifier", "badge-cours"], verifie: ["Vérifiée", "badge-ok"], refuse: ["Refusée", "badge-refus"] };
  var PIECES = { cni: "Carte d'identité", passeport: "Passeport", titre_sejour: "Titre de séjour", permis: "Permis de conduire" };
  var D = { stats: null, comptes: [], annonces: [], hotes: [], voyageurs: [] };

  $("btn-deconnexion").addEventListener("click", function () { (client ? client.auth.signOut() : Promise.resolve()).then(function () { location.replace("/"); }); });
  $("btn-actualiser").addEventListener("click", function () { charger(); });

  // ---------- Onglets ----------
  document.querySelectorAll("[data-vue]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-vue]").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      document.querySelectorAll("[data-panneau]").forEach(function (p) { p.hidden = p.getAttribute("data-panneau") !== b.getAttribute("data-vue"); });
      try { sessionStorage.setItem("sundarly-admin-vue", b.getAttribute("data-vue")); } catch (e) {}
    });
  });

  // ---------- Chargement ----------
  if (!client) { $("chargement").textContent = "Le site n'est pas encore relié à la base de données."; return; }
  A.exiger("admin.html")
    .then(function () { return client.rpc("est_admin"); })
    .then(function (r) {
      if (r.error || !r.data) { $("chargement").hidden = true; $("refus").hidden = false; return; }
      return charger().then(function () {
        $("chargement").hidden = true; $("contenu").hidden = false;
        var v = null; try { v = sessionStorage.getItem("sundarly-admin-vue"); } catch (e) {}
        var b = v && document.querySelector('[data-vue="' + v + '"]'); if (b) b.click();
      });
    })
    .catch(function (e) { console.error(e); $("chargement").textContent = "Impossible de charger le panneau. Avez-vous exécuté le fichier admin.sql dans Supabase ?"; });

  function charger() {
    return Promise.all([
      client.rpc("admin_stats"),
      client.rpc("admin_comptes"),
      client.from("annonces").select("id,created_at,statut,titre,type_logement,ville,pays,prix_nuit,devise,photos,nom,email,telephone,hote_id").order("created_at", { ascending: false }),
      client.from("hotes").select("*").order("created_at", { ascending: false }),
      client.from("liste_attente").select("*").order("created_at", { ascending: false }),
      client.rpc("site_ouvert")
    ]).then(function (r) {
      r.forEach(function (x) { if (x.error) throw x.error; });
      D.stats = r[0].data; D.comptes = r[1].data || []; D.annonces = r[2].data || []; D.hotes = r[3].data || []; D.voyageurs = r[4].data || [];
      D.ouvert = !!r[5].data;
      rendreBord(); rendreIdentites(); rendreAnnonces(); rendreTableaux(); rendreOuverture();
    });
  }

  // ---------- Ouverture du site voyageurs ----------
  function rendreOuverture() {
    var enLigne = D.annonces.filter(function (a) { return a.statut === "en_ligne"; }).length;
    $("ouverture-texte").innerHTML = D.ouvert
      ? "<strong>Ouvert au public.</strong> Les visiteurs voient les " + enLigne + " annonce(s) « En ligne »."
      : "<strong>Fermé au public (aperçu).</strong> Vous seule voyez les logements. Les visiteurs voient « Bientôt disponible ». Le jour J, cliquez sur « Ouvrir le site » : seules les annonces « En ligne » (" + enLigne + " aujourd'hui) seront visibles.";
    var b = $("btn-ouvrir");
    b.textContent = D.ouvert ? "Refermer le site" : "Ouvrir le site au public";
    b.className = "btn btn-petit " + (D.ouvert ? "btn-contour" : "btn-sombre");
  }
  $("btn-ouvrir").addEventListener("click", function () {
    var ouvrir = !D.ouvert;
    if (!confirm(ouvrir ? "Ouvrir le site voyageurs à tout le monde ? Les annonces « En ligne » seront visibles par tous." : "Refermer le site voyageurs ? Les visiteurs verront à nouveau « Bientôt disponible ».")) return;
    client.rpc("admin_ouvrir_site", { ouvrir: ouvrir }).then(function (r) { if (r.error) throw r.error; return charger(); })
      .catch(function (e) { console.error(e); alert("La modification n'a pas fonctionné."); });
  });

  // ---------- Tableau de bord ----------
  function rendreBord() {
    var s = D.stats;
    var tuiles = [
      ["Voyageurs en liste d'attente", s.voyageurs, "Prévenus à l'ouverture", "voyageurs"],
      ["Comptes propriétaires", s.comptes, s.comptes_confirmes + " e-mail(s) confirmé(s)", "proprietaires"],
      ["Identités à vérifier", s.identites_a_verifier, s.hotes_verifies + " hôte(s) vérifié(s)", "identites"],
      ["Annonces à valider", s.annonces_a_valider, s.annonces + " annonce(s) au total · " + s.annonces_en_ligne + " validée(s)", "annonces"],
      ["Ancien formulaire hôtes", s.anciens_proprietaires, "Inscriptions avant les comptes", "proprietaires"]
    ];
    $("tuiles").innerHTML = tuiles.map(function (t) {
      return '<button type="button" class="tuile-stat" data-aller="' + t[3] + '"><span class="tuile-libelle">' + esc(t[0]) + '</span><span class="tuile-nombre">' + Number(t[1]).toLocaleString("fr-FR") + '</span><span class="tuile-detail">' + esc(t[2]) + "</span></button>";
    }).join("");
    $("tuiles").querySelectorAll("[data-aller]").forEach(function (b) { b.addEventListener("click", function () { document.querySelector('[data-vue="' + b.getAttribute("data-aller") + '"]').click(); }); });
    var jours = s.par_jour || [];
    graphe($("g-comptes"), "Comptes propriétaires créés", "30 derniers jours", jours, "comptes");
    graphe($("g-voyageurs"), "Voyageurs inscrits à la liste d'attente", "30 derniers jours", jours, "voyageurs");
    pastille("p-identites", s.identites_a_verifier); pastille("p-annonces", s.annonces_a_valider);
  }
  function pastille(id, n) { $(id).hidden = !n; $(id).textContent = n; }

  // Histogramme simple : une barre par jour (une seule série, pas de légende)
  function graphe(fig, titre, sous, jours, cle) {
    var max = Math.max(1, Math.max.apply(null, jours.map(function (j) { return j[cle]; })));
    var total = jours.reduce(function (a, j) { return a + j[cle]; }, 0);
    var pas = max <= 4 ? 1 : Math.ceil(max / 4);
    var haut = Math.ceil(max / pas) * pas;
    var lignes = []; for (var v = 0; v <= haut; v += pas) lignes.push(v);
    fig.innerHTML = '<figcaption><strong>' + esc(titre) + '</strong><span class="gris">' + esc(sous) + " · total " + total + "</span></figcaption>" +
      '<div class="histo"><div class="histo-axe">' + lignes.slice().reverse().map(function (v) { return "<span>" + v + "</span>"; }).join("") + "</div>" +
      '<div class="histo-zone">' + lignes.map(function (v) { return '<i class="histo-grille" style="bottom:' + (v / haut * 100) + '%"></i>'; }).join("") +
      '<div class="histo-barres">' + jours.map(function (j) {
        var h = j[cle] / haut * 100;
        return '<div class="histo-col" data-info="' + esc(date(j.jour) + " : " + j[cle]) + '"><div class="histo-barre" style="height:' + h + '%"></div></div>';
      }).join("") + "</div></div></div>" +
      '<div class="histo-dates"><span>' + esc(date(jours[0] && jours[0].jour)) + "</span><span>Aujourd'hui</span></div>";
    var bulle = $("infobulle");
    fig.querySelectorAll(".histo-col").forEach(function (c) {
      c.addEventListener("mouseenter", function () {
        var r = c.getBoundingClientRect();
        bulle.textContent = c.getAttribute("data-info"); bulle.hidden = false;
        bulle.style.left = (r.left + r.width / 2 + window.scrollX) + "px"; bulle.style.top = (r.top + window.scrollY - 8) + "px";
      });
      c.addEventListener("mouseleave", function () { bulle.hidden = true; });
    });
  }

  // ---------- Statistiques de visites ----------
  try { localStorage.setItem("sundarly-admin", "1"); } catch (e) {} // vos propres visites ne sont pas comptées
  var NOMS_PAYS = null;
  try { NOMS_PAYS = new Intl.DisplayNames(["fr"], { type: "region" }); } catch (e) {}
  function nomPays(c) {
    if (!c || c === "??") return "Inconnu";
    var drapeau = String.fromCodePoint.apply(null, c.split("").map(function (l) { return 127397 + l.charCodeAt(0); }));
    var nom = c; try { nom = NOMS_PAYS ? NOMS_PAYS.of(c) : c; } catch (e) {}
    return drapeau + " " + nom;
  }
  var NOMS_PAGES = { "/": "Accueil", "/index": "Accueil", "/hotes": "Devenir hôte", "/logements": "Logements", "/logement": "Fiche logement", "/compte": "Connexion / inscription", "/espace-hote": "Espace hôte", "/publier": "Publier une annonce", "/verification": "Vérification d'identité", "/locations-vacances": "Destinations", "/conditions-generales": "Conditions générales" };
  function nomPage(p) { return NOMS_PAGES[p] || (p.indexOf("/locations-vacances/") === 0 ? "Destination : " + p.split("/").pop() : p); }
  function classement(id, liste, nom, unite) {
    var z = $(id); liste = liste || [];
    if (!liste.length) { z.innerHTML = '<p class="vide">Pas encore de données.</p>'; return; }
    var max = Math.max.apply(null, liste.map(function (x) { return x.n; }));
    z.innerHTML = liste.map(function (x) {
      return '<div class="ligne-classement"><div class="ligne-classement-texte"><span>' + esc(nom ? nom(x.cle) : x.cle) + '</span><strong>' + Number(x.n).toLocaleString("fr-FR") + " " + unite + '</strong></div><div class="barre"><span style="width:' + (x.n / max * 100) + '%"></span></div></div>';
    }).join("");
  }
  function chargerVisites() {
    var j = Number($("f-periode").value);
    return client.rpc("admin_visites", { p_jours: j }).then(function (r) {
      if (r.error) throw r.error;
      var s = r.data, libelle = j === 1 ? "aujourd'hui" : "sur " + j + " jours";
      $("stats-note").textContent = s.premiere_visite ? "Visites comptées depuis le " + date(s.premiere_visite) + ". Vos propres visites ne sont pas comptées." : "Les visites seront comptées dès les prochaines visites (vos propres visites ne sont pas comptées).";
      var t = [
        ["Visiteurs " + libelle, s.visiteurs, "Personnes différentes"],
        ["Pages vues " + libelle, s.pages_vues, s.visiteurs ? (s.pages_vues / s.visiteurs).toFixed(1).replace(".", ",") + " page(s) par visiteur" : "—"],
        ["Visiteurs aujourd'hui", s.visiteurs_jour, "Depuis minuit"],
        ["Pays différents", s.pays_differents, libelle]
      ];
      $("tuiles-visites").innerHTML = t.map(function (x) {
        return '<div class="tuile-stat"><span class="tuile-libelle">' + esc(x[0]) + '</span><span class="tuile-nombre">' + Number(x[1]).toLocaleString("fr-FR") + '</span><span class="tuile-detail">' + esc(x[2]) + "</span></div>";
      }).join("");
      graphe($("g-visites"), "Visiteurs par jour", j === 1 ? "Aujourd'hui" : j + " derniers jours", s.par_jour || [], "visiteurs");
      classement("c-pays", s.pays, nomPays, "visiteur(s)");
      classement("c-provenances", s.provenances, null, "visiteur(s)");
      classement("c-pages", s.pages, nomPage, "vue(s)");
      classement("c-villes", s.villes, null, "visiteur(s)");
      classement("c-appareils", s.appareils, null, "visiteur(s)");
    }).catch(function (e) { console.error(e); $("stats-note").textContent = "Impossible de charger les statistiques pour le moment."; });
  }
  $("f-periode").addEventListener("change", chargerVisites);
  document.querySelector('[data-vue="statistiques"]').addEventListener("click", chargerVisites);

  // ---------- Identités ----------
  $("f-identites").addEventListener("change", rendreIdentites);
  function rendreIdentites() {
    var f = $("f-identites").value;
    var liste = D.comptes.filter(function (c) { return f === "tous" || (c.statut_verification || "non_verifie") === f; });
    var z = $("liste-identites");
    if (!liste.length) { z.innerHTML = '<p class="vide">Rien à afficher ici pour le moment.</p>'; return; }
    z.innerHTML = liste.map(function (c) {
      var st = STAT_ID[c.statut_verification || "non_verifie"];
      return '<article class="ligne-admin"><div class="ligne-texte"><strong>' + esc((c.prenom || "") + " " + (c.nom || "")) + '</strong><span class="gris">' + esc(c.email) + " · " + esc(c.telephone || "") + (c.pays ? " · " + esc(c.pays) : "") + '</span><span class="gris petit">Inscrit le ' + date(c.inscrit_le) + (c.email_confirme ? "" : " · e-mail non confirmé") + (c.piece_envoyee_le ? " · pièce envoyée le " + date(c.piece_envoyee_le, true) : "") + " · " + c.nb_annonces + " annonce(s)</span></div>" +
        '<span class="badge ' + st[1] + '">' + st[0] + "</span>" +
        (c.piece_envoyee_le ? '<button type="button" class="btn btn-sombre btn-petit" data-docs="' + c.id + '">Voir les documents</button>' : "") + "</article>";
    }).join("");
    z.querySelectorAll("[data-docs]").forEach(function (b) { b.addEventListener("click", function () { ouvrirDocs(b.getAttribute("data-docs")); }); });
  }

  var DOC_ID = null;
  function ouvrirDocs(id) {
    var c = D.comptes.filter(function (x) { return x.id === id; })[0];
    DOC_ID = id;
    $("docs-titre").textContent = (c.prenom || "") + " " + (c.nom || "");
    $("docs-infos").textContent = (PIECES[c.type_piece] || "Pièce") + " · " + c.email + " · " + (c.telephone || "") + " · envoyée le " + date(c.piece_envoyee_le, true);
    $("docs-grille").innerHTML = '<p class="gris">Chargement des documents…</p>';
    $("docs").hidden = false; document.body.classList.add("bloque");
    client.storage.from("pieces-identite").list(id, { limit: 50, sortBy: { column: "name", order: "desc" } }).then(function (r) {
      if (r.error) throw r.error;
      var fichiers = (r.data || []).filter(function (f) { return f.name && f.name.indexOf(".") > 0; });
      if (!fichiers.length) { $("docs-grille").innerHTML = '<p class="gris">Aucun document trouvé.</p>'; return; }
      return client.storage.from("pieces-identite").createSignedUrls(fichiers.map(function (f) { return id + "/" + f.name; }), 600).then(function (s) {
        if (s.error) throw s.error;
        $("docs-grille").innerHTML = s.data.map(function (d, i) {
          var nom = fichiers[i].name, type = /recto/.test(nom) ? "Recto" : /verso/.test(nom) ? "Verso" : /selfie/.test(nom) ? "Selfie" : "Document";
          var envoi = /^(\d{13})-/.exec(nom); envoi = envoi ? " · " + date(+envoi[1], true) : "";
          var pdf = /\.pdf$/i.test(nom);
          return '<a class="doc" href="' + esc(d.signedUrl) + '" target="_blank" rel="noopener">' + (pdf ? '<span class="doc-pdf">PDF</span>' : '<img src="' + esc(d.signedUrl) + '" alt="' + type + '">') + "<span>" + type + esc(envoi) + "</span></a>";
        }).join("");
      });
    }).catch(function (e) { console.error(e); $("docs-grille").innerHTML = '<p class="message erreur">Impossible d\'afficher les documents.</p>'; });
  }
  function fermerDocs() { $("docs").hidden = true; document.body.classList.remove("bloque"); DOC_ID = null; }
  document.querySelector("[data-fermer-docs]").addEventListener("click", fermerDocs);
  $("docs").addEventListener("click", function (e) { if (e.target === $("docs")) fermerDocs(); });
  function decider(statut) {
    if (!DOC_ID) return;
    client.from("profils").update({ statut_verification: statut }).eq("id", DOC_ID).then(function (r) {
      if (r.error) throw r.error;
      fermerDocs(); return charger();
    }).catch(function (e) { console.error(e); alert("La mise à jour n'a pas fonctionné."); });
  }
  $("btn-valider-id").addEventListener("click", function () { decider("verifie"); });
  $("btn-refuser-id").addEventListener("click", function () { decider("refuse"); });

  // ---------- Annonces ----------
  $("f-annonces").addEventListener("change", rendreAnnonces);
  function rendreAnnonces() {
    var f = $("f-annonces").value;
    var liste = D.annonces.filter(function (a) { return f === "tous" || a.statut === f; });
    var z = $("liste-annonces");
    if (!liste.length) { z.innerHTML = '<p class="vide">Aucune annonce ici pour le moment.</p>'; return; }
    var idHote = {}; D.comptes.forEach(function (c) { idHote[c.id] = c; });
    z.innerHTML = liste.map(function (a) {
      var st = STAT_ANN[a.statut] || [a.statut, "badge-attente"];
      var h = idHote[a.hote_id];
      var verif = h ? (STAT_ID[h.statut_verification || "non_verifie"] || [""])[0] : "sans compte";
      var actions = [];
      if (a.statut !== "validee" && a.statut !== "en_ligne") actions.push(["Valider", "validee", "btn-sombre"]);
      if (a.statut === "validee") actions.push(["Mettre en ligne", "en_ligne", "btn-sombre"]);
      if (a.statut !== "refusee") actions.push(["Refuser", "refusee", "btn-contour"]);
      if (a.statut === "validee" || a.statut === "en_ligne") actions.push(["Masquer", "archivee", "btn-contour"]);
      return '<article class="ligne-admin"><div class="annonce-photo">' + (a.photos && a.photos[0] ? '<img src="' + esc(a.photos[0]) + '" alt="" loading="lazy">' : "") + "</div>" +
        '<div class="ligne-texte"><strong>' + esc(a.titre) + '</strong><span class="gris">' + esc(a.type_logement) + " · " + esc(a.ville) + ", " + esc(a.pays) + " · " + Number(a.prix_nuit).toLocaleString("fr-FR") + " " + (SYM[a.devise] || a.devise) + " / nuit</span>" +
        '<span class="gris petit">Hôte : ' + esc(a.nom) + " · " + esc(a.email) + " · identité : " + esc(verif) + " · déposée le " + date(a.created_at) + "</span></div>" +
        '<span class="badge ' + st[1] + '">' + st[0] + "</span>" +
        '<div class="actions-admin"><a class="btn btn-contour btn-petit" href="annonce.html?id=' + a.id + '">Voir / modifier</a>' +
        actions.map(function (x) { return '<button type="button" class="btn ' + x[2] + ' btn-petit" data-statut="' + x[1] + '" data-id="' + a.id + '">' + x[0] + "</button>"; }).join("") + "</div></article>";
    }).join("");
    z.querySelectorAll("[data-statut]").forEach(function (b) {
      b.addEventListener("click", function () {
        b.disabled = true;
        client.from("annonces").update({ statut: b.getAttribute("data-statut") }).eq("id", b.getAttribute("data-id")).then(function (r) {
          if (r.error) throw r.error; return charger();
        }).catch(function (e) { console.error(e); b.disabled = false; alert(/IDENTITE/.test(e && e.message || "") ? "Impossible : l'identité de cet hôte n'est pas encore validée. Validez d'abord sa pièce d'identité (onglet Identités)." : "La mise à jour n'a pas fonctionné."); });
      });
    });
  }

  // ---------- Tableaux + export Excel ----------
  var COLONNES = {
    comptes: [["inscrit_le", "Inscrit le", date], ["prenom", "Prénom"], ["nom", "Nom"], ["email", "E-mail"], ["telephone", "Téléphone"], ["pays", "Pays"], ["email_confirme", "E-mail confirmé", function (v) { return v ? "Oui" : "Non"; }], ["statut_verification", "Identité", function (v) { return (STAT_ID[v || "non_verifie"] || [v])[0]; }], ["nb_annonces", "Annonces"]],
    hotes: [["created_at", "Date", date], ["nom", "Nom"], ["email", "E-mail"], ["telephone", "Téléphone"], ["pays", "Pays"], ["ville", "Ville"], ["type_logement", "Type"], ["nb_logements", "Logements"], ["message", "Message"]],
    voyageurs: [["created_at", "Date", date], ["email", "E-mail"], ["destination", "Destination rêvée"]]
  };
  function donnees(cle) { return cle === "comptes" ? D.comptes : cle === "hotes" ? D.hotes : D.voyageurs; }
  function cellule(col, ligne) { var v = ligne[col[0]]; return col[2] ? col[2](v) : (v == null ? "" : v); }
  function tableau(id, cle) {
    var cols = COLONNES[cle], lignes = donnees(cle);
    $(id).innerHTML = "<thead><tr>" + cols.map(function (c) { return "<th>" + esc(c[1]) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      (lignes.length ? lignes.map(function (l) { return "<tr>" + cols.map(function (c) { return "<td>" + esc(cellule(c, l)) + "</td>"; }).join("") + "</tr>"; }).join("")
        : '<tr><td colspan="' + cols.length + '" class="vide">Aucune inscription pour le moment.</td></tr>') + "</tbody>";
  }
  function rendreTableaux() { tableau("t-comptes", "comptes"); tableau("t-hotes", "hotes"); tableau("t-voyageurs", "voyageurs"); }
  document.querySelectorAll("[data-export]").forEach(function (b) {
    b.addEventListener("click", function () {
      var cle = b.getAttribute("data-export"), cols = COLONNES[cle];
      function q(v) { v = String(v == null ? "" : v); if (/^[=@]|^[+\-](?![\d\s])/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
      var csv = "﻿" + cols.map(function (c) { return q(c[1]); }).join(";") + "\r\n" +
        donnees(cle).map(function (l) { return cols.map(function (c) { return q(cellule(c, l)); }).join(";"); }).join("\r\n");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = "sundarly-" + cle + "-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
    });
  });
})();

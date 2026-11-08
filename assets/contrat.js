// Sundarly — contrat de séjour : rempli depuis la réservation, accepté par le voyageur (preuve horodatée)
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var ID = new URLSearchParams(location.search).get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(ID)) { $("etat").textContent = "Lien de contrat invalide."; return; }
  if (!client) { $("etat").textContent = "Le site n'est pas encore relié à la base de données."; return; }

  var PIECES = { cni: "Carte d'identité", passeport: "Passeport", titre_sejour: "Titre de séjour", permis: "Permis de conduire" };
  var ANNUL = { souple: "Souple — remboursement intégral jusqu'à 24 h avant l'arrivée", moderee: "Modérée — remboursement intégral jusqu'à 5 jours avant l'arrivée", stricte: "Stricte — remboursement de 50 % jusqu'à 7 jours avant l'arrivée, rien ensuite" };
  var SYM = { EUR: "€", MAD: "DH", CHF: "CHF" };
  function jour(d) { return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }
  function dateHeure(d) { return new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function montant(v, dev) { return v == null ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " " + (SYM[dev] || dev); }

  // Le modèle est scopé à .feuille pour ne pas toucher le reste de la page
  function scoper(css) {
    return css.replace(/(^|\})\s*([^@{}][^{}]*)\{/g, function (m, fin, sel) {
      if (/^\s*:root\s*$/.test(sel)) return fin + sel + "{";
      return fin + "\n" + sel.split(",").map(function (s) { s = s.trim(); return s === "body" ? ".feuille" : ".feuille " + s; }).join(", ") + " {";
    });
  }

  function remplir(gabarit, c) {
    var regles = c.reglement ? "<p><strong>Règles ajoutées par le propriétaire :</strong> " + esc(c.reglement).replace(/\n/g, "<br>") + "</p>" : "";
    var V = {
      REFERENCE: esc(c.reference), DATE_EMISSION: esc(new Date(c.paye_le || Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })),
      BANDEAU_MODELE: "",
      HOTE_NOM: esc(c.hote_nom), ADRESSE: esc(c.adresse), LOGEMENT: esc(c.logement),
      VOYAGEUR_NOM: esc(c.voyageur_nom), PIECE_TYPE: esc(PIECES[c.piece_type] || "Pièce d'identité"),
      PIECE_NUMERO: c.piece_numero ? esc(c.piece_numero) : "<em>à indiquer ci-dessous</em>",
      ARRIVEE: esc(jour(c.arrivee)), DEPART: esc(jour(c.depart)),
      NB_VOYAGEURS: c.voyageurs + " voyageur" + (c.voyageurs > 1 ? "s" : "") + (c.animaux ? " + animal" : ""),
      TOTAL: esc(montant(c.total, c.devise)),
      HEURE_ARRIVEE: esc(c.heure_arrivee || "—"), HEURE_DEPART: esc(c.heure_depart || "—"),
      REGLE_ANIMAUX: c.regle_animaux ? "Animaux acceptés" + (c.frais_animaux ? " (frais : " + esc(montant(c.frais_animaux, c.devise)) + " par séjour)" : ", sans frais") : "Animaux non acceptés",
      REGLE_FUMEURS: c.fumeurs ? "Logement fumeur" : "Logement non-fumeur",
      REGLE_FETES: c.fetes ? "Fêtes et événements autorisés" : "Pas de fêtes ni d'événements",
      REGLES_HOTE: regles,
      CAUTION: c.caution ? "<p>Une caution de <strong>" + esc(montant(c.caution, c.devise)) + "</strong> est prévue pour ce logement : elle peut servir à couvrir tout ou partie de ces frais.</p>" : "",
      ANNULATION: esc(ANNUL[c.annulation] || c.annulation || "—"), PAYS: esc(c.pays),
      DATE_ACCEPTATION: c.accepte_le ? esc(dateHeure(c.accepte_le)) : "—",
      PREUVE: c.preuve ? "Compte vérifié · réf. " + esc(c.preuve) : "—"
    };
    return gabarit.replace(/\{\{(\w+)\}\}/g, function (m, k) { return V[k] != null ? V[k] : ""; });
  }

  function formulaire(c) {
    var d = document.createElement("div"); d.className = "signature accepter";
    d.innerHTML = '<h3>Acceptation électronique du voyageur</h3>' +
      '<label class="champ" for="num">Numéro de votre pièce d\'identité</label><input type="text" id="num" maxlength="40" autocomplete="off" value="' + esc(c.piece_numero || "") + '" placeholder="Tel qu\'il figure sur votre pièce">' +
      '<label class="case-acc"><input type="checkbox" id="ok"><span>J\'ai lu et j\'accepte le présent contrat et le règlement du logement. Je m\'engage à respecter le bien, le voisinage et le règlement, et à restituer le logement propre. Je reconnais être responsable des dégradations, de la casse et des vols survenus pendant mon séjour, et que le propriétaire ou son représentant peut mettre fin à mon séjour en cas de manquement grave.</span></label>' +
      '<p class="erreur" id="err" role="alert"></p><button type="button" id="valider" disabled>J\'accepte le contrat et je confirme ma réservation</button>';
    var ok = d.querySelector("#ok"), b = d.querySelector("#valider");
    ok.addEventListener("change", function () { b.disabled = !ok.checked; });
    b.addEventListener("click", function () {
      var num = d.querySelector("#num").value.trim();
      if (num.length < 4) { d.querySelector("#err").textContent = "Indiquez le numéro de votre pièce d'identité."; return; }
      b.disabled = true; b.textContent = "Enregistrement…";
      client.rpc("accepter_contrat", { p_reservation: ID, p_numero_piece: num, p_navigateur: navigator.userAgent })
        .then(function (r) { if (r.error) throw r.error; charger(); window.scrollTo(0, 0); })
        .catch(function (e) { console.error(e); d.querySelector("#err").textContent = (e && e.message) || "L'acceptation n'a pas pu être enregistrée."; b.disabled = false; b.textContent = "J'accepte le contrat et je confirme ma réservation"; });
    });
    return d;
  }

  var GABARIT = null, STYLE = false;
  function charger() {
    return Promise.all([
      GABARIT ? Promise.resolve(GABARIT) : fetch("modeles/contrat-sejour.html").then(function (r) { return r.text(); }),
      client.rpc("contrat_reservation", { p_reservation: ID })
    ]).then(function (x) {
      GABARIT = x[0]; var r = x[1];
      if (r.error) throw r.error;
      var c = r.data;
      if (!c) { $("etat").textContent = "Ce contrat n'existe pas ou ne vous concerne pas."; return; }
      var doc = new DOMParser().parseFromString(GABARIT, "text/html");
      if (!STYLE) { var st = document.createElement("style"); st.textContent = scoper(doc.querySelector("style").textContent.replace(/@page[^}]*\}/, "")); document.head.appendChild(st); STYLE = true; }
      var f = $("feuille");
      f.innerHTML = remplir(doc.body.innerHTML, c);
      var sig = f.querySelector(".signature");
      var annule = c.statut === "annulee", limite = c.limite ? new Date(c.limite) : null;
      var bandeau = "";
      if (!c.paye_le && !annule) {
        bandeau = '<p class="bandeau-delai">⏳ <strong>Paiement en cours de vérification…</strong> Cette page se met à jour automatiquement.</p>';
        if (ESSAIS++ < 8) setTimeout(function () { (SESSION_STRIPE ? confirmerPaiement() : Promise.resolve()).then(charger); }, 3000);
      } else if (annule) bandeau = '<p class="bandeau-delai bandeau-annule"><strong>Réservation annulée.</strong> ' + esc(c.motif_annulation || "") + "</p>";
      else if (!c.accepte_le && limite) bandeau = '<p class="bandeau-delai">' + (c.role === "voyageur" ? "<strong>Dernière étape obligatoire :</strong> votre réservation n'est confirmée qu'après la signature de ce contrat. Il vous reste <strong data-chrono>5:00</strong> pour le signer en bas de la page, sinon la réservation sera annulée et remboursée." : "En attente de la signature du voyageur (avant " + esc(dateHeure(limite)) + ").") + "</p>";
      if (c.paye_le && !c.accepte_le && !annule && SESSION_STRIPE && c.role === "voyageur") bandeau = '<p class="bandeau-delai" style="background:#E8F6EE;color:#14532D">✓ <strong>Paiement reçu, merci !</strong> Il reste une étape : acceptez le contrat ci-dessous pour confirmer définitivement votre réservation.</p>' + bandeau;
      if (c.accepte_le && SESSION_STRIPE) bandeau = '<p class="bandeau-delai" style="background:#E8F6EE;color:#14532D">✓ <strong>Réservation confirmée !</strong> Retrouvez-la à tout moment dans « Mes réservations ».</p>';
      if (bandeau) f.insertAdjacentHTML("afterbegin", bandeau);
      if (!c.accepte_le) {
        if (c.role === "voyageur" && !annule && c.paye_le) sig.replaceWith(formulaire(c));
        else sig.innerHTML = "<h3>Acceptation électronique du voyageur</h3><p>" + (annule ? "Contrat non accepté." : "Pas encore accepté par le voyageur.") + "</p>";
      }
      // Compte à rebours des 5 minutes pour signer
      clearInterval(window.__chrono);
      var ch = f.querySelector("[data-chrono]");
      if (ch && limite) {
        var maj = function () {
          var r = Math.max(0, Math.round((limite - Date.now()) / 1000));
          ch.textContent = Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
          if (r === 0) { clearInterval(window.__chrono); setTimeout(charger, 65000); }
        };
        maj(); window.__chrono = setInterval(maj, 1000);
      }
      $("imprimer").hidden = !c.accepte_le;
      $("etat").hidden = true; f.hidden = false;
    }).catch(function (e) { console.error(e); $("etat").textContent = "Impossible de charger le contrat. Rechargez la page."; });
  }
  // Retour de Stripe : on fait vérifier le paiement par le serveur
  var SESSION_STRIPE = new URLSearchParams(location.search).get("session"), ESSAIS = 0;
  function confirmerPaiement() {
    return fetch("/api/confirmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: SESSION_STRIPE }) })
      .then(function (r) { return r.json(); }).catch(function () { return {}; });
  }
  $("imprimer").addEventListener("click", function () { window.print(); });
  A.exiger("contrat.html?id=" + ID).then(function () { return SESSION_STRIPE ? confirmerPaiement() : null; }).then(charger);
})();

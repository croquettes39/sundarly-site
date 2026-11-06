// Sundarly — mes avis (voyageurs et hôtes) : écrire, répondre, contester
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  function d(x) { return new Date(x).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  function etoiles(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  if (!client) { $("chargement").textContent = "Le site n'est pas encore relié à la base de données."; return; }

  var CRIT_VOY = [["note", "Note globale"], ["proprete", "Propreté"], ["exactitude", "Précision de l'annonce"], ["communication", "Communication de l'hôte"], ["emplacement", "Emplacement"], ["arrivee", "Arrivée"], ["qualite_prix", "Qualité-prix"]];
  var CRIT_HOTE = [["note", "Note globale"], ["communication", "Communication"], ["respect_regles", "Respect du logement et des règles"]];

  function choixEtoiles(nom, label) {
    var h = '<fieldset class="etoiles-choix"><legend>' + esc(label) + "</legend><div>";
    for (var i = 5; i >= 1; i--) h += '<input type="radio" id="' + nom + i + '" name="' + nom + '" value="' + i + '"><label for="' + nom + i + '" title="' + i + ' sur 5">★</label>';
    return h + "</div></fieldset>";
  }

  function charger() {
    return client.rpc("mes_avis").then(function (r) {
      if (r.error) throw r.error;
      var m = r.data || {};
      // À écrire
      var ae = m.a_ecrire || [];
      $("a-ecrire").innerHTML = ae.length ? "" : '<p class="vide">Aucun avis à écrire pour le moment. Après chaque séjour, il apparaîtra ici.</p>';
      ae.forEach(function (x, k) {
        var crit = x.role === "voyageur" ? CRIT_VOY : CRIT_HOTE;
        var f = document.createElement("form"); f.className = "form-avis";
        f.innerHTML = "<h3>" + (x.role === "voyageur" ? "Votre séjour : " + esc(x.titre) : "Votre voyageur : " + esc(x.autre || "")) + '</h3><p class="gris">' + esc(x.ville) + " · du " + d(x.arrivee) + " au " + d(x.depart) + " · à écrire avant le " + d(x.limite) + "</p>" +
          '<div class="etoiles-grille">' + crit.map(function (c) { return choixEtoiles(c[0] + "-" + k, c[1]); }).join("") + "</div>" +
          '<label class="champ">' + (x.role === "voyageur" ? "Votre avis public sur le logement" : "Votre avis public sur " + esc(x.autre || "ce voyageur")) + '<textarea name="commentaire" rows="5" minlength="20" maxlength="1500" required placeholder="' + (x.role === "voyageur" ? "Qu'avez-vous aimé ? Qu'est-ce qui pourrait être amélioré ?" : "Comment s'est passé le séjour ? Recommanderiez-vous ce voyageur aux autres hôtes ?") + '"></textarea></label>' +
          '<label class="champ">Message privé <span class="facultatif">(facultatif, visible seulement par ' + esc(x.autre || "l'autre personne") + ")</span><textarea name=\"prive\" rows=\"2\" maxlength=\"1000\"></textarea></label>" +
          '<p class="message" role="status"></p><div class="actions"><span></span><button class="btn" type="submit">Publier mon avis</button></div>';
        f.addEventListener("submit", function (e) {
          e.preventDefault();
          var v = {}; var manque = false;
          crit.forEach(function (c) { var s = f.querySelector('input[name="' + c[0] + "-" + k + '"]:checked'); if (!s) manque = true; v[c[0]] = s ? +s.value : null; });
          var msg = f.querySelector(".message");
          if (manque) { msg.className = "message erreur"; msg.textContent = "Donnez une note (étoiles) à chaque critère."; return; }
          var txt = f.elements.commentaire.value.trim();
          if (txt.length < 20) { msg.className = "message erreur"; msg.textContent = "Votre avis doit faire au moins 20 caractères."; return; }
          var b = f.querySelector("button"); b.disabled = true; b.textContent = "Envoi…";
          client.rpc("deposer_avis", {
            p_reservation: x.reservation, p_note: v.note, p_commentaire: txt,
            p_proprete: v.proprete || null, p_exactitude: v.exactitude || null, p_communication: v.communication || null,
            p_emplacement: v.emplacement || null, p_arrivee: v.arrivee || null, p_qualite_prix: v.qualite_prix || null,
            p_respect_regles: v.respect_regles || null, p_message_prive: f.elements.prive.value.trim() || null
          }).then(function (r) { if (r.error) throw r.error; charger(); })
            .catch(function (err) { console.error(err); msg.className = "message erreur"; msg.textContent = (err && err.message) || "L'envoi n'a pas abouti."; b.disabled = false; b.textContent = "Publier mon avis"; });
        });
        $("a-ecrire").appendChild(f);
      });
      // Reçus
      var re = m.recus || [];
      $("recus").innerHTML = re.length ? "" : '<p class="vide">Vous n\'avez pas encore reçu d\'avis.</p>';
      re.forEach(function (a) {
        var el = document.createElement("article"); el.className = "av-item";
        el.innerHTML = '<div class="av-tete"><span class="fi-avatar">' + esc((a.prenom || "?").charAt(0)) + "</span><div><strong>" + esc(a.prenom || "") + " · " + (a.role_auteur === "voyageur" ? "voyageur" : "hôte") + "</strong><span>" + esc(a.titre) + " · " + d(a.date) + "</span></div></div>" +
          '<p class="av-etoiles">' + etoiles(a.note) + "</p><p>" + nl(a.commentaire) + "</p>" +
          (a.message_prive ? '<div class="av-prive"><strong>Message privé pour vous</strong><p>' + nl(a.message_prive) + "</p></div>" : "") +
          (a.reponse ? '<div class="av-reponse"><strong>Votre réponse</strong><p>' + nl(a.reponse) + "</p></div>" : "") +
          (a.statut === "conteste" ? '<p class="badge badge-cours">Contesté · examen en cours (sous 72 h)</p>' : "") +
          (a.statut === "retire" ? '<p class="badge badge-ok">Retiré après examen</p>' : "") +
          '<div class="av-actions">' + (a.reponse ? "" : '<button type="button" class="pilule" data-rep>Répondre</button>') + (a.statut === "actif" ? '<button type="button" class="pilule" data-cont>Contester cet avis</button>' : "") + "</div>";
        var rep = el.querySelector("[data-rep]"), cont = el.querySelector("[data-cont]");
        if (rep) rep.addEventListener("click", function () { formulaire(el, "Votre réponse publique (visible sous l'avis)", "repondre_avis", { p_avis: a.id }, "p_reponse", "Publier la réponse"); });
        if (cont) cont.addEventListener("click", function () { formulaire(el, "Pourquoi cet avis est-il injuste ?", "contester_avis", { p_avis: a.id }, "p_motif", "Envoyer la contestation"); });
        $("recus").appendChild(el);
      });
      // Écrits
      var ec = m.ecrits || [];
      $("ecrits").innerHTML = ec.length ? ec.map(function (a) {
        return '<article class="av-item"><strong>' + esc(a.titre) + '</strong> <span class="gris">· ' + d(a.date) + '</span><p class="av-etoiles">' + etoiles(a.note) + "</p><p>" + nl(a.commentaire) + "</p>" + (a.publie ? "" : '<p class="badge badge-cours">Publié dès que l\'autre personne aura écrit son avis (ou au bout de 14 jours)</p>') + "</article>";
      }).join("") : '<p class="vide">Vous n\'avez pas encore écrit d\'avis.</p>';
    });
  }

  function formulaire(el, label, fn, args, cle, bouton) {
    if (el.querySelector(".form-mini")) return;
    var f = document.createElement("form"); f.className = "form-mini";
    f.innerHTML = '<label class="champ">' + esc(label) + '<textarea rows="3" maxlength="800" required></textarea></label><p class="message"></p><div class="actions"><span></span><button class="btn" type="submit">' + esc(bouton) + "</button></div>";
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var b = f.querySelector("button"); b.disabled = true;
      args[cle] = f.querySelector("textarea").value.trim();
      client.rpc(fn, args).then(function (r) { if (r.error) throw r.error; charger(); })
        .catch(function (err) { var m = f.querySelector(".message"); m.className = "message erreur"; m.textContent = (err && err.message) || "Erreur"; b.disabled = false; });
    });
    el.appendChild(f); f.querySelector("textarea").focus();
  }

  A.exiger("avis.html").then(charger).then(function () { $("chargement").hidden = true; $("contenu").hidden = false; })
    .catch(function (e) { console.error(e); $("chargement").textContent = "Impossible de charger vos avis. Rechargez la page."; });
})();

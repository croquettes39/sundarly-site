// Sundarly — espace hôte
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  function $(id) { return document.getElementById(id); }
  function msg(form, type, t) { var m = form.querySelector(".message"); m.className = "message " + type; m.textContent = t; }
  var SESSION = null, PROFIL = null;

  $("btn-deconnexion").addEventListener("click", function () {
    (client ? client.auth.signOut() : Promise.resolve()).then(function () { location.replace("/"); });
  });

  if (!client) { $("chargement").textContent = "Le site n'est pas encore relié à la base de données."; return; }

  A.exiger("espace-hote.html")
    .then(function (s) { SESSION = s; return A.profil(s); })
    .then(function (p) { PROFIL = p; afficherProfil(); afficherVerif(); return chargerAnnonces(); })
    .then(function () { $("chargement").hidden = true; $("contenu").hidden = false; })
    .catch(function (e) {
      console.error(e);
      $("chargement").textContent = "Impossible de charger votre espace. Rechargez la page ; si le problème continue, écrivez à info@sundarly.com.";
    });

  // ---------- Profil ----------
  function afficherProfil() {
    $("prenom").textContent = PROFIL.prenom;
    var f = $("f-profil");
    ["prenom", "nom", "telephone", "pays", "date_naissance"].forEach(function (n) { f.elements[n].value = PROFIL[n] || ""; });
    f.elements.email.value = SESSION.user.email;
  }
  $("f-profil").addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    var maj = {
      prenom: f.elements.prenom.value.trim(), nom: f.elements.nom.value.trim(),
      telephone: f.elements.telephone.value.trim(), pays: f.elements.pays.value.trim() || null,
      date_naissance: f.elements.date_naissance.value || null
    };
    client.from("profils").update(maj).eq("id", SESSION.user.id).select().single().then(function (r) {
      if (r.error) throw r.error;
      PROFIL = r.data; $("prenom").textContent = PROFIL.prenom;
      msg(f, "ok", "Informations enregistrées.");
    }).catch(function (err) {
      console.error(err);
      msg(f, "erreur", /date/.test(err.message || "") ? "Vous devez avoir 18 ans ou plus." : "L'enregistrement n'a pas fonctionné. Réessayez.");
    });
  });

  // ---------- Vérification d'identité ----------
  var TEXTES = {
    non_verifie: ["À faire", "Pour publier vos annonces, nous devons vérifier votre identité. Cela prend 2 minutes : une pièce d'identité et un selfie.", "badge-attente"],
    en_cours: ["En cours", "Merci ! Vos documents sont en cours de vérification par notre équipe (en général sous 48 h).", "badge-cours"],
    verifie: ["Vérifiée", "Votre identité est vérifiée. Vos annonces peuvent être mises en ligne après validation.", "badge-ok"],
    refuse: ["À refaire", "Vos documents n'ont pas pu être validés (photo floue, pièce expirée…). Merci de les envoyer à nouveau.", "badge-refus"]
  };
  function afficherVerif() {
    var t = TEXTES[PROFIL.statut_verification] || TEXTES.non_verifie;
    $("verif-badge").textContent = t[0]; $("verif-badge").className = "badge " + t[2];
    $("verif-texte").textContent = t[1];
    $("f-identite").hidden = !(PROFIL.statut_verification === "non_verifie" || PROFIL.statut_verification === "refuse");
  }
  var fId = $("f-identite");
  fId.elements.type_piece.addEventListener("change", function () {
    $("zone-verso").hidden = this.value === "passeport";
  });
  fId.querySelectorAll("input[type=file]").forEach(function (inp) {
    inp.addEventListener("change", function () {
      var em = inp.parentElement.querySelector("[data-nom]");
      em.textContent = inp.files[0] ? "✓ " + inp.files[0].name : "";
      inp.parentElement.classList.toggle("rempli", !!inp.files[0]);
    });
  });
  fId.addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    var type = f.elements.type_piece.value;
    var aEnvoyer = [["recto", f.elements.recto.files[0]], ["selfie", f.elements.selfie.files[0]]];
    if (type !== "passeport") aEnvoyer.splice(1, 0, ["verso", f.elements.verso.files[0]]);
    if (!type) { msg(f, "erreur", "Choisissez le type de pièce."); return; }
    var manque = aEnvoyer.filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; });
    if (manque.length) { msg(f, "erreur", "Il manque : " + manque.join(", ") + "."); return; }
    if (aEnvoyer.some(function (x) { return x[1].size > 10 * 1024 * 1024; })) { msg(f, "erreur", "Chaque fichier doit faire moins de 10 Mo."); return; }
    var b = f.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Envoi…";
    var horodatage = Date.now();
    aEnvoyer.reduce(function (p, x) {
      return p.then(function () {
        var ext = (x[1].name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        return client.storage.from("pieces-identite")
          .upload(SESSION.user.id + "/" + horodatage + "-" + x[0] + "." + ext, x[1], { contentType: x[1].type, upsert: false })
          .then(function (r) { if (r.error) throw r.error; });
      });
    }, Promise.resolve())
      .then(function () {
        return client.from("profils").update({ type_piece: type, statut_verification: "en_cours", piece_envoyee_le: new Date().toISOString() })
          .eq("id", SESSION.user.id).select().single();
      })
      .then(function (r) { if (r.error) throw r.error; PROFIL = r.data; afficherVerif(); })
      .catch(function (err) {
        console.error(err);
        msg(f, "erreur", "L'envoi n'a pas abouti. Vérifiez votre connexion et réessayez.");
        b.disabled = false; b.textContent = "Envoyer pour vérification";
      });
  });

  // ---------- Annonces ----------
  var STATUTS = {
    en_attente: ["En cours de vérification", "badge-cours"], validee: ["Validée", "badge-ok"],
    en_ligne: ["En ligne", "badge-ok"], refusee: ["Refusée", "badge-refus"], archivee: ["Archivée", "badge-attente"]
  };
  var SYM = { EUR: "€", MAD: "DH", CHF: "CHF" };
  function chargerAnnonces() {
    return client.from("annonces")
      .select("id,titre,ville,pays,statut,prix_nuit,devise,photos,created_at")
      .eq("hote_id", SESSION.user.id).order("created_at", { ascending: false })
      .then(function (r) {
        if (r.error) throw r.error;
        var z = $("annonces"); z.innerHTML = "";
        $("aucune").hidden = r.data.length > 0;
        r.data.forEach(function (a) {
          var st = STATUTS[a.statut] || [a.statut, "badge-attente"];
          var el = document.createElement("a"); el.className = "annonce-ligne"; el.href = "annonce.html?id=" + encodeURIComponent(a.id);
          var img = document.createElement("div"); img.className = "annonce-photo";
          if (a.photos && a.photos[0]) { var i = document.createElement("img"); i.src = a.photos[0]; i.alt = ""; i.loading = "lazy"; img.appendChild(i); }
          var txt = document.createElement("div"); txt.className = "annonce-texte";
          var h = document.createElement("strong"); h.textContent = a.titre;
          var p = document.createElement("span"); p.className = "gris";
          p.textContent = a.ville + ", " + a.pays + " · " + Number(a.prix_nuit).toLocaleString("fr-FR") + " " + (SYM[a.devise] || a.devise) + " / nuit";
          txt.appendChild(h); txt.appendChild(p);
          var badge = document.createElement("span"); badge.className = "badge " + st[1]; badge.textContent = st[0];
          var mod = document.createElement("span"); mod.className = "lien-modifier"; mod.textContent = "Modifier";
          el.appendChild(img); el.appendChild(txt); el.appendChild(badge); el.appendChild(mod);
          z.appendChild(el);
        });
      });
  }
})();

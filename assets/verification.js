// Sundarly — vérification d'identité obligatoire (hôtes ET voyageurs)
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  function $(id) { return document.getElementById(id); }
  function msg(form, type, t) { var m = form.querySelector(".message"); m.className = "message " + type; m.textContent = t; }
  var params = new URLSearchParams(location.search);
  var retour = params.get("retour") || "espace-hote.html";
  if (!/^[a-z0-9-]+\.html(\?id=[0-9a-f-]{36})?(#[a-z0-9-]*)?$/i.test(retour)) retour = "espace-hote.html";
  var SESSION = null, PROFIL = null;

  if (!client) { $("chargement").textContent = "Le site n'est pas encore relié à la base de données."; return; }

  A.exiger("verification.html?retour=" + encodeURIComponent(retour))
    .then(function (s) { SESSION = s; return A.profil(s); })
    .then(function (p) { PROFIL = p; afficher(); $("chargement").hidden = true; $("contenu").hidden = false; })
    .catch(function (e) {
      console.error(e);
      $("chargement").textContent = "Impossible de charger la page. Rechargez ; si le problème continue, écrivez à info@sundarly.com.";
    });

  var TEXTES = {
    non_verifie: ["Obligatoire", "Sans identité vérifiée, vous ne pouvez ni réserver un logement ni publier une annonce. Cela prend 2 minutes : une pièce d'identité et un selfie.", "badge-refus"],
    en_cours: ["En cours", "Merci ! Vos documents sont en cours de vérification par notre équipe (en général sous 48 h). Vous recevrez une confirmation dès qu'elle sera validée.", "badge-cours"],
    verifie: ["Vérifiée", "Votre identité est vérifiée. Vous pouvez profiter pleinement de Sundarly.", "badge-ok"],
    refuse: ["À refaire", "Vos documents n'ont pas pu être validés (photo floue, pièce expirée…). Merci de les envoyer à nouveau : c'est obligatoire pour utiliser Sundarly.", "badge-refus"]
  };
  function afficher() {
    var st = PROFIL.statut_verification, t = TEXTES[st] || TEXTES.non_verifie;
    var aFaire = st === "non_verifie" || st === "refuse";
    $("verif-badge").textContent = t[0]; $("verif-badge").className = "badge " + t[2];
    $("verif-texte").textContent = t[1];
    $("f-identite").hidden = !aFaire;
    $("pourquoi").hidden = !aFaire;
    $("suite").hidden = aFaire;
    $("lien-suite").href = retour;
    $("lien-suite").textContent = /logement/.test(retour) ? "Retour au logement" : /publier/.test(retour) ? "Continuer mon annonce" : "Aller à mon espace";
    document.querySelector(".carte-verif").classList.toggle("ok", !aFaire);
  }

  var fId = $("f-identite");
  fId.elements.type_piece.addEventListener("change", function () { $("zone-verso").hidden = this.value === "passeport"; });
  fId.querySelectorAll("input[type=file]").forEach(function (inp) {
    inp.addEventListener("change", function () {
      inp.parentElement.querySelector("[data-nom]").textContent = inp.files[0] ? "✓ " + inp.files[0].name : "";
      inp.parentElement.classList.toggle("rempli", !!inp.files[0]);
    });
  });
  fId.addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    var type = f.elements.type_piece.value;
    if (!type) { msg(f, "erreur", "Choisissez le type de pièce."); return; }
    var numero = (f.elements.numero_piece.value || "").trim().toUpperCase();
    if (numero.length < 4) { msg(f, "erreur", "Indiquez le numéro de votre pièce d'identité."); return; }
    var aEnvoyer = [["recto", f.elements.recto.files[0]], ["selfie", f.elements.selfie.files[0]]];
    if (type !== "passeport") aEnvoyer.splice(1, 0, ["verso", f.elements.verso.files[0]]);
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
        return client.from("profils").update({ type_piece: type, numero_piece: numero, statut_verification: "en_cours", piece_envoyee_le: new Date().toISOString() })
          .eq("id", SESSION.user.id).select().single();
      })
      .then(function (r) { if (r.error) throw r.error; PROFIL = r.data; afficher(); window.scrollTo(0, 0); })
      .catch(function (err) {
        console.error(err);
        msg(f, "erreur", "L'envoi n'a pas abouti. Vérifiez votre connexion et réessayez.");
        b.disabled = false; b.textContent = "Envoyer pour vérification";
      });
  });
})();

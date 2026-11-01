// Sundarly — page Connexion / Inscription
(function () {
  "use strict";
  var A = window.SundarlyAuth, client = A.client;
  var params = new URLSearchParams(location.search);
  var retour = params.get("retour") || "espace-hote.html";
  if (!/^[a-z0-9-]+\.html(\?id=[0-9a-f-]{36})?(#[a-z0-9-]*)?$/i.test(retour)) retour = "espace-hote.html"; // pas de redirection vers un autre site

  var forms = { connexion: $("f-connexion"), inscription: $("f-inscription"), oubli: $("f-oubli"), nouveau: $("f-nouveau") };
  function $(id) { return document.getElementById(id); }
  function montrer(nom) {
    Object.keys(forms).forEach(function (k) { forms[k].hidden = k !== nom; });
    document.querySelectorAll("[data-onglet]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.getAttribute("data-onglet") === nom));
    });
    document.querySelector(".onglets").hidden = nom === "oubli" || nom === "nouveau";
  }
  function msg(form, type, texte) { var m = form.querySelector(".message"); m.className = "message " + type; m.textContent = texte; }
  function v(form, n) { return String(form.elements[n].value || "").trim(); }
  function occupe(form, oui, texte) {
    var b = form.querySelector("button[type=submit]");
    if (!b.dataset.t) b.dataset.t = b.textContent;
    b.disabled = oui; b.textContent = oui ? texte : b.dataset.t;
  }
  function traduire(e) {
    var m = (e && e.message || "").toLowerCase();
    if (m.indexOf("invalid login") >= 0) return "E-mail ou mot de passe incorrect.";
    if (m.indexOf("email not confirmed") >= 0) return "Votre e-mail n'est pas encore confirmé : cliquez sur le lien reçu par e-mail (pensez aux spams).";
    if (m.indexOf("already registered") >= 0 || m.indexOf("already been registered") >= 0) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
    if (m.indexOf("rate limit") >= 0) return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
    if (m.indexOf("password") >= 0) return "Mot de passe trop faible : 8 caractères minimum.";
    return "Une erreur est survenue. Vérifiez votre connexion et réessayez.";
  }

  document.querySelectorAll("[data-onglet]").forEach(function (b) {
    b.addEventListener("click", function () { montrer(b.getAttribute("data-onglet")); });
  });
  $("lien-oubli").addEventListener("click", function () {
    forms.oubli.elements.email.value = forms.connexion.elements.email.value; montrer("oubli");
  });
  document.querySelector("[data-retour-connexion]").addEventListener("click", function () { montrer("connexion"); });
  if (params.get("mode") === "inscription" || /publier/.test(retour)) montrer("inscription");

  if (!client) {
    Object.keys(forms).forEach(function (k) { msg(forms[k], "erreur", "Le site n'est pas encore relié à la base de données."); });
    return;
  }

  // Déjà connecté ? On continue directement
  A.session().then(function (s) { if (s && !location.hash.match(/type=recovery/)) location.replace(retour); });
  client.auth.onAuthStateChange(function (evt) { if (evt === "PASSWORD_RECOVERY") montrer("nouveau"); });

  forms.connexion.addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    occupe(f, true, "Connexion…");
    client.auth.signInWithPassword({ email: v(f, "email").toLowerCase(), password: f.elements.mdp.value })
      .then(function (r) { if (r.error) throw r.error; location.replace(retour); })
      .catch(function (err) { msg(f, "erreur", traduire(err)); occupe(f, false); });
  });

  forms.inscription.addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    occupe(f, true, "Création du compte…");
    var base = location.origin + location.pathname.replace(/[^/]*$/, "");
    client.auth.signUp({
      email: v(f, "email").toLowerCase(),
      password: f.elements.mdp.value,
      options: {
        emailRedirectTo: base + retour,
        data: { prenom: v(f, "prenom"), nom: v(f, "nom"), telephone: v(f, "telephone"), pays: v(f, "pays") }
      }
    }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data && r.data.session) { location.replace(retour); return; }
      f.reset();
      msg(f, "ok", "Compte créé ! Nous vous avons envoyé un e-mail : cliquez sur le lien qu'il contient pour activer votre compte (pensez à regarder dans les spams).");
      occupe(f, false);
    }).catch(function (err) { msg(f, "erreur", traduire(err)); occupe(f, false); });
  });

  forms.oubli.addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    occupe(f, true, "Envoi…");
    var base = location.origin + location.pathname;
    client.auth.resetPasswordForEmail(v(f, "email").toLowerCase(), { redirectTo: base })
      .then(function (r) {
        if (r.error) throw r.error;
        msg(f, "ok", "Si un compte existe avec cet e-mail, vous allez recevoir un lien pour choisir un nouveau mot de passe.");
        occupe(f, false);
      })
      .catch(function (err) { msg(f, "erreur", traduire(err)); occupe(f, false); });
  });

  forms.nouveau.addEventListener("submit", function (e) {
    e.preventDefault(); var f = this;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    occupe(f, true, "Enregistrement…");
    client.auth.updateUser({ password: f.elements.mdp.value })
      .then(function (r) { if (r.error) throw r.error; msg(f, "ok", "Mot de passe modifié. Redirection…"); setTimeout(function () { location.replace("espace-hote.html"); }, 1200); })
      .catch(function (err) { msg(f, "erreur", traduire(err)); occupe(f, false); });
  });
})();

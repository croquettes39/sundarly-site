// Sundarly — formulaires du site de lancement
(function () {
  "use strict";

  // Année dans le pied de page
  document.querySelectorAll("[data-annee]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // Compte à rebours jusqu'à l'ouverture
  document.querySelectorAll("[data-rebours]").forEach(function (bloc) {
    var cible = new Date(bloc.getAttribute("data-rebours")).getTime();
    var deux = function (n) { return (n < 10 ? "0" : "") + n; };
    function tic() {
      var reste = Math.max(0, cible - Date.now());
      if (reste === 0) {
        bloc.querySelector(".rebours-titre").innerHTML = "<strong>Les réservations sont ouvertes !</strong>";
        bloc.querySelector(".rebours-cases").hidden = true;
        return;
      }
      var s = Math.floor(reste / 1000);
      bloc.querySelector("[data-j]").textContent = Math.floor(s / 86400);
      bloc.querySelector("[data-h]").textContent = deux(Math.floor(s % 86400 / 3600));
      bloc.querySelector("[data-m]").textContent = deux(Math.floor(s % 3600 / 60));
      bloc.querySelector("[data-s]").textContent = deux(s % 60);
      setTimeout(tic, 1000);
    }
    tic();
  });

  var formulaires = document.querySelectorAll("form[data-formulaire]");
  if (!formulaires.length) return;

  var cfg = window.SUNDARLY_CONFIG || {};
  var client = null;
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
  }

  function valeur(form, nom) {
    var champ = form.elements[nom];
    if (!champ) return null;
    var v = (champ.value || "").trim();
    return v === "" ? null : v;
  }

  // Ce que chaque formulaire envoie, et dans quelle table
  var definitions = {
    liste_attente: {
      table: "liste_attente",
      donnees: function (f) {
        return {
          email: (valeur(f, "email") || "").toLowerCase(),
          destination: valeur(f, "destination")
        };
      },
      succes: "Merci ! Vous serez parmi les premiers prévenus du lancement de Sundarly.",
      doublon: "Vous êtes déjà sur la liste d'attente. À très bientôt !"
    },
    hotes: {
      table: "hotes",
      donnees: function (f) {
        var nb = parseInt(valeur(f, "nb_logements") || "1", 10);
        return {
          nom: valeur(f, "nom"),
          email: (valeur(f, "email") || "").toLowerCase(),
          telephone: valeur(f, "telephone"),
          pays: valeur(f, "pays"),
          ville: valeur(f, "ville"),
          type_logement: valeur(f, "type_logement"),
          nb_logements: isNaN(nb) ? 1 : nb,
          lien_annonce: valeur(f, "lien_annonce"),
          message: valeur(f, "message"),
          consentement: !!(f.elements.consentement && f.elements.consentement.checked)
        };
      },
      succes: "Merci ! Votre inscription est bien reçue. Notre équipe vous recontacte très vite pour préparer votre annonce.",
      doublon: "Nous avons déjà une inscription avec cet e-mail. Notre équipe vous recontacte très vite."
    }
  };

  formulaires.forEach(function (form) {
    var def = definitions[form.getAttribute("data-formulaire")];
    if (!def) return;
    var zone = form.querySelector(".message") || form.parentElement.querySelector(".message");
    var bouton = form.querySelector("button[type=submit]");
    var texteBouton = bouton ? bouton.textContent : "";

    function afficher(type, texte) {
      if (!zone) return;
      zone.className = "message " + type;
      zone.textContent = texte;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Champ piège anti-robots : rempli = robot, on fait semblant que tout va bien
      if (form.elements.site_web && form.elements.site_web.value) {
        afficher("ok", def.succes);
        form.reset();
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!client) {
        afficher("erreur", "Le formulaire n'est pas encore relié à la base de données (voir assets/config.js).");
        return;
      }

      if (bouton) { bouton.disabled = true; bouton.textContent = "Envoi…"; }
      try {
        var res = await client.from(def.table).insert(def.donnees(form));
        if (res.error) {
          if (res.error.code === "23505") {
            afficher("ok", def.doublon);
            form.reset();
          } else {
            throw res.error;
          }
        } else {
          afficher("ok", def.succes);
          form.reset();
        }
      } catch (err) {
        console.error(err);
        afficher("erreur", "Oups, l'envoi n'a pas fonctionné. Vérifiez votre connexion et réessayez dans un instant.");
      } finally {
        if (bouton) { bouton.disabled = false; bouton.textContent = texteBouton; }
      }
    });
  });
})();

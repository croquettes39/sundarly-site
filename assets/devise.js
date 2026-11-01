// Sundarly — devise d'affichage selon le pays du visiteur
// Euro par défaut ; dirham au Maroc ; franc suisse en Suisse.
// Le visiteur peut changer de devise avec le sélecteur en haut de page.
(function () {
  "use strict";

  var TAUX = { EUR: 1, MAD: 10.9, CHF: 0.94 }; // pour 1 €, taux indicatifs
  var CLE = "sundarly-devise";

  function devineDevise() {
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    var langues = (navigator.languages || [navigator.language || ""]).join(",");
    if (tz === "Africa/Casablanca" || tz === "Africa/El_Aaiun" || /-MA\b/i.test(langues)) return "MAD";
    if (tz === "Europe/Zurich" || /-CH\b/i.test(langues)) return "CHF";
    return "EUR";
  }

  function lireChoix() {
    try { var v = localStorage.getItem(CLE); if (TAUX[v]) return v; } catch (e) {}
    return null;
  }
  function ecrireChoix(v) { try { localStorage.setItem(CLE, v); } catch (e) {} }

  function formater(montant, devise, dec) {
    var n = montant.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (devise === "EUR") return n + " €";
    if (devise === "MAD") return n + " DH";
    return "CHF " + n;
  }

  // Convertit un montant exprimé en dirhams (MAD) vers la devise choisie
  function depuisMad(mad, devise) { return mad / TAUX.MAD * TAUX[devise]; }

  function appliquer(devise) {
    document.querySelectorAll("[data-mad]").forEach(function (el) {
      var mad = parseFloat(el.getAttribute("data-mad"));
      var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
      el.textContent = formater(depuisMad(mad, devise), devise, dec);
    });
    document.querySelectorAll("[data-note-conversion]").forEach(function (el) {
      el.hidden = devise === "MAD";
    });
    document.querySelectorAll("select[data-choix-devise]").forEach(function (s) { s.value = devise; });
    document.documentElement.setAttribute("data-devise", devise);
    document.dispatchEvent(new CustomEvent("sundarly:devise", { detail: devise }));
  }

  var devise = lireChoix() || devineDevise();
  window.SUNDARLY_DEVISE = function () { return devise; };

  document.querySelectorAll("select[data-choix-devise]").forEach(function (s) {
    s.addEventListener("change", function () {
      devise = s.value; ecrireChoix(devise); appliquer(devise);
    });
  });
  appliquer(devise);
})();

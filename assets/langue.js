// Sundarly — langue du site selon le pays du visiteur
// 1) choix fait par le visiteur (sélecteur en haut de page), sinon 2) pays d'où il se connecte, sinon 3) langue du navigateur.
// Les pages sont écrites en français ; ce script les traduit à l'affichage avec assets/langues/<langue>.json.
(function () {
  "use strict";
  var VERSION = "20261116a";
  var LANGUES = { fr: "Français", en: "English", es: "Español", pt: "Português", de: "Deutsch", it: "Italiano", nl: "Nederlands" };
  // code pays : [nom affiché, langues (la première est celle du pays), devise, groupe]
  var PAYS = {
    FR: ["France", ["fr"], "EUR", 0], BE: ["Belgique / België", ["fr", "nl"], "EUR", 0], CH: ["Suisse / Schweiz / Svizzera", ["de", "fr", "it"], "CHF", 0],
    LU: ["Luxembourg", ["fr", "de"], "EUR", 0], ES: ["España", ["es"], "EUR", 0], PT: ["Portugal", ["pt"], "EUR", 0], IT: ["Italia", ["it"], "EUR", 0],
    DE: ["Deutschland", ["de"], "EUR", 0], AT: ["Österreich", ["de"], "EUR", 0], NL: ["Nederland", ["nl"], "EUR", 0], GB: ["United Kingdom", ["en"], "EUR", 0],
    IE: ["Ireland", ["en"], "EUR", 0], GR: ["Greece", ["en"], "EUR", 0], HR: ["Croatia", ["en"], "EUR", 0], MC: ["Monaco", ["fr"], "EUR", 0],
    LI: ["Liechtenstein", ["de"], "CHF", 0], AD: ["Andorra", ["es", "fr"], "EUR", 0], SM: ["San Marino", ["it"], "EUR", 0],
    MA: ["Maroc", ["fr"], "MAD", 1], TN: ["Tunisie", ["fr"], "EUR", 1], DZ: ["Algérie", ["fr"], "EUR", 1],
    US: ["United States", ["en"], "USD", 2], CA: ["Canada", ["en", "fr"], "CAD", 2], MX: ["México", ["es"], "MXN", 2],
    AR: ["Argentina", ["es"], "USD", 3], BS: ["Bahamas", ["en"], "USD", 3], BB: ["Barbados", ["en"], "USD", 3], BZ: ["Belize", ["en"], "USD", 3],
    BO: ["Bolivia", ["es"], "USD", 3], BR: ["Brasil", ["pt"], "BRL", 3], CL: ["Chile", ["es"], "USD", 3], CO: ["Colombia", ["es"], "USD", 3],
    CR: ["Costa Rica", ["es"], "USD", 3], CU: ["Cuba", ["es"], "USD", 3], DO: ["República Dominicana", ["es"], "USD", 3], EC: ["Ecuador", ["es"], "USD", 3],
    SV: ["El Salvador", ["es"], "USD", 3], GP: ["Guadeloupe", ["fr"], "EUR", 3], GT: ["Guatemala", ["es"], "USD", 3], GF: ["Guyane", ["fr"], "EUR", 3],
    GY: ["Guyana", ["en"], "USD", 3], HT: ["Haïti", ["fr"], "USD", 3], HN: ["Honduras", ["es"], "USD", 3], JM: ["Jamaica", ["en"], "USD", 3],
    MQ: ["Martinique", ["fr"], "EUR", 3], NI: ["Nicaragua", ["es"], "USD", 3], PA: ["Panamá", ["es"], "USD", 3], PY: ["Paraguay", ["es"], "USD", 3],
    PE: ["Perú", ["es"], "USD", 3], PR: ["Puerto Rico", ["es"], "USD", 3], SR: ["Suriname", ["nl"], "USD", 3], TT: ["Trinidad and Tobago", ["en"], "USD", 3],
    UY: ["Uruguay", ["es"], "USD", 3], VE: ["Venezuela", ["es"], "USD", 3]
  };
  var GROUPES = ["Europe", "Afrique du Nord · North Africa", "North America · Amérique du Nord", "Latinoamérica · Caribbean"];
  var REGIONS = { en: { US: "en-US", CA: "en-CA", "": "en-GB" }, pt: { BR: "pt-BR", "": "pt-PT" }, es: { MX: "es-MX", "": "es-ES" }, de: { "": "de-DE" }, it: { "": "it-IT" }, nl: { "": "nl-NL" }, fr: { "": "fr-FR" } };

  function lire(c) { try { return localStorage.getItem(c); } catch (e) { return null; } }
  function ecrire(c, v) { try { localStorage.setItem(c, v); } catch (e) {} }
  function langueNavigateur(parmi) {
    var l = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < l.length; i++) {
      var c = String(l[i]).slice(0, 2).toLowerCase();
      if (LANGUES[c] && (!parmi || parmi.indexOf(c) >= 0)) return c;
    }
    return null;
  }
  // Langue d'un pays : celle du pays ; s'il en a plusieurs (Suisse, Belgique, Canada…), celle du navigateur parmi elles
  function langueDuPays(cc) {
    var p = PAYS[cc];
    if (!p) return cc ? (langueNavigateur() || "en") : (langueNavigateur() || "fr");
    return p[1].length > 1 ? (langueNavigateur(p[1]) || p[1][0]) : p[1][0];
  }
  function deviseDuPays(cc) { return PAYS[cc] ? PAYS[cc][2] : "EUR"; }

  var html = document.documentElement;
  var choixLangue = lire("sundarly-langue"); if (!LANGUES[choixLangue]) choixLangue = null;
  var choixPays = lire("sundarly-pays-choisi"); if (!PAYS[choixPays]) choixPays = null;
  var memoire = (lire("sundarly-pays") || "").split("|"), paysVu = /^[A-Z]{2}$/.test(memoire[0]) ? memoire[0] : (memoire.length > 1 ? "" : null);
  var ageMemoire = Date.now() - (parseInt(memoire[1], 10) || 0);
  var pays = choixPays || paysVu || "", langue = "fr", dico = null, fragments = null, demarre = false;

  window.SUNDARLY_PAYS = function () { return pays; };
  window.SUNDARLY_DEVISE_DU_PAYS = function (cc) { return deviseDuPays(cc || pays); };
  window.SUNDARLY_LANGUE = function () { return langue; };
  window.SUNDARLY_LANGUE_DU_PAYS = langueDuPays;

  // ---------- Attente : on masque la page le temps de savoir en quelle langue l'afficher ----------
  var st = document.createElement("style");
  st.textContent = "html.langue-attente body{visibility:hidden}" +
    ".choix-langue{position:relative;display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:14px;cursor:pointer;padding:6px 8px;border:1px solid #E8DDE2;border-radius:999px;background:#fff;color:inherit;white-space:nowrap;line-height:1}" +
    ".choix-langue svg{flex:none}.choix-langue select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:16px}" +
    ".choix-langue:focus-within{outline:2px solid #D81B60;outline-offset:2px}" +
    ".choix-langue.flottant{position:fixed;right:12px;bottom:12px;z-index:60;box-shadow:0 2px 10px rgba(0,0,0,.15)}";
  (document.head || html).appendChild(st);
  var attente = false;
  function masquer() { attente = true; html.classList.add("langue-attente"); setTimeout(montrer, 2500); }
  function montrer() { if (attente) { attente = false; html.classList.remove("langue-attente"); } }

  // ---------- Traduction ----------
  var ATTRIBUTS = ["placeholder", "aria-label", "title", "alt", "label"];
  var LETTRES = /[A-Za-zÀ-ÿ]{2}/, NOMBRE = /\d+(?:[.,]\d+)?/g;
  var LIBRE = /(^| )(fi-titre|cl-titre|ap-titre|extrait|logo)( |$)/;
  var memo = {}, faits = typeof WeakMap === "function" ? new WeakMap() : null;
  function traduire(brut) {
    if (!dico || !brut) return null;
    var c = brut.replace(/ | /g, " ").replace(/\s+/g, " ").trim();
    if (c.length < 2 || c.length > 1500 || !LETTRES.test(c)) return null;
    var t = memo[c];
    if (t === undefined) {
      var nombres = [], k = c.replace(NOMBRE, function (m) { nombres.push(m); return "#"; });
      t = dico[k];
      if (t == null && fragments && c.length <= 400) {
        // texte composé par le site (« 3 nuits · 2 voyageurs ») : on traduit les morceaux connus.
        // Un long texte écrit par un hôte ou un voyageur n'est pas touché (trop peu de morceaux connus).
        var couvert = 0;
        t = k.replace(fragments, function (m, avant, f) { couvert += f.length; return avant + dico[f]; });
        if (!couvert || (k.length > 60 && couvert < k.length * 0.4)) t = null;
      }
      if (t != null) { var i = 0; t = t.replace(/#/g, function () { return i < nombres.length ? nombres[i++] : "#"; }); }
      else t = null;
      memo[c] = t;
    }
    if (t == null) return null;
    return brut.match(/^\s*/)[0] + t + brut.match(/\s*$/)[0];
  }
  window.SUNDARLY_TRADUIRE = function (s) { return traduire(String(s)) || s; };
  function exclu(el) {
    for (; el && el.nodeType === 1; el = el.parentNode) {
      var n = el.nodeName;
      if (n === "SCRIPT" || n === "STYLE" || n === "TEXTAREA" || n === "CODE" || el.getAttribute("translate") === "no") return true;
      if (el.className && typeof el.className === "string" && LIBRE.test(el.className)) return true; // titres et textes écrits par les hôtes
    }
    return false;
  }
  function texte(n) {
    if (faits && faits.get(n) === n.nodeValue) return;
    var t = traduire(n.nodeValue);
    if (t != null && t !== n.nodeValue) {
      // une liste déroulante sans attribut value envoie son texte : on garde la valeur française d'origine
      var p = n.parentNode;
      if (p && p.nodeName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", n.nodeValue.replace(/\s+/g, " ").trim());
      n.nodeValue = t; if (faits) faits.set(n, t);
    }
  }
  function attributs(el) {
    for (var i = 0; i < ATTRIBUTS.length; i++) {
      var v = el.getAttribute(ATTRIBUTS[i]);
      if (v) { var t = traduire(v); if (t != null && t !== v) el.setAttribute(ATTRIBUTS[i], t); }
    }
    if (el.nodeName === "INPUT" && /^(submit|button)$/i.test(el.type) && el.value) { var w = traduire(el.value); if (w != null) el.value = w; }
  }
  function parcourir(racine) {
    if (!racine) return;
    if (racine.nodeType === 3) { if (!exclu(racine.parentNode)) texte(racine); return; }
    if (racine.nodeType !== 1 || exclu(racine)) return;
    attributs(racine);
    var w = document.createTreeWalker(racine, 5, null, false), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (!exclu(n.parentNode)) texte(n); }
      else if (!exclu(n)) attributs(n);
    }
  }
  function observer() {
    parcourir(html);
    new MutationObserver(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        var m = liste[i];
        if (m.type === "childList") { for (var j = 0; j < m.addedNodes.length; j++) parcourir(m.addedNodes[j]); }
        else if (m.type === "characterData") { if (!exclu(m.target.parentNode)) texte(m.target); }
        else if (m.target.nodeType === 1 && !exclu(m.target)) attributs(m.target);
      }
    }).observe(html, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTS });
    ["alert", "confirm", "prompt"].forEach(function (f) {
      var o = window[f];
      window[f] = function (msg, d) { return o.call(window, msg == null ? msg : (traduire(String(msg)) || msg), d); };
    });
  }
  function dates() {
    var r = REGIONS[langue] || {}, loc = r[pays] || r[""] || langue;
    ["toLocaleDateString", "toLocaleString", "toLocaleTimeString"].forEach(function (m) {
      var o = Date.prototype[m];
      Date.prototype[m] = function (l, opt) { return o.call(this, l === "fr-FR" || l === "fr" ? loc : l, opt); };
    });
  }
  function echapper(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }
  function charger() {
    html.setAttribute("lang", langue);
    if (langue === "fr") { montrer(); return; }
    dates();
    fetch("/assets/langues/" + langue + ".json?v=" + VERSION).then(function (r) { return r.json(); }).then(function (d) {
      dico = d.t || {};
      var f = (d.f || []).filter(function (k) { return dico[k] != null; }).sort(function (a, b) { return b.length - a.length; });
      if (f.length) fragments = new RegExp("(^|[^A-Za-zÀ-ÿ])(" + f.map(echapper).join("|") + ")(?![A-Za-zÀ-ÿ])", "g");
      observer(); montrer();
    }).catch(montrer);
  }

  // ---------- Sélecteur pays / langue ----------
  function selecteur() {
    var lab = document.createElement("label");
    lab.className = "choix-langue"; lab.setAttribute("translate", "no");
    var h = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.800 0 18M12 3c-3 3.2-3 14.800 0 18"/></svg><span>' + langue.toUpperCase() + '</span><select aria-label="Country and language · Pays et langue">';
    var actuel = PAYS[pays] && PAYS[pays][1].indexOf(langue) >= 0 ? pays + "-" + langue : langue;
    for (var g = 0; g < GROUPES.length; g++) {
      h += '<optgroup label="' + GROUPES[g] + '">';
      Object.keys(PAYS).filter(function (c) { return PAYS[c][3] === g; }).sort(function (a, b) { return PAYS[a][0].localeCompare(PAYS[b][0]); }).forEach(function (c) {
        PAYS[c][1].forEach(function (l) {
          var v = c + "-" + l;
          h += '<option value="' + v + '"' + (v === actuel ? " selected" : "") + ">" + PAYS[c][0] + " — " + LANGUES[l] + " · " + PAYS[c][2] + "</option>";
        });
      });
      h += "</optgroup>";
    }
    h += '<optgroup label="Language · Langue">';
    Object.keys(LANGUES).forEach(function (l) { h += '<option value="' + l + '"' + (l === actuel ? " selected" : "") + ">" + LANGUES[l] + "</option>"; });
    lab.innerHTML = h + "</optgroup></select>";
    lab.querySelector("select").addEventListener("change", function () {
      var v = this.value.split("-");
      if (v.length === 2) {
        ecrire("sundarly-pays-choisi", v[0]); ecrire("sundarly-langue", v[1]); ecrire("sundarly-devise", deviseDuPays(v[0]));
      } else ecrire("sundarly-langue", v[0]);
      location.reload();
    });
    return lab;
  }
  function poserSelecteur() {
    if (document.querySelector(".choix-langue")) return;
    var d = document.querySelectorAll(".choix-devise");
    if (d.length) { for (var i = 0; i < d.length; i++) d[i].parentNode.insertBefore(selecteur(), d[i]); return; }
    var nav = document.querySelector("header .nav, header nav");
    if (nav) { nav.insertBefore(selecteur(), nav.firstChild); return; }
    var s = selecteur(); s.className += " flottant"; document.body.appendChild(s);
  }

  // ---------- Démarrage ----------
  function demarrer() {
    if (demarre) return; demarre = true;
    langue = choixLangue || langueDuPays(pays);
    try { document.dispatchEvent(new CustomEvent("sundarly:pays", { detail: pays })); } catch (e) {}
    charger();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poserSelecteur); else poserSelecteur();
  }
  function demanderPays(suite) {
    var fini = false, t = setTimeout(function () { if (!fini) { fini = true; suite(null); } }, 1500);
    fetch("/api/pays", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      var p = d && /^[A-Z]{2}$/.test(d.pays || "") ? d.pays : "";
      ecrire("sundarly-pays", p + "|" + Date.now());
      if (!fini) { fini = true; clearTimeout(t); suite(p); }
    }).catch(function () { if (!fini) { fini = true; clearTimeout(t); suite(null); } });
  }
  if (choixLangue || paysVu !== null) {
    // langue déjà connue : on affiche tout de suite, et on revérifie le pays de temps en temps (voyage, déménagement)
    if (langue !== (choixLangue || langueDuPays(pays))) masquer();
    demarrer();
    if (ageMemoire > 6 * 3600 * 1000) demanderPays(function () {});
  } else {
    // première visite : on demande le pays avant d'afficher
    masquer();
    demanderPays(function (p) { if (p && !choixPays) pays = p; demarrer(); });
  }
})();

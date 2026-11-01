// Sundarly — parcours « Publier mon logement »
(function () {
  "use strict";

  var cfg = window.SUNDARLY_CONFIG || {};
  var client = null;
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }

  var form = document.getElementById("form-annonce");
  var etapes = Array.prototype.slice.call(form.querySelectorAll("section.etape-form[data-etape]"));
  var btnSuivant = document.getElementById("btn-suivant");
  var btnRetour = document.getElementById("btn-retour");
  var zoneErreur = document.getElementById("erreur");
  var courante = 0;
  var photos = []; // { blob, url }
  var envoiEnCours = false;

  function $(id) { return document.getElementById(id); }
  function val(nom) { var c = form.elements[nom]; return c ? String(c.value || "").trim() : ""; }
  function coche(nom) { var c = form.elements[nom]; return !!(c && c.checked); }
  function erreur(txt) { zoneErreur.textContent = txt || ""; }

  var SYMBOLES = { EUR: "€", MAD: "DH", CHF: "CHF" };
  function devise() { var r = form.querySelector('input[name="devise"]:checked'); return r ? r.value : "EUR"; }
  function montant(n) {
    var s = (Math.round(n * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return s + " " + SYMBOLES[devise()];
  }

  // ---------- Navigation ----------
  function indexDe(nom) {
    for (var k = 0; k < etapes.length; k++) if (etapes[k].getAttribute("data-etape") === nom) return k;
    return 0;
  }
  function majSegments(i) {
    var phaseCourante = +etapes[i].getAttribute("data-phase") || 0;
    var segs = document.querySelectorAll("#segments i");
    [1, 2, 3].forEach(function (ph) {
      var dans = etapes.filter(function (s) { return +s.getAttribute("data-phase") === ph; });
      var fait = 0;
      if (ph < phaseCourante) fait = dans.length;
      else if (ph === phaseCourante) fait = dans.indexOf(etapes[i]) + 1;
      segs[ph - 1].style.width = (dans.length ? Math.round(fait / dans.length * 100) : 0) + "%";
    });
  }
  function afficher(i) {
    courante = i;
    etapes.forEach(function (s, k) { s.hidden = k !== i; });
    var nom = etapes[i].getAttribute("data-etape");
    majSegments(i);
    btnRetour.hidden = i === 0;
    btnSuivant.textContent = i === 0 ? "Commencer" : (i === etapes.length - 1 ? "Publier mon annonce" : "Suivant");
    btnSuivant.classList.toggle("btn-rose", i === 0 || i === etapes.length - 1);
    erreur("");
    if (nom === "Adresse") initCarte();
    if (nom === "Récapitulatif") construireRecap();
    sauverBrouillon();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Pas de liens, d'e-mails ni de numéros de téléphone dans l'annonce
  var MSG_LIENS = "Pour la sécurité de tous, les liens internet, adresses e-mail et numéros de téléphone ne sont pas autorisés dans l'annonce. Les échanges se font sur Sundarly.";
  function contientCoordonnees(texte) {
    var x = texte.toLowerCase();
    if (/(https?:\/\/|www\.|\bwa\.me\b|\bbit\.ly\b)/.test(x)) return true;
    if (/[a-z0-9-]+\s*(\.|\(point\)|\[point\]| point )\s*(com|net|org|fr|ma|ch|be|tn|de|es|it|pt|io|co|info|online|site|app|me)\b/.test(x)) return true;
    if (/[^\s@]+\s*(@|\(at\)|\[at\]| arobase )\s*[^\s@]+\.[a-z]{2,}/.test(x)) return true;
    var chiffres = x.replace(/[\s.\-()\/+]/g, "");
    if (/\d{8,}/.test(chiffres)) return true;
    if (/(instagram|facebook|whatsapp|telegram|snapchat|tiktok|airbnb|booking)\b/.test(x)) return true;
    // numéros écrits en toutes lettres : « zéro six six trois… »
    var mots = x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/);
    var suite = 0, chiffresLettres = { zero: 1, un: 1, deux: 1, trois: 1, quatre: 1, cinq: 1, six: 1, sept: 1, huit: 1, neuf: 1 };
    for (var k = 0; k < mots.length; k++) {
      if (chiffresLettres[mots[k]] || /^\d+$/.test(mots[k])) { suite++; if (suite >= 6) return true; } else if (mots[k]) suite = 0;
    }
    return false;
  }

  function valider(i) {
    var s = etapes[i];
    var nom = s.getAttribute("data-etape");
    if (nom === "Votre logement" && !form.querySelector('input[name="type_logement"]:checked')) return "Choisissez un type de logement.";
    if (nom === "Type d'espace" && !form.querySelector('input[name="type_espace"]:checked')) return "Indiquez ce dont les voyageurs disposeront.";
    if (nom === "Adresse") {
      if (!val("pays")) return "Choisissez le pays.";
      if (!val("ville")) return "Indiquez la ville.";
      if (val("adresse").length < 3) return "Indiquez l'adresse du logement.";
      if (!val("latitude")) return "Placez l'épingle sur la carte (bouton « Trouver l'adresse sur la carte » ou clic sur la carte).";
    }
    if (nom === "Photos" && photos.length < 5) return "Ajoutez au moins 5 photos (" + photos.length + " pour l'instant).";
    if (nom === "Titre") {
      if (val("titre").length < 10) return "Le titre doit faire au moins 10 caractères.";
      if (contientCoordonnees(val("titre"))) return MSG_LIENS;
    }
    if (nom === "Description") {
      if (val("description").length < 50) return "La description doit faire au moins 50 caractères.";
      if (contientCoordonnees(val("description"))) return MSG_LIENS;
    }
    if (nom === "Prix") {
      var p = parseFloat(val("prix_nuit"));
      if (!(p > 0 && p <= 100000)) return "Indiquez un prix par nuit valide.";
      var m = val("frais_menage");
      if (m && !(parseFloat(m) >= 0)) return "Les frais de ménage doivent être un nombre positif.";
    }
    if (nom === "Règles" && !form.querySelector('input[name="annulation"]:checked')) return "Choisissez une politique d'annulation.";
    if (nom === "Vos coordonnées") {
      if (!val("nom")) return "Indiquez votre nom.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val("email"))) return "Indiquez une adresse e-mail valide.";
    }
    if (nom === "Versements" && banqueMaintenant()) {
      if (val("titulaire").length < 2) return "Indiquez le titulaire du compte.";
      if (!val("pays_banque")) return "Choisissez le pays de la banque.";
      var e = verifierNumero();
      if (e) return e;
      var bic = val("bic").replace(/\s/g, "").toUpperCase();
      if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) return "Le BIC doit faire 8 ou 11 caractères.";
    }
    if (nom === "Récapitulatif" && !coche("consentement")) return "Cochez la case pour accepter les conditions.";
    return "";
  }

  btnSuivant.addEventListener("click", function () {
    if (envoiEnCours) return;
    var e = valider(courante);
    if (e) { erreur(e); return; }
    if (courante < etapes.length - 1) afficher(courante + 1);
    else envoyer();
  });
  btnRetour.addEventListener("click", function () { if (!envoiEnCours && courante > 0) afficher(courante - 1); });
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  // ---------- Compteurs ----------
  var compteurs = { voyageurs: [4, 1, 50], chambres: [2, 0, 50], lits: [2, 1, 100], salles_de_bain: [1, 0, 50] };
  function majCompteur(k) {
    var c = compteurs[k];
    $("o-" + k).textContent = c[0];
    form.querySelector('[data-moins="' + k + '"]').disabled = c[0] <= c[1];
    form.querySelector('[data-plus="' + k + '"]').disabled = c[0] >= c[2];
  }
  Object.keys(compteurs).forEach(function (k) {
    form.querySelector('[data-moins="' + k + '"]').addEventListener("click", function () { compteurs[k][0]--; majCompteur(k); });
    form.querySelector('[data-plus="' + k + '"]').addEventListener("click", function () { compteurs[k][0]++; majCompteur(k); });
    majCompteur(k);
  });

  // ---------- Carte ----------
  var carte = null, epingle = null;
  var CENTRES = {
    "France": [46.6, 2.4, 5], "Suisse": [46.8, 8.2, 7], "Belgique": [50.6, 4.6, 7], "Espagne": [40.2, -3.6, 5],
    "Portugal": [39.6, -8.0, 6], "Italie": [42.8, 12.5, 5], "Grèce": [38.6, 23.2, 6], "Allemagne": [51.1, 10.4, 5],
    "Autriche": [47.6, 14.1, 7], "Pays-Bas": [52.2, 5.3, 7], "Croatie": [44.6, 16.4, 6], "Maroc": [31.6, -7.0, 5],
    "Tunisie": [34.0, 9.5, 6]
  };
  function placer(lat, lng, zoom) {
    if (!carte) return;
    if (!epingle) {
      epingle = L.marker([lat, lng], { draggable: true }).addTo(carte);
      epingle.on("dragend", function () { var p = epingle.getLatLng(); enregistrerPos(p.lat, p.lng); });
    } else { epingle.setLatLng([lat, lng]); }
    carte.setView([lat, lng], zoom || Math.max(carte.getZoom(), 16));
    enregistrerPos(lat, lng);
  }
  function enregistrerPos(lat, lng) {
    $("latitude").value = lat.toFixed(6);
    $("longitude").value = lng.toFixed(6);
    $("carte-etat").textContent = "Emplacement enregistré. Vous pouvez encore déplacer l'épingle.";
    erreur("");
  }
  function initCarte() {
    if (carte || !window.L) {
      if (!window.L) $("carte-etat").textContent = "La carte n'a pas pu se charger. Vérifiez votre connexion et rechargez la page.";
      if (carte) setTimeout(function () { carte.invalidateSize(); }, 50);
      return;
    }
    var c = CENTRES[val("pays")] || [43.5, 5.0, 4];
    carte = L.map("carte", { scrollWheelZoom: false }).setView([c[0], c[1]], c[2]);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; contributeurs OpenStreetMap"
    }).addTo(carte);
    carte.on("click", function (e) { placer(e.latlng.lat, e.latlng.lng, carte.getZoom()); });
    setTimeout(function () { carte.invalidateSize(); }, 50);
  }
  $("pays").addEventListener("change", function () {
    var c = CENTRES[val("pays")];
    if (carte && c && !epingle) carte.setView([c[0], c[1]], c[2]);
  });
  function chercher(q) {
    return fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (res) { return res && res[0] ? res[0] : null; });
  }
  // Centre la carte sur la ville dès qu'elle est saisie
  form.elements.ville.addEventListener("change", function () {
    if (!val("ville") || epingle || !carte) return;
    chercher(val("ville") + ", " + val("pays")).then(function (r) {
      if (r && !epingle) carte.setView([parseFloat(r.lat), parseFloat(r.lon)], 13);
    }).catch(function () {});
  });
  $("btn-localiser").addEventListener("click", function () {
    if (!val("ville")) { erreur("Indiquez au moins la ville avant de chercher sur la carte."); return; }
    var b = this; b.disabled = true; b.textContent = "Recherche…"; erreur("");
    var complete = [val("adresse"), val("ville"), val("pays")].filter(Boolean).join(", ");
    chercher(complete)
      .then(function (r) {
        if (r) {
          placer(parseFloat(r.lat), parseFloat(r.lon), 17);
          $("carte-etat").textContent = "Adresse trouvée. Vérifiez la position et déplacez l'épingle si besoin.";
          return;
        }
        // Adresse précise inconnue de la carte : on se place sur la ville
        return chercher(val("ville") + ", " + val("pays")).then(function (v) {
          if (v) {
            carte.setView([parseFloat(v.lat), parseFloat(v.lon)], 13);
            $("carte-etat").textContent = "Nous avons centré la carte sur " + val("ville") + ". Zoomez avec + puis cliquez à l'emplacement exact de votre logement pour placer l'épingle.";
          } else {
            erreur("Adresse introuvable. Zoomez sur la carte et cliquez directement à l'emplacement du logement.");
          }
        });
      })
      .catch(function () { erreur("La recherche n'a pas fonctionné. Zoomez sur la carte et cliquez directement à l'emplacement du logement."); })
      .finally(function () { b.disabled = false; b.textContent = "Trouver l'adresse sur la carte"; });
  });

  // ---------- Photos ----------
  var inputPhotos = $("photos"), depot = $("depot");
  function compresser(fichier) {
    return new Promise(function (ok) {
      var img = new Image();
      var url = URL.createObjectURL(fichier);
      img.onload = function () {
        var max = 1920, w = img.naturalWidth, h = img.naturalHeight;
        var r = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement("canvas");
        cv.width = Math.round(w * r); cv.height = Math.round(h * r);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { ok(b || fichier); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      img.src = url;
    });
  }
  function ajouterFichiers(liste) {
    var fichiers = Array.prototype.slice.call(liste).filter(function (f) { return /^image\/(jpeg|png|webp)$/.test(f.type); });
    if (!fichiers.length) { erreur("Formats acceptés : JPG, PNG ou WebP."); return; }
    var place = 20 - photos.length;
    if (place <= 0) { erreur("20 photos maximum."); return; }
    if (fichiers.length > place) erreur("20 photos maximum : seules les " + place + " premières ont été ajoutées.");
    else erreur("");
    fichiers.slice(0, place).reduce(function (p, f) {
      return p.then(function () { return compresser(f); }).then(function (b) {
        if (b) { photos.push({ blob: b, url: URL.createObjectURL(b) }); dessinerPhotos(); }
      });
    }, Promise.resolve());
  }
  function dessinerPhotos() {
    var z = $("vignettes"); z.innerHTML = "";
    photos.forEach(function (ph, i) {
      var d = document.createElement("div"); d.className = "vignette";
      var img = document.createElement("img"); img.src = ph.url; img.alt = "Photo " + (i + 1);
      d.appendChild(img);
      if (i === 0) { var bc = document.createElement("span"); bc.className = "badge-couverture"; bc.textContent = "Couverture"; d.appendChild(bc); }
      var x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Retirer la photo " + (i + 1));
      x.addEventListener("click", function () { URL.revokeObjectURL(ph.url); photos.splice(i, 1); dessinerPhotos(); });
      d.appendChild(x);
      z.appendChild(d);
    });
    var n = photos.length;
    $("photos-compte").textContent = n + (n > 1 ? " photos" : " photo") + (n < 5 ? " sur 5 minimum" : " · parfait") + " (20 maximum)";
  }
  inputPhotos.addEventListener("change", function () { ajouterFichiers(inputPhotos.files); inputPhotos.value = ""; });
  ["dragenter", "dragover"].forEach(function (t) { depot.addEventListener(t, function (e) { e.preventDefault(); depot.classList.add("survol"); }); });
  ["dragleave", "drop"].forEach(function (t) { depot.addEventListener(t, function (e) { e.preventDefault(); depot.classList.remove("survol"); }); });
  depot.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) ajouterFichiers(e.dataTransfer.files); });

  // ---------- Compteurs de caractères ----------
  form.querySelectorAll("[data-compteur]").forEach(function (el) {
    var cible = $(el.getAttribute("data-compteur"));
    var maj = function () {
      var n = el.value.length, max = el.getAttribute("maxlength"), min = el.getAttribute("minlength");
      cible.textContent = n + " / " + max + (min && n < +min ? " · " + min + " minimum" : "");
    };
    el.addEventListener("input", maj); maj();
  });

  // ---------- Prix ----------
  function majPrix() {
    var p = parseFloat(val("prix_nuit")) || 0, m = parseFloat(val("frais_menage")) || 0;
    var com = Math.round(p * 0.10 * 100) / 100;
    form.querySelectorAll(".symbole").forEach(function (s) { s.textContent = SYMBOLES[devise()]; });
    $("s-nuit").textContent = montant(p);
    $("s-com").textContent = "− " + montant(com);
    $("s-menage").textContent = montant(m);
    $("s-total").textContent = montant(p - com + m);
  }
  ["prix_nuit", "frais_menage"].forEach(function (n) { form.elements[n].addEventListener("input", majPrix); });
  form.querySelectorAll('input[name="devise"]').forEach(function (r) { r.addEventListener("change", majPrix); });
  (function () {
    var d = window.SUNDARLY_DEVISE ? window.SUNDARLY_DEVISE() : "EUR";
    var r = form.querySelector('input[name="devise"][value="' + d + '"]');
    if (r) r.checked = true;
    document.addEventListener("sundarly:devise", function (e) {
      var x = form.querySelector('input[name="devise"][value="' + e.detail + '"]');
      if (x) { x.checked = true; majPrix(); }
    });
  })();
  majPrix();

  // ---------- Banque ----------
  function banqueMaintenant() { var r = form.querySelector('input[name="banque_quand"]:checked'); return !r || r.value === "maintenant"; }
  form.querySelectorAll('input[name="banque_quand"]').forEach(function (r) {
    r.addEventListener("change", function () { $("bloc-banque").hidden = !banqueMaintenant(); });
  });
  function typeNumero() {
    var p = val("pays_banque");
    if (p === "Maroc") return { label: "RIB marocain (24 chiffres)", aide: "Les 24 chiffres de votre RIB, espaces acceptés.", ph: "011 780 0000123456789012 34" };
    if (p === "Tunisie") return { label: "RIB tunisien (20 chiffres)", aide: "Les 20 chiffres de votre RIB, espaces acceptés.", ph: "08 006 0123456789012 34" };
    return { label: "IBAN", aide: "Les espaces sont acceptés.", ph: p === "Suisse" ? "CH93 0076 2011 6238 5295 7" : "FR76 3000 6000 0112 3456 7890 189" };
  }
  $("pays_banque").addEventListener("change", function () {
    var t = typeNumero();
    $("l-numero").textContent = t.label; $("aide-numero").textContent = t.aide; $("numero").placeholder = t.ph;
  });
  function ibanValide(iban) {
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    var r = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, function (c) { return String(c.charCodeAt(0) - 55); });
    var reste = 0;
    for (var i = 0; i < r.length; i += 7) reste = parseInt(String(reste) + r.substr(i, 7), 10) % 97;
    return reste === 1;
  }
  function numeroNettoye() { return val("numero").replace(/[\s.-]/g, "").toUpperCase(); }
  function verifierNumero() {
    var n = numeroNettoye(), p = val("pays_banque");
    if (!n) return "Indiquez votre " + typeNumero().label.split(" (")[0] + ".";
    if (p === "Maroc") return /^[0-9]{24}$/.test(n) ? "" : "Le RIB marocain doit contenir exactement 24 chiffres.";
    if (p === "Tunisie") return /^[0-9]{20}$/.test(n) ? "" : "Le RIB tunisien doit contenir exactement 20 chiffres.";
    return ibanValide(n) ? "" : "Cet IBAN n'est pas valide. Vérifiez qu'il n'y a pas d'erreur de frappe.";
  }

  // ---------- Récapitulatif ----------
  function libelleEspace(v) { return { logement_entier: "Logement entier", chambre_privee: "Chambre privée", chambre_partagee: "Chambre partagée" }[v] || v; }
  function libelleAnnul(v) { return { souple: "Souple", moderee: "Modérée", stricte: "Stricte" }[v] || v; }
  function choisi(nom) { var r = form.querySelector('input[name="' + nom + '"]:checked'); return r ? r.value : ""; }
  function equipements() { return Array.prototype.map.call(form.querySelectorAll('input[name="equipements"]:checked'), function (c) { return c.value; }); }
  function construireRecap() {
    var masque = function (n) { return n.length > 8 ? n.slice(0, 4) + " •••• " + n.slice(-4) : n; };
    var lignes = [
      ["Logement", choisi("type_logement") + " · " + libelleEspace(choisi("type_espace")), indexDe("Votre logement")],
      ["Adresse", val("adresse") + ", " + val("ville") + ", " + val("pays"), indexDe("Adresse")],
      ["Capacité", compteurs.voyageurs[0] + " voyageurs · " + compteurs.chambres[0] + " chambres · " + compteurs.lits[0] + " lits · " + compteurs.salles_de_bain[0] + " sdb", indexDe("Capacité")],
      ["Équipements", equipements().join(", ") || "Aucun sélectionné", indexDe("Équipements")],
      ["Photos", photos.length + " photos", indexDe("Photos")],
      ["Titre", val("titre"), indexDe("Titre")],
      ["Prix", montant(parseFloat(val("prix_nuit")) || 0) + " / nuit" + (val("frais_menage") ? " · ménage " + montant(parseFloat(val("frais_menage"))) : ""), indexDe("Prix")],
      ["Règles", "Annulation " + libelleAnnul(choisi("annulation")).toLowerCase() + " · arrivée " + (val("heure_arrivee") || "–") + " · départ " + (val("heure_depart") || "–"), indexDe("Règles")],
      ["Contact", val("nom") + " · " + val("email") + (val("telephone") ? " · " + val("telephone") : ""), indexDe("Vos coordonnées")],
      ["Versements", banqueMaintenant() ? val("titulaire") + " · " + masque(numeroNettoye()) : "À renseigner plus tard", indexDe("Versements")]
    ];
    var z = $("recap"); z.innerHTML = "";
    lignes.forEach(function (l) {
      var b = document.createElement("div"); b.className = "bloc";
      var d = document.createElement("div");
      var s = document.createElement("strong"); s.textContent = l[0];
      var p = document.createElement("p"); p.textContent = l[1];
      d.appendChild(s); d.appendChild(p);
      var m = document.createElement("button"); m.type = "button"; m.textContent = "Modifier";
      m.setAttribute("aria-label", "Modifier : " + l[0]);
      m.addEventListener("click", function () { afficher(l[2]); });
      b.appendChild(d); b.appendChild(m); z.appendChild(b);
    });
  }

  // ---------- Envoi ----------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function nombreOuNull(n) { var v = val(n); return v === "" ? null : Math.round(parseFloat(v) * 100) / 100; }

  function envoyer() {
    var etat = $("envoi-etat");
    envoiEnCours = true; btnSuivant.disabled = true; btnRetour.disabled = true; erreur("");

    if (!client) {
      if (cfg.DEMO) {
        etat.textContent = "Envoi des photos…";
        setTimeout(function () { terminer(); }, 1200);
        return;
      }
      erreur("Le formulaire n'est pas encore relié à la base de données (voir assets/config.js).");
      reactiver(); return;
    }

    var id = uuid();
    var urls = [];
    var i = 0;
    function envoyerPhoto() {
      if (i >= photos.length) return Promise.resolve();
      etat.textContent = "Envoi des photos : " + (i + 1) + " sur " + photos.length + "…";
      var chemin = id + "/" + String(i + 1).padStart(2, "0") + "-" + uuid().slice(0, 8) + ".jpg";
      return client.storage.from("photos-annonces").upload(chemin, photos[i].blob, { contentType: "image/jpeg", upsert: false })
        .then(function (r) {
          if (r.error) throw r.error;
          urls.push(client.storage.from("photos-annonces").getPublicUrl(chemin).data.publicUrl);
          i++; return envoyerPhoto();
        });
    }

    envoyerPhoto()
      .then(function () {
        etat.textContent = "Enregistrement de l'annonce…";
        return client.from("annonces").insert({
          id: id,
          type_logement: choisi("type_logement"),
          type_espace: choisi("type_espace"),
          pays: val("pays"), ville: val("ville"), adresse: val("adresse"),
          latitude: parseFloat(val("latitude")), longitude: parseFloat(val("longitude")),
          voyageurs: compteurs.voyageurs[0], chambres: compteurs.chambres[0],
          lits: compteurs.lits[0], salles_de_bain: compteurs.salles_de_bain[0],
          equipements: equipements(), photos: urls,
          titre: val("titre"), description: val("description"),
          devise: devise(), prix_nuit: nombreOuNull("prix_nuit"), frais_menage: nombreOuNull("frais_menage"),
          annulation: choisi("annulation"), caution: nombreOuNull("caution"),
          heure_arrivee: val("heure_arrivee") || null, heure_depart: val("heure_depart") || null,
          animaux: coche("animaux"), fumeurs: coche("fumeurs"), fetes: coche("fetes"),
          nom: val("nom"), email: val("email").toLowerCase(), telephone: val("telephone") || null,
          consentement: true
        });
      })
      .then(function (r) {
        if (r.error) throw r.error;
        if (!banqueMaintenant()) return { error: null };
        etat.textContent = "Enregistrement des coordonnées bancaires…";
        var bic = val("bic").replace(/\s/g, "").toUpperCase();
        return client.from("coordonnees_bancaires").insert({
          annonce_id: id, titulaire: val("titulaire"), pays_banque: val("pays_banque"),
          numero: numeroNettoye(), bic: bic || null, nom_banque: val("nom_banque") || null
        });
      })
      .then(function (r) { if (r.error) throw r.error; terminer(); })
      .catch(function (e) {
        console.error(e);
        etat.textContent = "";
        erreur("L'envoi n'a pas abouti. Vérifiez votre connexion internet et réessayez. Si le problème continue, contactez-nous.");
        reactiver();
      });
  }
  function reactiver() { envoiEnCours = false; btnSuivant.disabled = false; btnRetour.disabled = false; }
  function terminer() {
    try { localStorage.removeItem(CLE_BROUILLON); } catch (e) {}
    etapes.forEach(function (s) { s.hidden = true; });
    $("barre-actions").hidden = true;
    $("succes").hidden = false;
    erreur("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Brouillon (« Enregistrer et quitter ») ----------
  var CLE_BROUILLON = "sundarly-brouillon-annonce";
  var A_IGNORER = { numero: 1, bic: 1, titulaire: 1, nom_banque: 1, consentement: 1, site_web: 1 };
  function sauverBrouillon() {
    try {
      var d = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || A_IGNORER[el.name] || el.type === "file") return;
        if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
        else if (el.type === "checkbox") { if (el.checked) (d[el.name] = d[el.name] || []).push(el.value); }
        else d[el.name] = el.value;
      });
      d._compteurs = { voyageurs: compteurs.voyageurs[0], chambres: compteurs.chambres[0], lits: compteurs.lits[0], salles_de_bain: compteurs.salles_de_bain[0] };
      localStorage.setItem(CLE_BROUILLON, JSON.stringify(d));
    } catch (e) {}
  }
  function chargerBrouillon() {
    try {
      var d = JSON.parse(localStorage.getItem(CLE_BROUILLON) || "null");
      if (!d) return;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || !(el.name in d) || el.type === "file") return;
        var v = d[el.name];
        if (el.type === "radio") el.checked = el.value === v;
        else if (el.type === "checkbox") el.checked = Array.isArray(v) && v.indexOf(el.value) >= 0;
        else el.value = v;
      });
      if (d._compteurs) Object.keys(d._compteurs).forEach(function (k) { if (compteurs[k]) { compteurs[k][0] = d._compteurs[k]; majCompteur(k); } });
      form.querySelectorAll("[data-compteur]").forEach(function (el) { el.dispatchEvent(new Event("input")); });
      majPrix();
    } catch (e) {}
  }
  form.addEventListener("change", sauverBrouillon);
  document.getElementById("btn-quitter").addEventListener("click", function () {
    sauverBrouillon();
    window.location.href = "/";
  });
  chargerBrouillon();

  afficher(0);
})();

// Sundarly — mesure d'audience maison (pages vues, provenance, pays). Pas de cookie, pas d'adresse IP conservée.
(function () {
  try {
    if (localStorage.getItem("sundarly-admin") === "1") return; // les visites de l'administratrice ne comptent pas
    var v = localStorage.getItem("sundarly-visiteur");
    if (!v) { v = (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); localStorage.setItem("sundarly-visiteur", v); }
    var ref = "";
    try { if (document.referrer) { var h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h; } } catch (e) {}
    var q = new URLSearchParams(location.search);
    var data = JSON.stringify({ v: v, p: location.pathname.replace(/\.html$/, "") || "/", r: ref, u: q.get("utm_source") || "" });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/visite", new Blob([data], { type: "application/json" }));
    else fetch("/api/visite", { method: "POST", headers: { "Content-Type": "application/json" }, body: data, keepalive: true });
  } catch (e) {}
})();

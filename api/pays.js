// Sundarly — indique le pays du visiteur (en-tête Vercel) pour choisir la langue et la devise.
// Aucune adresse IP n'est lue ni conservée.
module.exports = function (req, res) {
  var p = String(req.headers["x-vercel-ip-country"] || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(p)) p = "";
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).end(JSON.stringify({ pays: p }));
};

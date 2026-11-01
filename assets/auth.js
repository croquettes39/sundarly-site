// Sundarly — connexion des hôtes (Supabase Auth)
(function () {
  "use strict";
  var cfg = window.SUNDARLY_CONFIG || {};
  var client = null;
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }

  function session() {
    if (!client) return Promise.resolve(null);
    return client.auth.getSession().then(function (r) { return r.data ? r.data.session : null; });
  }

  // Redirige vers la page de connexion si personne n'est connecté
  function exiger(retour) {
    return session().then(function (s) {
      if (!s) {
        window.location.replace("compte.html?retour=" + encodeURIComponent(retour || "espace-hote.html"));
        return new Promise(function () {});
      }
      return s;
    });
  }

  // Crée le profil à la première connexion, à partir des infos données à l'inscription
  function profil(s) {
    return client.from("profils").select("*").eq("id", s.user.id).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      if (r.data) return r.data;
      var m = s.user.user_metadata || {};
      var nouveau = {
        id: s.user.id,
        prenom: (m.prenom || "").trim() || "Hôte",
        nom: (m.nom || "").trim() || "-",
        telephone: (m.telephone || "").trim() || "000000",
        pays: m.pays || null
      };
      return client.from("profils").insert(nouveau).select().single().then(function (r2) {
        if (r2.error) throw r2.error;
        return r2.data;
      });
    });
  }

  window.SundarlyAuth = { client: client, session: session, exiger: exiger, profil: profil };
})();

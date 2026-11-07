/* =========================================================
   CONFIGURATION — Marrakech Sunrise Balloon
   Ce fichier est partagé par le site (index.html) et l’espace de gestion (admin.html).
   ========================================================= */

/* 1) Base de données Supabase (gratuite) — voir supabase-setup.sql
      Tant que ces deux champs sont vides, le site et l’espace de gestion
      fonctionnent en MODE DÉMO : les modifications restent dans le navigateur. */
const SUPABASE = {
  url: "https://ttncsymsinkxcjncudwc.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bmNzeW1zaW5reGNqbmN1ZHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNTQxNTksImV4cCI6MjEwOTYzMDE1OX0.wIyjA4aDaorVw7fhxiDvuHVMFPUjR-Sx3Q9BsTVTw78"  // clé publique (sans danger dans le site)
};

/* 2) Réglages par défaut (modifiables ensuite depuis l’espace de gestion) */
const DEFAULT_SETTINGS = {
  whatsapp: "212773836323",
  phoneDisplay: "+212 773 836 323",
  googleReviewsUrl: "https://maps.app.goo.gl/zVmYZpGz7va5PCF47",
  eurRate: "10.8"
};

/* 3) Offres par défaut (modifiables ensuite depuis l’espace de gestion) */
const DEFAULT_OFFERS = [
 {
  "id": "sunrise",
  "category": "balloon",
  "featured": true,
  "discount": 20,
  "duration": "40–60 min",
  "sort": 1,
  "visible": true,
  "time": "04:30",
  "price": 1200,
  "image": "images/flight-1.jpg",
  "name": {
   "en": "First flight · Sunrise",
   "fr": "Premier vol · Lever du soleil",
   "es": "Primer vuelo · Amanecer",
   "de": "Erster Flug · Sonnenaufgang",
   "ar": "الرحلة الأولى · الشروق"
  },
  "items": {
   "en": [
    "Pickup from your accommodation",
    "Return transfer between Marrakech and the take-off site",
    "Welcome with tea or coffee and pastries",
    "Balloon flight of about 40 to 60 minutes, depending on conditions",
    "Panoramic views over the Marrakech countryside and the Atlas mountains, weather permitting",
    "Moroccan breakfast after the flight",
    "Flight certificate",
    "Drop-off at your accommodation"
   ],
   "fr": [
    "Prise en charge à votre logement",
    "Transfert aller-retour entre Marrakech et le site de décollage",
    "Accueil avec thé ou café et pâtisseries",
    "Vol en montgolfière d'environ 40 à 60 minutes, selon les conditions",
    "Vue panoramique sur la campagne de Marrakech et l'Atlas, selon la météo",
    "Petit-déjeuner marocain après le vol",
    "Certificat de vol",
    "Retour à votre logement"
   ],
   "es": [
    "Recogida en tu alojamiento",
    "Traslado de ida y vuelta entre Marrakech y el lugar de despegue",
    "Bienvenida con té o café y pasteles",
    "Vuelo en globo de unos 40 a 60 minutos, según las condiciones",
    "Vista panorámica del campo de Marrakech y del Atlas, si el tiempo lo permite",
    "Desayuno marroquí después del vuelo",
    "Certificado de vuelo",
    "Regreso a tu alojamiento"
   ],
   "de": [
    "Abholung an Ihrer Unterkunft",
    "Hin- und Rücktransfer zwischen Marrakesch und dem Startplatz",
    "Empfang mit Tee oder Kaffee und Gebäck",
    "Ballonfahrt von etwa 40 bis 60 Minuten, je nach Bedingungen",
    "Panoramablick über das Umland von Marrakesch und den Atlas, je nach Wetter",
    "Marokkanisches Frühstück nach dem Flug",
    "Flugzertifikat",
    "Rückfahrt zu Ihrer Unterkunft"
   ],
   "ar": [
    "النقل من مكان إقامتك",
    "نقل ذهابًا وإيابًا بين مراكش وموقع الإقلاع",
    "استقبال بالشاي أو القهوة والحلويات",
    "رحلة بالمنطاد لمدة 40 إلى 60 دقيقة تقريبًا حسب الظروف",
    "إطلالة بانورامية على ضواحي مراكش وجبال الأطلس حسب الطقس",
    "فطور مغربي بعد الرحلة",
    "شهادة طيران",
    "العودة إلى مكان إقامتك"
   ]
  },
  "badge": {
   "en": "Sunrise",
   "fr": "Lever du soleil",
   "es": "Amanecer",
   "de": "Sonnenaufgang",
   "ar": "الشروق"
  }
 },
 {
  "id": "second",
  "category": "balloon",
  "duration": "40–60 min",
  "sort": 2,
  "visible": true,
  "time": "05:30",
  "price": 1000,
  "image": "images/flight-2.jpg",
  "name": {
   "en": "Second morning flight",
   "fr": "Deuxième vol du matin",
   "es": "Segundo vuelo de la mañana",
   "de": "Zweiter Morgenflug",
   "ar": "الرحلة الصباحية الثانية"
  },
  "items": {
   "en": [
    "Pickup from your accommodation",
    "Return transfer between Marrakech and the take-off site",
    "Welcome before the flight",
    "Balloon flight of about 40 to 60 minutes, depending on conditions",
    "Panoramic views over the Marrakech countryside and the Atlas mountains, weather permitting",
    "Moroccan breakfast after the flight",
    "Flight certificate",
    "Drop-off at your accommodation"
   ],
   "fr": [
    "Prise en charge à votre logement",
    "Transfert aller-retour entre Marrakech et le site de décollage",
    "Accueil avant le vol",
    "Vol en montgolfière d'environ 40 à 60 minutes, selon les conditions",
    "Vue panoramique sur la campagne de Marrakech et l'Atlas, selon la météo",
    "Petit-déjeuner marocain après le vol",
    "Certificat de vol",
    "Retour à votre logement"
   ],
   "es": [
    "Recogida en tu alojamiento",
    "Traslado de ida y vuelta entre Marrakech y el lugar de despegue",
    "Bienvenida antes del vuelo",
    "Vuelo en globo de unos 40 a 60 minutos, según las condiciones",
    "Vista panorámica del campo de Marrakech y del Atlas, si el tiempo lo permite",
    "Desayuno marroquí después del vuelo",
    "Certificado de vuelo",
    "Regreso a tu alojamiento"
   ],
   "de": [
    "Abholung an Ihrer Unterkunft",
    "Hin- und Rücktransfer zwischen Marrakesch und dem Startplatz",
    "Empfang vor dem Flug",
    "Ballonfahrt von etwa 40 bis 60 Minuten, je nach Bedingungen",
    "Panoramablick über das Umland von Marrakesch und den Atlas, je nach Wetter",
    "Marokkanisches Frühstück nach dem Flug",
    "Flugzertifikat",
    "Rückfahrt zu Ihrer Unterkunft"
   ],
   "ar": [
    "النقل من مكان إقامتك",
    "نقل ذهابًا وإيابًا بين مراكش وموقع الإقلاع",
    "استقبال قبل الرحلة",
    "رحلة بالمنطاد لمدة 40 إلى 60 دقيقة تقريبًا حسب الظروف",
    "إطلالة بانورامية على ضواحي مراكش وجبال الأطلس حسب الطقس",
    "فطور مغربي بعد الرحلة",
    "شهادة طيران",
    "العودة إلى مكان إقامتك"
   ]
  },
  "badge": {
   "en": "Best price",
   "fr": "Meilleur prix",
   "es": "Mejor precio",
   "de": "Bester Preis",
   "ar": "أفضل سعر"
  }
 }
];

/* 4) Catégories d'excursions (nom affiché dans chaque langue) */
const CATS = {
  balloon: { icon: "🎈", en: "Hot air balloon", fr: "Montgolfière", es: "Globo", de: "Ballonfahrt", ar: "منطاد" },
  quad:    { icon: "🏍️", en: "Quad biking", fr: "Quad", es: "Quad", de: "Quad", ar: "دراجات رباعية" },
  buggy:   { icon: "🚙", en: "Buggy", fr: "Buggy", es: "Buggy", de: "Buggy", ar: "باجي" },
  camel:   { icon: "🐪", en: "Camel ride", fr: "Balade à dromadaire", es: "Paseo en camello", de: "Kamelritt", ar: "ركوب الجمال" },
  tour:    { icon: "🗺️", en: "Day trip", fr: "Excursion à la journée", es: "Excursión de un día", de: "Tagesausflug", ar: "رحلة يومية" },
  other:   { icon: "✨", en: "Other activity", fr: "Autre activité", es: "Otra actividad", de: "Andere Aktivität", ar: "نشاط آخر" }
};

/* Fonctions communes */
const DB = {
  on: () => !!(SUPABASE.url && SUPABASE.anonKey),
  headers(token){ return { apikey: SUPABASE.anonKey, Authorization: "Bearer " + (token || SUPABASE.anonKey), "Content-Type": "application/json" }; },
  async get(path, token){ const r = await fetch(SUPABASE.url + "/rest/v1/" + path, { headers: DB.headers(token) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  async send(method, path, body, token, prefer){ const h = DB.headers(token); if (prefer) h.Prefer = prefer;
    const r = await fetch(SUPABASE.url + "/rest/v1/" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); if (!r.ok) throw new Error(await r.text()); return r.status === 204 ? null : r.text().then(x => x ? JSON.parse(x) : null); }
};
const DEMO = {
  get(k, d){ try { const v = localStorage.getItem("hab_demo_" + k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem("hab_demo_" + k, JSON.stringify(v)); } catch(e){} }
};

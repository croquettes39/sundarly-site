#!/usr/bin/env python3
"""Génère les pages « Locations de vacances à … » (référencement) à partir de outils/destinations.json.
Usage : python3 outils/generer_destinations.py   (depuis la racine du site)"""
import json, html, os, shutil

SITE = "https://www.sundarly.com"
D = json.load(open("outils/destinations.json", encoding="utf-8"))
PAR_SLUG = {d["slug"]: d for d in D}
os.makedirs("locations-vacances", exist_ok=True)
os.makedirs("api", exist_ok=True)
json.dump([{"slug": d["slug"], "nom": d["nom"]} for d in D], open("api/destinations.json", "w", encoding="utf-8"), ensure_ascii=False)

def e(s): return html.escape(s, quote=True)
def requete(d): return d["nom"].split(" et ")[0]
def a_la(nom):
    return "à " + nom

LOGO = '<svg width="36" height="36" viewBox="0 0 34 34" fill="none" aria-hidden="true"><circle cx="17" cy="15" r="6" stroke="currentColor" stroke-width="2.5"/><path d="M17 3v3M5 15h3M26 15h3M8.5 6.5l2 2M25.5 6.5l-2 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M4 27c3-3 6-3 9 0s6 3 9 0 6-3 9 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>'

def entete():
    return f'''<header class="entete">
  <div class="conteneur">
    <a class="logo" href="/" aria-label="Sundarly, accueil">{LOGO}<span>sundarly</span></a>
    <nav class="nav" aria-label="Navigation principale">
      <label class="choix-devise"><span class="sr">Devise</span><select data-choix-devise aria-label="Devise d'affichage"><option value="EUR">€ EUR</option><option value="MAD">DH MAD</option><option value="CHF">CHF</option></select></label>
      <a href="/locations-vacances">Destinations</a>
      <a href="/compte" data-lien-compte>Connexion</a>
      <a class="btn" href="/hotes">Devenir hôte</a>
    </nav>
  </div>
</header>'''

def pied():
    groupes = {}
    for d in D: groupes.setdefault(d["pays"], []).append(d)
    cols = "".join(f'<div><strong>{e(p)}</strong>' + "".join(f'<a href="/locations-vacances/{x["slug"]}">{e(x["nom"])}</a>' for x in L) + "</div>" for p, L in [("Maroc", groupes["Maroc"]), ("Tunisie", groupes["Tunisie"]), ("Europe", [x for x in D if x["pays"] not in ("Maroc", "Tunisie")])])
    return f'''<footer class="pied">
  <div class="conteneur">
    <div class="colonnes colonnes-4">
      <div>
        <a class="logo" href="/" style="font-size:22px"><span>sundarly</span></a>
        <p>Locations de vacances entre particuliers en Europe, au Maroc et en Tunisie. Aucun frais de service pour les voyageurs.</p>
        <a href="/hotes">Devenir hôte</a>
        <a href="/logements">Tous les logements</a>
      </div>
      {cols}
    </div>
    <div class="bas">
      <span class="liens-legaux">© <span data-annee>2026</span> Sundarly · <a href="/conditions-generales">Conditions générales</a> · <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a></span>
    </div>
  </div>
</footer>'''

def tete(titre, desc, url, jsonld, robots=""):
    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(titre)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
{robots}<meta property="og:type" content="website">
<meta property="og:site_name" content="Sundarly">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{e(titre)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/partage.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(titre)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}/assets/partage.jpg">
<meta name="theme-color" content="#D81B60">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>
</head>'''

SCRIPTS = '''<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="/assets/devise.js"></script>
<script src="/assets/config.js"></script>
<script src="/assets/auth.js"></script>
<script src="/assets/app.js"></script>
<script src="/assets/voyageurs-commun.js"></script>
<script src="/assets/destination.js"></script>'''

def faq(d):
    q = []
    q.append((f"Combien coûte une location de vacances {a_la(d['nom'])} sur Sundarly ?",
              f"Chaque hôte fixe son prix par nuit, et éventuellement des frais de ménage. Sur Sundarly, il n'y a aucun frais de service pour les voyageurs : le prix affiché pour votre logement {a_la(d['nom'])} est le prix que vous payez."))
    qs = "; ".join(f"{n} ({t})" for n, t in d["quartiers"])
    q.append((f"Dans quel quartier séjourner {a_la(d['nom'])} ?", f"Tout dépend de votre séjour : {qs}."))
    q.append((f"Quelle est la meilleure période pour partir {a_la(d['nom'])} ?", d["saison"]))
    q.append((f"Comment réserver un logement {a_la(d['nom'])} ?",
              "Choisissez vos dates et le nombre de voyageurs, puis réservez directement sur Sundarly. Le paiement est sécurisé et les coordonnées de l'hôte vous sont transmises dès que la réservation est confirmée et payée. Les réservations ouvrent le 20 novembre 2026."))
    q.append((f"J'ai un logement {a_la(d['nom'])}, comment le proposer sur Sundarly ?",
              "L'inscription est gratuite. Créez votre compte hôte, publiez votre annonce en quelques minutes et ne payez que 10 % de commission sur le prix des nuits (0 % sur vos 3 premières réservations pendant le lancement). Le ménage vous revient en entier."))
    return q

def page(d):
    url = f"{SITE}/locations-vacances/{d['slug']}"
    def pl(t):
        t = t.lower()
        if "/" in t: return t
        if " d'" in t: a, b = t.split(" d'", 1); return a + "s d'" + b
        return t if t.endswith("s") else t + "s"
    types_txt = ", ".join(pl(t) for t in d["types"][:3])
    titre = f"Location vacances {d['nom']} : {types_txt} | Sundarly"
    if len(titre) > 70: titre = f"Location vacances {d['nom']} sans frais de service | Sundarly"
    desc = d["accroche"][:158]
    F = faq(d)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Locations de vacances", "item": SITE + "/locations-vacances"},
            {"@type": "ListItem", "position": 3, "name": d["nom"], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in F]},
        {"@type": "TouristDestination", "name": d["nom"], "url": url, "description": d["intro"],
         "geo": {"@type": "GeoCoordinates", "latitude": d["lat"], "longitude": d["lng"]},
         "containedInPlace": {"@type": "Country", "name": d["pays"]}}]}
    q = requete(d)
    types = "".join(f'<a class="puce-lien" href="/logements?q={e(q)}&amp;type={e(t)}">{e(t)}s {e(a_la(q))}</a>' if not t.endswith("s") and "/" not in t else f'<a class="puce-lien" href="/logements?q={e(q)}&amp;type={e(t)}">{e(t)} {e(a_la(q))}</a>' for t in d["types"])
    quartiers = "".join(f'<article class="carte"><h3>{e(n)}</h3><p>{e(t[0].upper() + t[1:])}.</p></article>' for n, t in d["quartiers"])
    activites = "".join(f"<li>{e(a)}</li>" for a in d["activites"])
    proches = "".join(f'<a class="carte-dest" href="/locations-vacances/{p}"><strong>{e(PAR_SLUG[p]["nom"])}</strong><span>{e(PAR_SLUG[p]["pays"])}</span></a>' for p in d["proches"])
    faqhtml = "".join(f"<details><summary>{e(q_)}</summary><p>{e(r)}</p></details>" for q_, r in F)
    return tete(titre, desc, url, ld) + f'''
<body>
{entete()}
<main>
  <nav class="fil-ariane conteneur" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <a href="/locations-vacances">Locations de vacances</a> › <span>{e(d["nom"])}</span></nav>
  <section class="heros heros-dest">
    <div class="conteneur">
      <span class="etiquette">{e(d["pays"])}</span>
      <h1>Locations de vacances <em>{e(a_la(d["nom"]))}</em></h1>
      <p class="chapeau">{e(d["accroche"])}</p>
      <form class="recherche recherche-dest" action="/logements" method="get" role="search">
        <label class="rech-champ rech-dest"><span>Destination</span><input type="search" name="q" value="{e(q)}"></label>
        <label class="rech-champ"><span>Arrivée</span><input type="date" name="arrivee"></label>
        <label class="rech-champ"><span>Départ</span><input type="date" name="depart"></label>
        <label class="rech-champ rech-voy"><span>Voyageurs</span><input type="number" name="voyageurs" min="1" max="50" placeholder="Ajouter"></label>
        <button class="rech-bouton" type="submit"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Rechercher</span></button>
      </form>
    </div>
  </section>

  <section class="section" id="logements-dest" data-ville="{e(q)}" data-pays="{e(d["pays"])}">
    <div class="conteneur">
      <h2>Logements {e(a_la(d["nom"]))}</h2>
      <div class="grille-logements grille-dest" id="grille-dest"></div>
      <p class="intro" id="vide-dest">Les premiers logements {e(a_la(d["nom"]))} seront réservables dès l'ouverture des réservations, le <strong>20 novembre 2026</strong>. <a href="/">Soyez prévenu de l'ouverture</a>.</p>
    </div>
  </section>

  <section class="section section-pale">
    <div class="conteneur">
      <h2>Séjourner {e(a_la(d["nom"]))}</h2>
      <p class="texte-long">{e(d["intro"])}</p>
      <h3 class="sous-titre">Types de logements {e(a_la(q))}</h3>
      <div class="puces-liens">{types}</div>
    </div>
  </section>

  <section class="section">
    <div class="conteneur">
      <h2>Où séjourner {e(a_la(d["nom"]))} ?</h2>
      <div class="grille-3">{quartiers}</div>
      <div class="deux-blocs">
        <div><h3 class="sous-titre">Que faire {e(a_la(q))} ?</h3><ul class="liste-coches">{activites}</ul></div>
        <div><h3 class="sous-titre">Quand partir ?</h3><p class="texte-long">{e(d["saison"])}</p></div>
      </div>
    </div>
  </section>

  <section class="section section-pale">
    <div class="conteneur">
      <h2>Pourquoi réserver {e(a_la(q))} avec Sundarly ?</h2>
      <div class="grille-3">
        <article class="carte"><h3>0 € de frais de service</h3><p>Le prix affiché est le prix que vous payez. Pas de mauvaise surprise au moment de payer.</p></article>
        <article class="carte"><h3>Hôtes vérifiés</h3><p>Chaque hôte fait vérifier son identité avant de publier son logement.</p></article>
        <article class="carte"><h3>Paiement sécurisé</h3><p>Vous payez sur Sundarly ; l'adresse exacte et les coordonnées de l'hôte vous sont transmises après la réservation.</p></article>
      </div>
    </div>
  </section>

  <section class="section" id="faq">
    <div class="conteneur">
      <h2>Questions fréquentes : location {e(a_la(d["nom"]))}</h2>
      <div class="faq">{faqhtml}</div>
    </div>
  </section>

  <section class="section">
    <div class="conteneur">
      <div class="bandeau-hote-dest">
        <div><h2>Vous avez un logement {e(a_la(q))} ?</h2><p>Publiez-le gratuitement et gardez 90 % de vos revenus : 10 % de commission seulement, sur les nuits. 0 % sur vos 3 premières réservations.</p></div>
        <a class="btn" href="/hotes">Devenir hôte</a>
      </div>
      <h2 style="margin-top:56px">Destinations à découvrir</h2>
      <div class="grille-dest-liens">{proches}</div>
    </div>
  </section>
</main>
{pied()}
{SCRIPTS}
</body>
</html>
'''

for d in D:
    open(f"locations-vacances/{d['slug']}.html", "w", encoding="utf-8").write(page(d))

# Page centrale « Locations de vacances »
groupes = [("Maroc", [d for d in D if d["pays"] == "Maroc"]), ("Tunisie", [d for d in D if d["pays"] == "Tunisie"]), ("Europe", [d for d in D if d["pays"] not in ("Maroc", "Tunisie")])]
url = SITE + "/locations-vacances"
ld = {"@context": "https://schema.org", "@graph": [
    {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "Locations de vacances", "item": url}]},
    {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f"{SITE}/locations-vacances/{d['slug']}", "name": d["nom"]} for i, d in enumerate(D)]}]}
blocs = "".join(f'<h2>{e(p)}</h2><div class="grille-dest-liens">' + "".join(f'<a class="carte-dest" href="/locations-vacances/{d["slug"]}"><strong>{e(d["nom"])}</strong><span>{e(d["accroche"][:110])}…</span></a>' for d in L) + "</div>" for p, L in groupes)
hub = tete("Locations de vacances au Maroc, en Tunisie et en Europe | Sundarly",
           "Riads, villas, appartements et maisons d'hôtes à Marrakech, Agadir, Djerba, Nice, Lisbonne… Locations entre particuliers, sans frais de service.",
           url, ld) + f'''
<body>
{entete()}
<main>
  <nav class="fil-ariane conteneur" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <span>Locations de vacances</span></nav>
  <section class="heros heros-dest">
    <div class="conteneur">
      <span class="etiquette">Europe · Maroc · Tunisie</span>
      <h1>Locations de vacances <em>sans frais de service</em></h1>
      <p class="chapeau">Riads, villas avec piscine, appartements, maisons d'hôtes : choisissez votre destination et réservez directement auprès d'hôtes vérifiés.</p>
    </div>
  </section>
  <section class="section"><div class="conteneur">{blocs}</div></section>
</main>
{pied()}
{SCRIPTS}
</body>
</html>
'''
open("locations-vacances.html", "w", encoding="utf-8").write(hub)
print(len(D), "pages destinations générées")

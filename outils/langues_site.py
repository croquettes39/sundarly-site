#!/usr/bin/env python3
"""Sundarly — outils communs pour les pages par langue (référencement Google dans chaque pays).

Les pages sont écrites en français. Pour chaque langue (en, es, pt, de, it, nl) on crée une copie
traduite dans un dossier /<langue>/ (ex. /en/logements), avec :
  - <html lang>, titre, description, balises de partage traduits ;
  - lien canonique vers l'adresse de la langue, et liens « hreflang » vers toutes les autres langues ;
  - liens internes vers les pages de la même langue ;
  - données structurées (JSON-LD) traduites.
Les traductions viennent de assets/langues/<langue>.json (les mêmes que celles du site).
"""
import json, re, os, html as htmlmod
from urllib.parse import urlsplit, urljoin
from bs4 import BeautifulSoup, NavigableString, Comment, Doctype

SITE = "https://www.sundarly.com"
LANGUES = ["en", "es", "pt", "de", "it", "nl"]
TOUTES = ["fr"] + LANGUES
OG_LOCALE = {"fr": "fr_FR", "en": "en_US", "es": "es_ES", "pt": "pt_PT", "de": "de_DE", "it": "it_IT", "nl": "nl_NL"}
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- Adresses ----------
PAGES_FIXES = {"/", "/logements", "/hotes", "/pourquoi-sundarly", "/locations-vacances", "/logement"}

def variante(chemin):
    """Adresse « de base » (française) d'une page qui existe dans toutes les langues, sinon None."""
    p = chemin.split("?")[0].split("#")[0]
    m = re.match(r"^/(en|es|pt|de|it|nl)(/|$)", p)
    if m: p = p[len(m.group(1)) + 1:] or "/"
    if p.endswith(".html"): p = p[:-5]
    if p.endswith("/index") or p == "index": p = p[:-5] or "/"
    if p != "/" and p.endswith("/"): p = p[:-1]
    if p == "/informations": p = "/pourquoi-sundarly"
    if p in PAGES_FIXES: return p
    if re.match(r"^/locations-vacances/[a-z0-9-]+$", p): return p
    if re.match(r"^/logement/[a-z0-9-]+$", p): return p
    return None

def adresse(langue, base):
    """/logements → /en/logements ; / → /en"""
    if langue == "fr": return base
    return "/" + langue + ("" if base == "/" else base)

def alternates(base):
    """Balises hreflang (texte HTML) pour une page."""
    lignes = [f'<link rel="alternate" hreflang="{l}" href="{SITE}{adresse(l, base)}">' for l in TOUTES]
    lignes.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}{base}">')
    return "\n".join(lignes)

# ---------- Dictionnaires ----------
_DICOS = {}
def dico(langue):
    if langue not in _DICOS:
        j = json.load(open(os.path.join(RACINE, "assets", "langues", langue + ".json"), encoding="utf-8"))
        t = j["t"]
        f = sorted([k for k in j.get("f", []) if k in t], key=len, reverse=True)
        rx = re.compile(r"(^|[^A-Za-zÀ-ÿ])(" + "|".join(re.escape(k) for k in f) + r")(?![A-Za-zÀ-ÿ])") if f else None
        _DICOS[langue] = (t, rx)
    return _DICOS[langue]

NOMBRE = re.compile(r"\d+(?:[.,]\d+)?")
LETTRES = re.compile(r"[A-Za-zÀ-ÿ]{2}")

def traduire(langue, brut, morceaux=True):
    """Même règle que assets/langue.js : texte entier connu, sinon morceaux connus ; None si inconnu."""
    if not brut: return None
    t, rx = dico(langue)
    c = re.sub(r"\s+", " ", brut.replace("\xa0", " ").replace(" ", " ")).strip()
    if len(c) < 2 or len(c) > 1500 or not LETTRES.search(c): return None
    nombres = NOMBRE.findall(c)
    k = NOMBRE.sub("#", c)
    r = t.get(k)
    if r is None and morceaux and rx is not None and len(c) <= 400:
        couvert = [0]
        def rep(m):
            couvert[0] += len(m.group(2)); return m.group(1) + t[m.group(2)]
        essai = rx.sub(rep, k)
        if couvert[0] and not (len(k) > 60 and couvert[0] < len(k) * 0.4): r = essai
    if r is None: return None
    it = iter(nombres)
    r = re.sub("#", lambda m: next(it, "#"), r)
    debut = re.match(r"^\s*", brut).group(0); fin = re.search(r"\s*$", brut).group(0)
    return debut + r + fin

# ---------- Traitement d'une page ----------
EXCLUS = {"script", "style", "textarea", "code"}
LIBRE = re.compile(r"(^| )(fi-titre|cl-titre|ap-titre|extrait|logo)( |$)")
ATTRIBUTS = ["placeholder", "aria-label", "title", "alt", "label"]
METAS = {("name", "description"), ("property", "og:title"), ("property", "og:description"),
         ("name", "twitter:title"), ("name", "twitter:description")}

def _exclu(el):
    while el is not None and getattr(el, "name", None):
        if el.name in EXCLUS or el.get("translate") == "no": return True
        cl = el.get("class")
        if cl and LIBRE.search(" ".join(cl)): return True
        el = el.parent
    return False

def _lien(langue, valeur, chemin_fr):
    """Rend un lien absolu (la page traduite est dans un sous-dossier) et l'envoie vers la même langue si la page existe."""
    if not valeur or re.match(r"^(https?:|mailto:|tel:|data:|javascript:|#|//)", valeur): return valeur
    if "{" in valeur: return valeur
    absolu = urljoin(SITE + chemin_fr, valeur)
    parts = urlsplit(absolu)
    chemin = parts.path
    base = variante(chemin)
    if base is not None: chemin = adresse(langue, base)
    return chemin + (("?" + parts.query) if parts.query else "") + (("#" + parts.fragment) if parts.fragment else "")

def _jsonld(langue, v, cle=None, morceaux=False):
    if isinstance(v, dict): return {k: _jsonld(langue, x, k, morceaux) for k, x in v.items()}
    if isinstance(v, list): return [_jsonld(langue, x, cle, morceaux) for x in v]
    if isinstance(v, str):
        if cle == "inLanguage": return langue
        if cle in ("url", "item") and v.startswith(SITE):
            base = variante(urlsplit(v).path)
            return SITE + adresse(langue, base) if base is not None else v
        if cle and (cle.startswith("@") or cle in ("image", "logo", "sameAs", "urlTemplate", "email", "telephone", "identifier")): return v
        r = traduire(langue, v, morceaux)
        return r if r is not None else v
    return v

def traiter(page_html, langue, chemin_fr, morceaux=True, base=None):
    """Traduit une page française pour une langue. chemin_fr = adresse de la page française (ex. /logements)."""
    base = base or variante(chemin_fr) or chemin_fr
    soupe = BeautifulSoup(page_html, "html.parser")
    racine = soupe.find("html")
    if racine: racine["lang"] = langue
    manquants = []
    # textes
    for n in list(soupe.find_all(string=True)):
        if isinstance(n, (Comment, Doctype)) or _exclu(n.parent): continue
        s = str(n)
        if not s.strip() or not LETTRES.search(s): continue
        r = traduire(langue, s, morceaux)
        if r is not None and r != s:
            p = n.parent
            if p is not None and p.name == "option" and not p.has_attr("value"): p["value"] = s.strip()
            n.replace_with(NavigableString(r))
        elif r is None:
            manquants.append(s.strip())
    # attributs, liens, métadonnées
    for el in soupe.find_all(True):
        if el.name in ("a", "link") and el.has_attr("href") and el.get("rel") not in (["canonical"], ["alternate"]):
            el["href"] = _lien(langue, el["href"], chemin_fr)
        if el.name in ("script", "img", "source") and el.has_attr("src"):
            el["src"] = _lien(langue, el["src"], chemin_fr)
        if el.name == "form" and el.has_attr("action"):
            el["action"] = _lien(langue, el["action"], chemin_fr)
        for at in ("href", "src"):
            v = el.get(at)
            if v and re.search(r"mode-emploi-android(-mini)?\.(jpg|webp)$", v):
                el[at] = re.sub(r"\.(jpg|webp)$", "-" + langue + r".\1", v)
        if _exclu(el): continue
        for at in ATTRIBUTS:
            v = el.get(at)
            if v:
                r = traduire(langue, v, morceaux)
                if r is not None: el[at] = r
                elif LETTRES.search(v): manquants.append(v)
        if el.name == "input" and (el.get("type") or "").lower() in ("submit", "button") and el.get("value"):
            r = traduire(langue, el["value"], morceaux)
            if r is not None: el["value"] = r
        if el.name == "meta":
            for a in ("name", "property"):
                if (a, el.get(a)) in METAS and el.get("content"):
                    r = traduire(langue, el["content"], morceaux)
                    if r is not None: el["content"] = r
                    else: manquants.append(el["content"])
            if el.get("property") == "og:locale": el["content"] = OG_LOCALE[langue]
            if el.get("property") == "og:url": el["content"] = SITE + adresse(langue, base)
    tete = soupe.find("head")
    canon = soupe.find("link", rel="canonical")
    if canon is not None: canon["href"] = SITE + adresse(langue, base)
    for l in soupe.find_all("link", rel="alternate"):
        if l.get("hreflang"): l.decompose()
    if tete is not None:
        bloc = BeautifulSoup(alternates(base), "html.parser")
        if canon is not None:
            for x in reversed(list(bloc.find_all("link"))): canon.insert_after(x)
        else:
            for x in bloc.find_all("link"): tete.append(x)
    # données structurées
    for s in soupe.find_all("script", type="application/ld+json"):
        try:
            d = json.loads(s.string)
            s.string = json.dumps(_jsonld(langue, d, None, False), ensure_ascii=False)
        except Exception:
            pass
    sortie = str(soupe)
    if not sortie.lstrip().lower().startswith("<!doctype"): sortie = "<!doctype html>\n" + sortie
    return sortie, manquants

def hreflang_fr(page_html, base):
    """Ajoute (ou remplace) les balises hreflang dans une page française, sans toucher au reste du fichier."""
    page_html = re.sub(r'\n?<!-- langues -->.*?<!-- /langues -->', "", page_html, flags=re.S)
    page_html = re.sub(r'\n<link rel="alternate" hreflang="[^"]*" href="[^"]*">', "", page_html)
    bloc = "\n<!-- langues -->\n" + alternates(base) + "\n<!-- /langues -->"
    m = re.search(r'<link rel="canonical"[^>]*>', page_html)
    if m: return page_html[:m.end()] + bloc + page_html[m.end():]
    return page_html.replace("</head>", bloc.strip() + "\n</head>", 1)

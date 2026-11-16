#!/usr/bin/env python3
"""Sundarly — crée les pages publiques dans chaque langue (/en/, /es/, /pt/, /de/, /it/, /nl/) pour Google.
Usage (depuis la racine du site) : python3 outils/generer_pages_langues.py
À relancer après toute modification d'une page publique, d'une traduction (assets/langues/*.json)
ou des destinations. Lance aussi outils/generer_destinations.py (pages villes, toutes langues)."""
import os, sys, subprocess, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import langues_site as LS

os.chdir(LS.RACINE)
subprocess.run([sys.executable, "outils/generer_destinations.py"], check=True)

PAGES = [("index.html", "/"), ("logements.html", "/logements"), ("hotes.html", "/hotes"),
         ("pourquoi-sundarly.html", "/pourquoi-sundarly"), ("logement.html", "/logement")]
manquants = collections.Counter()
for fichier, base in PAGES:
    source = open(fichier, encoding="utf-8").read()
    fr = LS.hreflang_fr(source, base)
    if fr != source: open(fichier, "w", encoding="utf-8").write(fr)
    for l in LS.LANGUES:
        sortie, m = LS.traiter(fr, l, base if base != "/" else "/index.html", True, base)
        os.makedirs(l, exist_ok=True)
        open(os.path.join(l, fichier), "w", encoding="utf-8").write(sortie)
        if l == "en":
            for x in m: manquants[(fichier, x)] += 1
print(len(PAGES) * len(LS.LANGUES), "pages fixes traduites")
if manquants:
    print("Textes restés en français (à ajouter dans assets/langues/*.json) :")
    for (f, x), _ in manquants.most_common(): print("  ", f, "|", x[:110])

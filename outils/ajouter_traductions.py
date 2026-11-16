#!/usr/bin/env python3
"""Sundarly — ajoute des traductions dans assets/langues/<langue>.json.
Usage : python3 outils/ajouter_traductions.py fichier.txt
Chaque ligne : K:texte français ¦ en ¦ es ¦ pt ¦ de ¦ it ¦ nl
(les nombres sont remplacés par # dans le français ET dans les traductions).
Préfixe F: au lieu de K: pour un petit texte qui peut aussi servir de morceau dans une phrase composée par le site.
Les fichiers ayant servi à créer les dictionnaires sont gardés dans outils/traductions/ pour mémoire."""
import json, sys, os
LANGUES = ["en", "es", "pt", "de", "it", "nl"]
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ajouts = {l: {} for l in LANGUES}; morceaux = set(); erreurs = 0
for n, ligne in enumerate(open(sys.argv[1], encoding="utf-8"), 1):
    ligne = ligne.rstrip("\n")
    if not ligne.strip() or ligne.startswith("#"): continue
    p = [x.strip() for x in ligne.split(" ¦ ")]
    if len(p) != 7 or p[0][:2] not in ("K:", "F:"): print("ligne", n, ": format incorrect"); erreurs += 1; continue
    k = p[0][2:]
    for l, v in zip(LANGUES, p[1:]):
        if k.count("#") != v.count("#"): print("ligne", n, l, ": pas le même nombre de #"); erreurs += 1
        ajouts[l][k] = v
    if p[0].startswith("F:"): morceaux.add(k)
if erreurs: sys.exit("Rien n'a été modifié : corrigez d'abord les erreurs.")
for l in LANGUES:
    f = os.path.join(RACINE, "assets", "langues", l + ".json")
    j = json.load(open(f, encoding="utf-8"))
    j["t"].update(ajouts[l]); j["f"] = sorted(set(j.get("f", [])) | morceaux)
    json.dump(j, open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(ajouts["en"]), "textes ajoutés dans les", len(LANGUES), "langues")

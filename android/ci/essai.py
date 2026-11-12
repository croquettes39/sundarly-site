#!/usr/bin/env python3
"""
Essai de bout en bout de l'application dans le téléphone virtuel, piloté par ADB.
Étapes (fichier android/ci/essai.txt) :
  inscription  : crée le compte de test depuis l'écran « Créer un compte »
  identite     : se connecte, puis envoie passeport + selfie (photos prises avec l'appareil photo virtuel)
  reservation  : se connecte, ouvre un logement avec des dates lointaines et va jusqu'à la page de paiement Stripe (sans payer)
Les captures sont enregistrées dans resultats/essai/.
"""
import os, re, subprocess, sys, time, xml.etree.ElementTree as ET

APP = "com.sundarly.app"
SORTIE = "resultats/essai"
os.makedirs(SORTIE, exist_ok=True)
JOURNAL = open(os.path.join(SORTIE, "journal.txt"), "a")


def log(*m):
    t = " ".join(str(x) for x in m)
    print(t, flush=True)
    JOURNAL.write(t + "\n"); JOURNAL.flush()


def adb(*args, ok=True):
    r = subprocess.run(["adb", *args], capture_output=True, text=True)
    if ok and r.returncode != 0:
        log("adb erreur:", args, r.stderr.strip()[:300])
    return r.stdout


def capture(nom):
    with open(os.path.join(SORTIE, nom + ".png"), "wb") as f:
        f.write(subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True).stdout)
    log("capture", nom)


def noeuds():
    for _ in range(4):
        adb("shell", "uiautomator", "dump", "/sdcard/ui.xml", ok=False)
        x = adb("shell", "cat", "/sdcard/ui.xml", ok=False)
        if "<hierarchy" in x:
            try:
                liste = list(ET.fromstring(x[x.index("<hierarchy"):]).iter("node"))
            except ET.ParseError:
                liste = []
            # Alerte du téléphone virtuel (« … isn't responding ») : on répond « Wait » et on relit l'écran
            if any("isn't responding" in (n.get("text") or "") for n in liste):
                for n in liste:
                    if (n.get("text") or "") == "Wait":
                        a, b, c, d = map(int, re.findall(r"\d+", n.get("bounds")))
                        adb("shell", "input", "tap", str((a + c) // 2), str((b + d) // 2))
                        log("alerte du téléphone virtuel fermée")
                time.sleep(1.5)
                continue
            if liste:
                return liste
        time.sleep(1)
    return []


def centre(n):
    a, b, c, d = map(int, re.findall(r"\d+", n.get("bounds")))
    return (a + c) // 2, (b + d) // 2, b, d


def trouver(texte=None, contient=None, ressource=None, desc=None, classe=None):
    res = []
    for n in noeuds():
        t = n.get("text") or ""
        if texte is not None and t != texte:
            continue
        if contient is not None and contient.lower() not in (t + " " + (n.get("content-desc") or "")).lower():
            continue
        if ressource is not None and not (n.get("resource-id") or "").endswith(ressource):
            continue
        if desc is not None and desc.lower() not in (n.get("content-desc") or "").lower():
            continue
        if classe is not None and n.get("class") != classe:
            continue
        res.append(n)
    return res


def toucher(xy):
    adb("shell", "input", "tap", str(xy[0]), str(xy[1]))
    time.sleep(1.2)


def attendre(delai=20, **critere):
    fin = time.time() + delai
    while time.time() < fin:
        r = trouver(**critere)
        if r:
            return r
        time.sleep(1)
    return []


def defiler(bas=True):
    if bas:
        adb("shell", "input", "swipe", "540", "1700", "540", "900", "300")
    else:
        adb("shell", "input", "swipe", "540", "900", "540", "1700", "300")
    time.sleep(1)


def toucher_texte(delai=15, defile=3, dernier=False, **critere):
    for essai in range(defile + 1):
        r = attendre(delai if essai == 0 else 3, **critere)
        if r:
            n = r[-1] if dernier else r[0]
            x, y, haut, bas = centre(n)
            if bas > 2250:  # caché derrière la barre du bas : on remonte un peu le contenu
                defiler(); continue
            toucher((x, y)); return True
        defiler()
    log("INTROUVABLE", critere)
    capture("introuvable-" + re.sub(r"\W+", "-", str(list(critere.values())[0]))[:30])
    return False


def saisir(libelle, valeur):
    """Touche le champ dont l'étiquette est `libelle`, efface puis tape la valeur."""
    if not toucher_texte(texte=libelle):
        return False
    # Le champ est le parent EditText : on efface ce qu'il contient
    adb("shell", "input", "keyevent", "KEYCODE_MOVE_END")
    for _ in range(3):
        adb("shell", "input", "keyevent", *(["KEYCODE_DEL"] * 15))
    adb("shell", "input", "text", valeur.replace(" ", "%s").replace("'", ""))
    time.sleep(0.6)
    masquer_clavier()
    return True


def masquer_clavier():
    # Le clavier à l'écran est désactivé pendant l'essai (voir main) : rien à faire,
    # surtout pas « retour », qui fermerait l'écran.
    time.sleep(0.3)


def demarrer(*extras):
    adb("shell", "am", "force-stop", APP)
    adb("shell", "am", "start", "-W", "-n", APP + "/.MainActivity", *extras)
    time.sleep(6)


def alerte():
    if trouver(contient="isn't responding"):
        toucher_texte(texte="Wait", delai=2, defile=0)


def connexion(email, mdp):
    demarrer("--es", "ecran", "compte")
    alerte()
    saisir("E-mail", email)
    saisir("Mot de passe", mdp)
    capture("connexion-saisie")
    toucher_texte(texte="Se connecter", dernier=True)
    time.sleep(8)


def photo_appareil(index):
    """Touche le n-ième bouton « Prendre une photo », déclenche l'appareil photo virtuel et valide."""
    for _ in range(4):
        r = trouver(texte="Prendre une photo")
        if len(r) > index:
            x, y, h, b = centre(r[index])
            if b < 2250:
                toucher((x, y)); break
        defiler()
    else:
        log("bouton photo introuvable", index); return False
    time.sleep(4)
    # Appareil photo Android (Camera2) : autorisations, déclencheur, puis validation
    for _ in range(3):
        for t in ("While using the app", "Only this time", "Allow", "ALLOW", "Next", "NEXT", "OK", "Got it"):
            if trouver(texte=t):
                toucher_texte(texte=t, delai=1, defile=0); time.sleep(1)
    capture(f"appareil-photo-{index}")
    if not (toucher_texte(ressource="shutter_button", delai=8, defile=0) or toucher_texte(desc="Shutter", delai=3, defile=0)):
        return False
    time.sleep(3)
    ok = toucher_texte(ressource="done_button", delai=8, defile=0) or toucher_texte(desc="Done", delai=3, defile=0)
    time.sleep(3)
    return ok


def main():
    etape, email, mdp = (open("android/ci/essai.txt").read().split() + ["", "", ""])[:3]
    log("=== Étape :", etape, "| compte :", email)
    adb("install", "-r", sys.argv[1])
    adb("shell", "settings", "put", "secure", "show_ime_with_hard_keyboard", "0")
    # Pas de clavier à l'écran : la saisie passe par « adb input text », et les champs restent visibles
    for ime in adb("shell", "ime", "list", "-s", ok=False).split():
        adb("shell", "ime", "disable", ime, ok=False)
    adb("shell", "pm", "grant", "com.android.camera2", "android.permission.CAMERA", ok=False)
    adb("shell", "pm", "grant", "com.android.camera2", "android.permission.ACCESS_FINE_LOCATION", ok=False)
    # Le lanceur d'applications du téléphone virtuel n'est pas utile à l'essai et provoque des alertes
    adb("shell", "pm", "disable-user", "--user", "0", "com.google.android.apps.nexuslauncher", ok=False)
    adb("logcat", "-c")
    time.sleep(20); alerte()

    if etape == "inscription":
        demarrer("--es", "ecran", "compte")
        alerte()
        toucher_texte(texte="Créer un compte", dernier=True)
        capture("1-inscription-vide")
        saisir("Prénom", "Essai")
        saisir("Nom", "Android")
        saisir("E-mail", email)
        saisir("Téléphone (WhatsApp de préférence)", "+212600000000")
        toucher_texte(texte="Pays de résidence")
        toucher_texte(texte="Maroc", delai=5)
        saisir("Mot de passe", mdp)
        capture("2-inscription-remplie")
        toucher_texte(contient="J'ai 18 ans")  # le texte à côté de la case
        r = trouver(classe="android.widget.CheckBox")
        if r and r[0].get("checked") != "true":
            toucher(centre(r[0])[:2])
        capture("3-case-cochee")
        toucher_texte(texte="Créer mon compte")
        time.sleep(10)
        capture("4-apres-inscription")
        for t in ("Compte créé", "Vérification d'identité", "Un compte existe", "Une erreur", "Trop de tentatives", "Mot de passe trop faible"):
            if trouver(contient=t):
                log("RÉSULTAT :", t)

    elif etape == "identite":
        connexion(email, mdp)
        capture("1-apres-connexion")
        if not trouver(texte="Vérification d'identité"):
            log("pas d'écran de vérification après connexion")
        toucher_texte(texte="Type de pièce")
        toucher_texte(texte="Passeport", delai=5)
        saisir("Numéro de la pièce d'identité", "ESSAI12345")
        capture("2-identite-remplie")
        log("photo recto :", photo_appareil(0))
        capture("3-recto")
        log("photo selfie :", photo_appareil(1))
        capture("4-selfie")
        defiler(); defiler()
        capture("5-avant-envoi")
        toucher_texte(texte="Envoyer pour vérification")
        time.sleep(15)
        capture("6-apres-envoi")
        for t in ("En cours", "Il manque", "L'envoi n'a pas abouti", "Choisissez", "Indiquez"):
            if trouver(contient=t):
                log("RÉSULTAT :", t)

    elif etape == "reservation":
        connexion(email, mdp)
        capture("1-apres-connexion")
        slug = "studio-meuble-avec-balcon-hay-rajaa-casablanca"
        adb("shell", "am", "force-stop", APP)
        adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "https://www.sundarly.com/logement/" + slug,
            "--es", "arrivee", "2027-09-14", "--es", "depart", "2027-09-17", APP)
        time.sleep(8)
        capture("2-fiche-avec-dates")
        toucher_texte(texte="Réserver", defile=0)
        time.sleep(3)
        capture("3-panneau-reservation")
        toucher_texte(texte="Réserver", dernier=True, defile=0)
        time.sleep(20)
        capture("4-paiement")
        time.sleep(10)
        capture("5-paiement-charge")
        for t in ("Paiement sécurisé", "Vérification d'identité", "Connexion", "ne sont plus disponibles", "Une erreur"):
            if trouver(contient=t):
                log("RÉSULTAT :", t)

    adb("logcat", "-d", "-s", "AndroidRuntime:E", ok=False)
    with open(os.path.join(SORTIE, "plantages.txt"), "w") as f:
        f.write(adb("logcat", "-d", "-s", "AndroidRuntime:E", ok=False))
    log("=== fin")


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
# Installe l'app dans l'émulateur, parcourt les écrans principaux et enregistre des captures.
set -uo pipefail
SORTIE="${SORTIE:-resultats/captures}"; mkdir -p "$SORTIE"
APP=com.sundarly.app
photo() { sleep "${2:-2}"; adb exec-out screencap -p > "$SORTIE/$1.png"; echo "capture $1"; }
ouvrir() { adb shell am start -W -n $APP/.MainActivity "$@" >/dev/null; }

adb install -r "$1"
adb shell settings put system font_scale 1.0
adb logcat -c
ouvrir;                                                   photo 01-accueil 9
adb shell input swipe 540 1800 540 700 400;               photo 02-accueil-rangees 3
adb shell am force-stop $APP
ouvrir --es ecran resultats;                              photo 03-resultats 8
adb shell input swipe 540 1900 540 600 400;               photo 04-resultats-suite 3
adb shell am force-stop $APP
SLUG="${SLUG:-studio-meuble-avec-balcon-hay-rajaa-casablanca}"
adb shell am start -W -a android.intent.action.VIEW -d "https://www.sundarly.com/logement/$SLUG" $APP >/dev/null
                                                          photo 05-fiche 9
adb shell input swipe 540 1900 540 500 400;               photo 06-fiche-suite 3
adb shell input swipe 540 1900 540 300 300; adb shell input swipe 540 1900 540 300 300
                                                          photo 07-fiche-avis-carte 5
adb shell input swipe 540 1900 540 300 300;               photo 08-fiche-regles 3
adb shell input tap 880 2260;                             photo 09-reservation 3
adb shell input tap 300 1560;                             photo 10-calendrier 3
adb shell am force-stop $APP
ouvrir --es ecran compte;                                 photo 11-connexion 5
adb shell am force-stop $APP
ouvrir --es onglet Profil;                                photo 12-profil 5
adb shell am force-stop $APP
ouvrir --es onglet Voyages;                               photo 13-voyages 4
adb shell am force-stop $APP
ouvrir --es onglet Favoris;                               photo 14-favoris 4

adb logcat -d -s AndroidRuntime:E > "$SORTIE/../plantages.txt" || true
adb logcat -d | grep -i -E "sundarly|FATAL" | tail -200 > "$SORTIE/../journal-app.txt" || true
echo "Plantages : $(grep -c 'FATAL EXCEPTION' "$SORTIE/../plantages.txt" || true)"

#!/usr/bin/env bash
# Dépose les résultats de la compilation (journal, captures d'écran) sur la branche « android-ci »,
# pour pouvoir les relire sans passer par l'interface de GitHub. Usage : publier-resultats.sh <dossier> <message>
set -euo pipefail
SOURCE="$1"; MESSAGE="$2"
TMP="$(mktemp -d)"
URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
for essai in 1 2 3; do
  rm -rf "$TMP/depot"
  if git clone --quiet --depth 1 --branch android-ci "$URL" "$TMP/depot" 2>/dev/null; then :; else
    mkdir -p "$TMP/depot" && git -C "$TMP/depot" init --quiet && git -C "$TMP/depot" checkout --quiet -b android-ci
    git -C "$TMP/depot" remote add origin "$URL"
    # Cette branche ne contient que des résultats : Vercel ne doit pas la mettre en ligne
    echo '{ "git": { "deploymentEnabled": false } }' > "$TMP/depot/vercel.json"
  fi
  cp -r "$SOURCE"/. "$TMP/depot/"
  git -C "$TMP/depot" add -A
  git -C "$TMP/depot" -c user.name="sundarly-ci" -c user.email="ci@sundarly.invalid" commit --quiet -m "$MESSAGE" || exit 0
  if git -C "$TMP/depot" push --quiet origin android-ci; then exit 0; fi
  sleep 5
done
exit 1

# Sundarly — application Android

Application native (Kotlin + Jetpack Compose) pour les voyageurs. Elle utilise **la même base Supabase et les mêmes fonctions serveur que le site** : rien n'est dupliqué, une annonce publiée sur le site apparaît aussitôt dans l'app.

## Ce que fait l'app
- Accueil : rangées par ville, promotions, nouveautés ; recherche par destination, dates et voyageurs ; filtres par type.
- Fiche logement : photos, description, équipements, avis, carte approximative, règlement, annulation ; partage du lien.
- Favoris (gardés sur le téléphone, comme sur le site) ; devises € / DH / CHF / $ US / $ CA / peso mexicain / real.
- **7 langues** (français, anglais, espagnol, portugais, allemand, italien, néerlandais) : langue du téléphone par défaut, choix dans Profil › Préférences.
- Compte : connexion, inscription, mot de passe oublié ; **vérification d'identité** (pièce + selfie, photo ou galerie).
- Réservation : prix calculé comme sur le site puis recalculé par la base (`/api/reserver`) ; paiement Stripe dans l'app ;
  **contrat de séjour à signer dans les 5 minutes** (même modèle que le site : `modeles/contrat-sejour.html`).
- Voyages : mes réservations et celles de mes logements, avec le contrat.
- Les liens `www.sundarly.com/logement/…` peuvent s'ouvrir dans l'app.

Côté hôte (publier, modifier une annonce, espace hôte) et dépôt d'avis : l'app ouvre le site.

## Organisation
- `app/src/main/java/com/sundarly/app/data/` : `Api.kt` (Supabase, compte, réservation), `Modeles.kt`, `Prix.kt` (devises, promotions — mêmes règles que `assets/voyageurs-commun.js`).
- `app/src/main/java/com/sundarly/app/ui/` : un fichier par groupe d'écrans (`Accueil`, `Fiche`, `Compte`, `Reservation`, `Profil`).
- Si une règle de prix ou de promotion change sur le site, la reporter dans `Prix.kt` (les tests `PrixTest.kt` vérifient les calculs). La base reste la référence au moment de payer.

## Langues
- Les textes restent écrits **en français dans le code**. `ui/Texte.kt` remplace le `Text` de Material : il traduit à l'affichage avec `data/Langue.kt`. **Ne pas importer `androidx.compose.material3.Text`** dans les écrans.
- Dictionnaires : `app/src/main/assets/langues/<langue>.json` = ceux du site (`assets/langues/` de la branche `main`) + les textes propres à l'appli. Clé = texte français exact (nombres remplacés par `#`) ; `f` = morceaux utilisés dans les phrases composées (« 3 nuits · 2 voyageurs »).
- Tout nouveau texte : l'ajouter dans les 6 fichiers, sinon il reste en français.

## Compilation
Automatique sur GitHub (`.github/workflows/android.yml`) à chaque modification du dossier `android/` :
tests, compilation, puis essai dans un téléphone virtuel avec captures d'écran (déposées sur la branche `android-ci`).

## Publication sur le Play Store (à faire avec Sandra)
1. Créer un compte Google Play Console (25 $ une fois).
2. Clé de signature : **un seul secret GitHub**, `SUNDARLY_SIGNATURE` (Settings › Secrets and variables › Actions), au format `motdepasse:clé en base64` (alias `sundarly`). La compilation l'utilise dès qu'il existe ; sans lui, l'APK est signé avec une clé d'essai qui change à chaque fois (les téléphones refusent alors la mise à jour). La clé ne va **jamais** dans le dépôt, et Sandra en garde une copie.
3. Compiler le fichier `.aab` (`./gradlew bundleRelease`) et l'envoyer dans la console.

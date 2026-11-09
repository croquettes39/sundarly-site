# Sundarly — fiche projet (à lire en premier)

Plateforme de location courte durée type Airbnb pour l'**Europe, le Maroc et la Tunisie**, créée par Sandra (propriétaire, tutoiement, toujours écrire en **français**, au féminin quand on parle d'elle). Site : https://www.sundarly.com — couleur **rose #D81B60**. Son nom personnel ne doit **jamais** apparaître sur le site (infos de la société seulement en bas des mentions légales). Contact public : info@sundarly.com.

## Accès techniques
- **Code** : GitHub `croquettes39/sundarly-site` (branche `main`). Chaque push sur `main` est mis en ligne automatiquement par Vercel.
- **Vercel** : projet `sundarly-site` (id `prj_7dSu7iOBotvwKbdeUduBbwM10ZGi`, équipe `team_6WwjR0HiwZW1xuM3FHdSSKN0`). Pour modifier les variables, il faut que Sandra approuve un lien d'accès (`authorize_team_access`).
  - Variables : `STRIPE_SECRET_KEY` (clé **restreinte live** `rk_live_…`, modèle « Paiements ponctuels »), `SUNDARLY_CLE_SERVEUR` (= valeur de `public.cles_serveur` où nom='serveur').
- **Supabase** : projet `gbdjiczesmhhsrqhvrgj` (connecteur Supabase). Admin : compte croquettes@gmx.ch (table `admins`).
- **Stripe** : compte de Sandra (nom « Atlas Aventure »). Webhook `https://www.sundarly.com/api/stripe-webhook`, événement `checkout.session.completed`, style « Instantanée/Snapshot ».
- Commits : `git -c user.name="croquettes39" -c user.email="croquettes@gmx.ch" commit …`

## Architecture
Site statique HTML/CSS/JS (pas de framework, pas de build) + fonctions serveur Vercel dans `api/` + Supabase (base, auth, stockage, pg_cron).
- `assets/style.css` unique ; **chaque modification de CSS/JS doit changer le `?v=` dans les balises** (`style.css?v=20261108c`…) des pages HTML (et `outils/generer_destinations.py`), sinon les navigateurs gardent l'ancienne version. Cache CSS/JS réglé sur `max-age=0, must-revalidate` dans `vercel.json`.
- `assets/voyageurs-commun.js` (`window.SundarlyVoyage`) : prix, devises (EUR par défaut, MAD au Maroc, CHF en Suisse), promotions, notes.
- `assets/auth.js` (`window.SundarlyAuth`) : session, profil, `exiger()`.
- Pages : accueil façon Airbnb (`index.html` + `assets/accueil.js` : recherche, rangées par ville, favoris locaux), `logements`, `logement` (fiche + réservation), `publier`, `annonce` (édition hôte), `espace-hote`, `verification`, `reservations`, `avis`, `contrat`, `admin`, pages SEO `locations-vacances/*` (générées par `outils/generer_destinations.py`).
- Statistiques maison : `assets/stats.js` → `api/visite.js` → table `visites` ; onglet Statistiques de l'admin (+ Vercel Analytics).
- Le site public est **ouvert** (`reglages.site_ouvert = 'oui'`). Réservations bloquées jusqu'au **20 novembre 2026** (sauf admin pour tester).

## Règles métier (décidées par Sandra)
- **Commission 10 %** prise à l'hôte, **sur les nuits uniquement** (pas sur le ménage ni les frais d'animaux). **0 % de frais de service pour le voyageur.**
- Offre de lancement : **0 % de commission sur les 3 premières réservations des 100 premiers hôtes** (`commission_pour`).
- Frais Stripe à la charge de Sundarly (pris sur la commission).
- **Identité obligatoire** (pièce + numéro + selfie) avant tout : pas d'espace, pas d'annonce, pas de réservation sans vérification ; mise en ligne d'une annonce et réservation seulement si identité **validée** par l'admin (règles en base).
- **Promotions** type Airbnb : nouvelle annonce -20 % (3 premières réservations), semaine, mois, anticipée, dernière minute ; la plus avantageuse s'applique, pas de cumul.
- **Frais de ménage** et **frais animaux** (par séjour) fixés par l'hôte ; caution facultative (choix de l'hôte).
- **Avis croisés** hôte ↔ voyageur, double aveugle (publiés quand les deux ont écrit ou 14 jours après le départ), contestation examinée sous 72 h (onglet admin « Avis contestés »).
- **Hôte peut annuler sans pénalité** (voyageur remboursé).
- **Contrat de séjour / règlement** (`modeles/contrat-sejour.html`, page `contrat.html`) : affiché **dès la fin du paiement** (retour Stripe), à **signer dans les 5 minutes**, sinon réservation **annulée** automatiquement (pg_cron chaque minute) puis à rembourser. La réservation n'est confirmée qu'après signature. Contient : propriétaire + adresse, voyageur + n° de pièce, engagements des deux parties, propreté, dégâts/vols, **expulsion** possible (propriétaire ou conciergerie), loi et tribunaux du pays du logement. Copie : voyageur, propriétaire et Sundarly (sur le site ; envoi e-mail pas encore fait).
- **Versements aux hôtes** : Stripe ne peut pas payer automatiquement le Maroc/la Tunisie → virements manuels depuis l'admin (onglet Paiements), 24 h après l'arrivée, IBAN de l'hôte affiché. Plus tard : Airwallex.

## Paiement (Stripe)
`api/reserver.js` → `creer_reservation` (prix recalculé en base par `devis_sejour`, dispo, identité) → Stripe Checkout (devise de l'annonce, MAD possible) → retour `contrat.html?id=…&session=…` → `api/confirmer.js` relit la session chez Stripe → `serveur_confirmer_paiement`. Webhook en secours. Remboursement : `api/rembourser.js` (admin). Les fonctions `serveur_*` exigent `SUNDARLY_CLE_SERVEUR`.

## Base de données (principales tables)
`profils` (statut_verification, numero_piece), `annonces`, `coordonnees_bancaires`, `reservations` (paiement, commission, contrat, remboursement, versement), `avis`, `visites`, `admins`, `reglages`, `cles_serveur`. Résumés des migrations dans `supabase/*.sql`. Tâches pg_cron : contrats expirés (chaque minute), réservations non payées libérées (30 min), séjours terminés.

## Reste à faire (au 9 nov. 2026)
1. **Envoi d'e-mails** (Resend + DNS chez LWS) : confirmation de réservation, copie du contrat aux 3 parties, relances d'identité, e-mails aux couleurs Sundarly (modèles dans `emails/`).
2. **Remboursement automatique** des réservations annulées (aujourd'hui bouton manuel dans l'admin) + bouton admin « Annuler une réservation » (fonction `admin_annuler_reservation` déjà en base).
3. Test complet d'un vrai paiement → contrat → signature → remboursement.
4. Version anglaise du contrat ; relecture juridique conseillée (avocat au Maroc).
5. Faire tourner la clé Stripe (elle a été collée dans une conversation) et la remettre dans Vercel.
6. Favoris liés au compte ; messagerie avec traduction automatique (souhait de Sandra).

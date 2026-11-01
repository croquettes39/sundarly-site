# Sundarly — site de lancement

Site codé sur mesure par WebOrion : page voyageurs avec liste d'attente, page propriétaires avec formulaire d'inscription, mentions légales et confidentialité. Les inscriptions sont enregistrées dans Supabase ; le site est hébergé sur Vercel.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil voyageurs + liste d'attente |
| `hotes.html` | Page propriétaires : comparatif, avantages, inscription, FAQ |
| `mentions-legales.html`, `confidentialite.html` | Pages légales (champs surlignés en jaune à compléter) |
| `assets/style.css` | Design (couleur rose `#D81B60`) |
| `assets/app.js` | Envoi des formulaires vers Supabase |
| `assets/config.js` | **Les 2 clés Supabase à coller** |
| `supabase/schema.sql` | Création des tables et des règles de sécurité |
| `vercel.json` | Adresses propres (`/hotes` au lieu de `/hotes.html`) |

## Mise en ligne (environ 20 minutes)

### 1. Supabase (la base de données)
1. Créez un compte sur supabase.com, puis **New project**, nommé `sundarly`. Choisissez une région en **Europe** (ex. Frankfurt) et notez le mot de passe de la base.
2. Ouvrez **SQL Editor > New query**, collez tout le contenu de `supabase/schema.sql` et cliquez **Run**. Deux tables apparaissent : `liste_attente` et `hotes`.
3. Allez dans **Project Settings > API** (ou **Data API**) et copiez :
   - **Project URL**
   - la clé **anon public**
4. ✅ Déjà fait : les 2 valeurs sont dans `assets/config.js` (pour référence, le format est) :
   ```js
   SUPABASE_URL: "https://xxxxx.supabase.co",
   SUPABASE_ANON_KEY: "eyJ..."
   ```
   ⚠️ Ne mettez jamais la clé **service_role** dans le site.

### 2. Vercel (l'hébergement)
1. Sur vercel.com : **Add New > Project**.
2. Le plus simple : mettez le dossier `sundarly-site` sur GitHub et importez-le. Sinon, avec l'outil en ligne de commande : `npx vercel` dans le dossier.
3. Aucun réglage à faire (pas de « build ») : c'est un site statique.
4. Dans **Settings > Domains**, ajoutez votre nom de domaine (ex. `sundarly.com`, après avoir vérifié qu'il est libre).

### 3. Vérifier
- Envoyez une inscription test sur chaque page.
- Dans Supabase > **Table Editor**, la ligne doit apparaître.
- La colonne `statut` des hôtes vous sert de suivi : `nouveau`, `contacté`, `annonce prête`…

## Sécurité
- Le public peut seulement **ajouter** une inscription : impossible de lire, modifier ou supprimer les données depuis le site.
- Un e-mail ne peut s'inscrire qu'une fois (message « déjà inscrit » sinon).
- Un champ invisible piège les robots de spam.

## Avant d'ouvrir au public
- Compléter les champs jaunes des pages légales (raison sociale, adresse, e-mail de contact, numéro d'entreprise).
- Vérifier la marque « Sundarly » auprès de l'EUIPO et la disponibilité du domaine.
- Vérifier le taux de commission Airbnb cité dans le comparatif (page officielle des frais Airbnb) avant chaque campagne.

## Étape suivante : la plateforme complète
Comptes hôtes et voyageurs, annonces, recherche, réservations, messagerie et paiements **Stripe Connect** (10 % pour Sundarly, 90 % versés à l'hôte) — sur la même base Supabase et le même hébergement Vercel. Il faudra un compte Stripe dédié à Sundarly (pas le compte Atlas Aventure).

**Hôtes au Maroc et en Tunisie :** à ma connaissance, Stripe ne verse pas d'argent sur des comptes bancaires marocains ou tunisiens (à vérifier dans la liste des pays de Stripe Connect). Pour ces hôtes, il faudra prévoir un autre mode de versement : compte en euros à l'étranger, virement international, ou paiement du solde à l'arrivée (seuls les 10 % encaissés en ligne).

## Mise à jour : publication des annonces
1. Supabase > **SQL Editor** > **New query** : collez `supabase/annonces.sql` puis **Run** (une seule fois).
   Cela crée les tables `annonces` et `coordonnees_bancaires` et le dossier de photos `photos-annonces`.
2. Vercel : ouvrez le projet `sundarly-site` (page **Aperçu**) et glissez-y le dossier mis à jour pour redéployer.
3. Les annonces reçues arrivent dans Supabase > Table Editor > `annonces` (statut `en_attente`).
   Passez le statut à `en_ligne` quand vous l'avez validée. Les photos sont dans Storage > `photos-annonces`.

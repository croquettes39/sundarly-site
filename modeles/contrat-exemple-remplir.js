const { chromium } = require('playwright'); const fs = require('fs');
const V = {
  REFERENCE: 'SUN-2026-00148', DATE_EMISSION: '20 novembre 2026',
  BANDEAU_MODELE: '<p class="modele"><strong>MODÈLE</strong> — exemple rempli avec des données fictives. Sur le site, chaque contrat est rempli automatiquement avec les vraies informations de la réservation.</p>',
  HOTE_NOM: 'Karim BENALI', ADRESSE: '12 derb Exemple, Médina, 40000 Marrakech, Maroc', LOGEMENT: 'Riad entier · 3 chambres',
  VOYAGEUR_NOM: 'Julie MOREAU', PIECE_TYPE: "Carte d'identité", PIECE_NUMERO: 'AB 1234567',
  ARRIVEE: 'ven. 12 déc. 2026', DEPART: 'mar. 16 déc. 2026', NB_VOYAGEURS: '2 adultes', TOTAL: '628 €',
  HEURE_ARRIVEE: '15:00', HEURE_DEPART: '11:00',
  REGLE_ANIMAUX: 'Animaux acceptés (frais : 20 € par séjour)', REGLE_FUMEURS: 'Logement non-fumeur (y compris sur la terrasse)', REGLE_FETES: 'Pas de fêtes ni d\'événements',
  REGLES_HOTE: '<p><strong>Règles ajoutées par le propriétaire :</strong> silence après 22 h · merci de retirer vos chaussures à l\'intérieur · la piscine n\'est pas surveillée, les enfants doivent y être accompagnés.</p>',
  // Caution : seulement si l'hôte en a fixé une dans son annonce (ici : aucune)
  CAUTION: '',
  ANNULATION: 'Modérée — remboursement intégral jusqu\'à 5 jours avant l\'arrivée', PAYS: 'Maroc',
  DATE_ACCEPTATION: '20 nov. 2026 à 14:32', PREUVE: 'Compte vérifié · réf. 7F3A-91C2'
};
let h = fs.readFileSync('contrat.html', 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => V[k] ?? m);
fs.writeFileSync('exemple.html', h);
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/exemple.html'); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: 'Contrat-sejour-Sundarly-modele.pdf', format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' } });
  await b.close(); })();

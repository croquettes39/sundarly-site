package com.sundarly.app.ui

import android.content.Intent
import android.graphics.Paint
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import coil3.compose.AsyncImage
import com.sundarly.app.data.Annonce
import com.sundarly.app.data.Api
import com.sundarly.app.data.AvisLogement
import com.sundarly.app.data.ErreurSundarly
import com.sundarly.app.data.Prix
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.CustomZoomButtonsController
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Polygon

private val ANNULATION = mapOf(
    "souple" to ("Souple" to "Annulation gratuite jusqu'à 24 h avant l'arrivée : remboursement intégral."),
    "moderee" to ("Modérée" to "Annulation gratuite jusqu'à 5 jours avant l'arrivée : remboursement intégral."),
    "stricte" to ("Stricte" to "Remboursement de 50 % jusqu'à 7 jours avant l'arrivée, aucun remboursement ensuite."),
)
private val TYPES_ESPACE = mapOf("logement_entier" to "Logement entier", "chambre_privee" to "Chambre privée", "chambre_partagee" to "Chambre partagée")
private val CRITERES = listOf("proprete" to "Propreté", "exactitude" to "Précision", "communication" to "Communication", "emplacement" to "Emplacement", "arrivee" to "Arrivée", "qualite_prix" to "Qualité-prix")
private val SECURITE = Regex("Détecteur|Extincteur|premiers secours|Caméras")

/** Fiche d'un logement : photos, description, équipements, avis, carte, règles et réservation. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun EcranFiche(etat: Etat, ecran: Ecran.Fiche) {
    // On affiche tout de suite ce que l'on sait déjà (catalogue), puis la fiche complète
    var a by remember { mutableStateOf(etat.catalogue.firstOrNull { it.id == ecran.id || (ecran.slug != null && it.slug == ecran.slug) }) }
    var complet by remember { mutableStateOf(false) }
    var introuvable by remember { mutableStateOf(false) }
    var erreur by remember { mutableStateOf<String?>(null) }
    var avis by remember { mutableStateOf<AvisLogement?>(null) }
    var essai by remember { mutableStateOf(0) }
    var reservation by rememberSaveable { mutableStateOf(false) }
    val contexte = LocalContext.current

    LaunchedEffect(ecran, essai) {
        erreur = null
        try {
            val id = ecran.id ?: ecran.slug?.let { Api.idParSlug(it) }
            val f = id?.let { Api.fiche(it) }
            if (f == null) introuvable = true else { a = f; complet = true; avis = runCatching { Api.avis(f.id) }.getOrNull() }
        } catch (e: ErreurSundarly) { erreur = e.message } catch (e: Exception) { erreur = "Impossible de charger ce logement pour le moment." }
    }

    val annonce = a
    if (annonce == null) {
        Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
            BoutonRetour({ etat.retour() }, Modifier.padding(12.dp))
            when {
                introuvable -> Message("Ce logement n'est plus disponible", "Il a peut-être été retiré par son hôte.", "Voir les logements") { etat.accueil(Onglet.Explorer) }
                erreur != null -> Message("Oups…", erreur, "Réessayer") { essai++ }
                else -> Chargement()
            }
        }
        return
    }

    val r = etat.recherche
    val n = Prix.nuits(r.arrivee, r.depart)
    val photos = annonce.photos
    Scaffold(
        containerColor = Color.White, contentWindowInsets = WindowInsets(0),
        bottomBar = {
            Column(Modifier.background(Color.White)) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(Ligne))
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.Bottom) {
                            if (n > 0) {
                                Text(etat.prix(Prix.sejour(annonce, n, r.arrivee, false).total, annonce.devise), style = MaterialTheme.typography.titleLarge)
                                Text(" pour ${Prix.pluriel(n, "nuit", "nuits")}", style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
                            } else {
                                Text(etat.prix(annonce.prixNuit, annonce.devise), style = MaterialTheme.typography.titleLarge)
                                Text(" par nuit", style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
                            }
                        }
                        Text("Aucun frais de service", style = MaterialTheme.typography.bodySmall, color = Vert)
                    }
                    BoutonRose("Réserver") { reservation = true }
                }
            }
        },
    ) { marges ->
        val defilement = rememberScrollState()
        Box(Modifier.padding(marges).fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(defilement)) {
            // ----- Photos -----
            Box(Modifier.fillMaxWidth().aspectRatio(1.2f)) {
                if (photos.isNotEmpty()) {
                    val pager = rememberPagerState { photos.size }
                    HorizontalPager(pager, Modifier.fillMaxSize()) { i ->
                        Photo(photos[i], Modifier.fillMaxSize().clickable { etat.ouvrir(Ecran.Galerie(photos, i)) }, "Photo ${i + 1}")
                    }
                    Surface(color = Color.Black.copy(alpha = 0.6f), shape = CircleShape, modifier = Modifier.align(Alignment.BottomEnd).padding(14.dp)) {
                        Text("${pager.currentPage + 1} / ${photos.size}", color = Color.White, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                    }
                } else Box(Modifier.fillMaxSize().background(RoseClair))
                Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    BoutonRetour({ etat.retour() })
                    Spacer(Modifier.weight(1f))
                    BoutonRond({
                        val lien = Api.SITE + "/logement" + (annonce.slug?.let { "/$it" } ?: "?id=${annonce.id}")
                        val envoi = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "${annonce.titre} – $lien")
                        runCatching { contexte.startActivity(Intent.createChooser(envoi, "Partager ce logement")) }
                    }, "Partager") { Icon(Icons.Filled.Share, contentDescription = "Partager", tint = Encre, modifier = Modifier.size(19.dp)) }
                    Spacer(Modifier.width(10.dp))
                    BoutonRond({ etat.basculerFavori(annonce.id) }, "Favori") {
                        Icon(
                            if (annonce.id in etat.favoris) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = if (annonce.id in etat.favoris) "Retirer des favoris" else "Ajouter aux favoris",
                            tint = if (annonce.id in etat.favoris) Rose else Encre, modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }

            Column(Modifier.padding(horizontal = 20.dp)) {
                Spacer(Modifier.height(18.dp))
                if (etat.admin && annonce.statut != "en_ligne" && annonce.statut.isNotEmpty()) {
                    Bandeau(if (annonce.statut == "validee") "Validée — pas encore en ligne pour les visiteurs" else "En attente de validation — visible seulement par vous", JauneFond, Jaune)
                    Spacer(Modifier.height(12.dp))
                }
                Text(annonce.titre, style = MaterialTheme.typography.headlineMedium)
                Spacer(Modifier.height(6.dp))
                val nbAvis = avis?.nombre ?: annonce.nbAvis
                val moyenne = avis?.moyenne ?: annonce.noteMoyenne
                Text(
                    "${Prix.nomVille(annonce.ville)}, ${annonce.pays}" + (if (annonce.hoteVerifie) " · Hôte vérifié" else "") + " · " +
                        (if (nbAvis > 0 && moyenne != null) "★ ${Prix.decimal(moyenne, 2)} · ${Prix.pluriel(nbAvis, "avis", "avis")}" else "★ Nouveau"),
                    style = MaterialTheme.typography.bodyMedium, color = GrisTexte,
                )

                Separateur()
                Text(listOfNotNull(TYPES_ESPACE[annonce.typeEspace], annonce.typeLogement.ifBlank { null }, Prix.nomVille(annonce.ville)).joinToString(" · "), style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(4.dp))
                Text(
                    listOf(Prix.pluriel(annonce.voyageurs, "voyageur", "voyageurs"), Prix.pluriel(annonce.chambres, "chambre", "chambres"), Prix.pluriel(annonce.lits, "lit", "lits"), Prix.pluriel(annonce.sallesDeBain, "salle de bain", "salles de bain")).joinToString(" · "),
                    style = MaterialTheme.typography.bodyMedium, color = GrisTexte,
                )

                Separateur()
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(annonce.hotePrenom ?: "H")
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("Hôte : ${annonce.hotePrenom.orEmpty()}", style = MaterialTheme.typography.titleMedium)
                        val depuis = Prix.moisAnnee(annonce.hoteDepuis)
                        val ligne = listOfNotNull("Identité vérifiée par Sundarly".takeIf { annonce.hoteVerifie }, "Sur Sundarly depuis $depuis".takeIf { depuis.isNotEmpty() }).joinToString(" · ")
                        if (ligne.isNotEmpty()) Text(ligne, style = MaterialTheme.typography.bodySmall, color = Gris)
                    }
                }

                Separateur()
                val annul = ANNULATION[annonce.annulation]
                Atout("Aucun frais caché", "Le prix affiché est le prix que vous payez : pas de frais de service.")
                if (annul != null) Atout("Annulation ${annul.first.lowercase()}", annul.second)
                Atout("Paiement sécurisé", "Vous payez sur Sundarly ; l'hôte est payé après votre arrivée.", dernier = true)

                if (!complet) { Separateur(); Chargement() } else {
                    if (!annonce.description.isNullOrBlank()) { Separateur(); Text(annonce.description, style = MaterialTheme.typography.bodyLarge, color = GrisTexte) }
                    BlocTexte("Le logement", annonce.monLogement)
                    BlocTexte("Accès des voyageurs", annonce.accesVoyageurs)
                    BlocTexte("Échanges avec l'hôte", annonce.echangesVoyageurs)
                    BlocTexte("Autres informations à noter", annonce.autresInfos)
                    BlocListe("Ce que propose ce logement", annonce.equipements.filterNot { SECURITE.containsMatchIn(it) })
                    BlocListe("Accessibilité", annonce.accessibilite)

                    // ----- Avis -----
                    Separateur()
                    val av = avis
                    if (av == null || av.nombre == 0) {
                        TitreSection("★ Nouveau sur Sundarly")
                        Spacer(Modifier.height(6.dp))
                        Text("Ce logement n'a pas encore d'avis. Les avis sont laissés uniquement par des voyageurs qui ont vraiment séjourné ici, après leur séjour.", style = MaterialTheme.typography.bodyMedium, color = Gris)
                    } else {
                        TitreSection("★ ${Prix.decimal(av.moyenne ?: 0.0, 2)} · ${Prix.pluriel(av.nombre, "avis", "avis")}")
                        Spacer(Modifier.height(10.dp))
                        CRITERES.forEach { (cle, nom) ->
                            val v = av.criteres[cle]
                            if (v != null) Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(nom, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(130.dp))
                                Box(Modifier.weight(1f).height(5.dp).clip(CircleShape).background(Ligne)) { Box(Modifier.fillMaxWidth((v / 5).toFloat().coerceIn(0f, 1f)).height(5.dp).background(Encre)) }
                                Text(Prix.decimal(v, 1), style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(start = 10.dp))
                            }
                        }
                        av.liste.forEach { x ->
                            Spacer(Modifier.height(18.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Avatar(x.prenom ?: "V", 40)
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text(x.prenom ?: "Voyageur", style = MaterialTheme.typography.titleSmall)
                                    Text(Prix.moisAnnee(x.date), style = MaterialTheme.typography.bodySmall, color = Gris)
                                }
                            }
                            Text("★★★★★".take(x.note.coerceIn(0, 5)) + "☆☆☆☆☆".take(5 - x.note.coerceIn(0, 5)), color = Encre, modifier = Modifier.padding(top = 6.dp))
                            if (!x.commentaire.isNullOrBlank()) Text(x.commentaire, style = MaterialTheme.typography.bodyMedium, color = GrisTexte, modifier = Modifier.padding(top = 4.dp))
                            if (!x.reponse.isNullOrBlank()) Surface(color = RosePale, shape = RoundedCornerShape(12.dp), modifier = Modifier.padding(top = 8.dp).fillMaxWidth()) {
                                Column(Modifier.padding(12.dp)) {
                                    Text("Réponse de l'hôte", style = MaterialTheme.typography.titleSmall)
                                    Text(x.reponse, style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
                                }
                            }
                        }
                        Text("Avis vérifiés : seuls les voyageurs ayant séjourné dans le logement peuvent en laisser un.", style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 14.dp))
                    }

                    // ----- Carte approximative -----
                    Separateur()
                    TitreSection("Où se situe le logement")
                    Text("${Prix.nomVille(annonce.ville)}, ${annonce.pays}", style = MaterialTheme.typography.bodyMedium, color = GrisTexte, modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))
                    if (annonce.latitude != null && annonce.longitude != null) CarteApproximative(annonce.latitude, annonce.longitude)
                    Text("Pour la sécurité de l'hôte, la zone affichée est approximative. L'adresse exacte vous est communiquée après la réservation.", style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 10.dp))

                    // ----- Règlement, sécurité, annulation -----
                    val regles = buildList {
                        Prix.heure(annonce.heureArrivee)?.let { add("Arrivée à partir de $it") }
                        Prix.heure(annonce.heureDepart)?.let { add("Départ avant $it") }
                        add("Jusqu'à " + Prix.pluriel(annonce.voyageurs, "voyageur", "voyageurs"))
                        add(if (annonce.animaux) "Animaux acceptés" + (if (annonce.fraisAnimaux > 0) " (frais : ${etat.prix(annonce.fraisAnimaux, annonce.devise)} par séjour)" else ", sans frais") else "Animaux non acceptés")
                        add(if (annonce.fumeurs) "Logement fumeur" else "Non-fumeur")
                        add(if (annonce.fetes) "Fêtes autorisées" else "Pas de fêtes ni d'événements")
                        fun duree(mi: Int?, ma: Int?): String { val m = mi ?: 1; return if (ma != null) "de $m à $ma nuits" else Prix.pluriel(m, "nuit", "nuits") + " minimum" }
                        if (annonce.nuitsMinEte != null || annonce.nuitsMaxEte != null) {
                            add("Séjour ${duree(annonce.nuitsMin, annonce.nuitsMax)} (automne, hiver et printemps)")
                            add("Séjour ${duree(annonce.nuitsMinEte ?: annonce.nuitsMin, annonce.nuitsMaxEte ?: annonce.nuitsMax)} en été (arrivée de juin à août)")
                        } else if ((annonce.nuitsMin ?: 1) > 1 || annonce.nuitsMax != null) add("Séjour ${duree(annonce.nuitsMin, annonce.nuitsMax)}")
                    }
                    val secu = buildList {
                        addAll(annonce.securite)
                        annonce.equipements.forEach { if (SECURITE.containsMatchIn(it) && it !in this) add(it) }
                        if (none { "monoxyde" in it }) add("Aucune indication de la présence d'un détecteur de monoxyde de carbone")
                        if (none { "fumée" in it }) add("Aucune indication de la présence d'un détecteur de fumée")
                    }
                    BlocListe("Règlement intérieur", regles, coches = false)
                    if (!annonce.reglement.isNullOrBlank()) Text(annonce.reglement, style = MaterialTheme.typography.bodyMedium, color = GrisTexte, modifier = Modifier.padding(top = 8.dp))
                    BlocListe("Sécurité et logement", secu, coches = false)
                    if (annul != null) {
                        Separateur()
                        TitreSection("Conditions d'annulation")
                        Text(annul.first, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 8.dp))
                        Text(annul.second, style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
                        if (annonce.caution > 0) Text("Caution : ${etat.prix(annonce.caution, annonce.devise)}", style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 6.dp))
                    }
                }
                Spacer(Modifier.height(28.dp))
            }
        }
        // Une fois la photo passée, un fond blanc garde l'heure et la batterie lisibles
        if (defilement.value > 500) Box(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(Color.White))
        }
    }

    if (reservation) PanneauReservation(etat, annonce, complet) { reservation = false }
}

@Composable
private fun Separateur() {
    Box(Modifier.padding(vertical = 20.dp).fillMaxWidth().height(1.dp).background(Ligne))
}

@Composable
fun Avatar(nom: String, taille: Int = 48) {
    Box(Modifier.size(taille.dp).clip(CircleShape).background(Encre), contentAlignment = Alignment.Center) {
        Text(nom.trim().take(1).uppercase().ifEmpty { "S" }, color = Color.White, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun Atout(titre: String, texte: String, dernier: Boolean = false) {
    Column(Modifier.padding(bottom = if (dernier) 0.dp else 14.dp)) {
        Text(titre, style = MaterialTheme.typography.titleSmall)
        Text(texte, style = MaterialTheme.typography.bodyMedium, color = Gris)
    }
}

@Composable
private fun BlocTexte(titre: String, texte: String?) {
    if (texte.isNullOrBlank()) return
    Separateur()
    TitreSection(titre)
    Text(texte, style = MaterialTheme.typography.bodyLarge, color = GrisTexte, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun BlocListe(titre: String, elements: List<String>, coches: Boolean = true) {
    if (elements.isEmpty()) return
    Separateur()
    TitreSection(titre)
    Spacer(Modifier.height(6.dp))
    elements.forEach { e ->
        Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.Top) {
            if (coches) Icon(Icons.Filled.Check, contentDescription = null, tint = Rose, modifier = Modifier.padding(top = 2.dp).size(18.dp))
            else Box(Modifier.padding(top = 9.dp, start = 4.dp, end = 4.dp).size(5.dp).clip(CircleShape).background(Encre))
            Spacer(Modifier.width(10.dp))
            Text(e, style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
        }
    }
}

/** Carte OpenStreetMap avec un cercle d'environ 900 m : la position exacte reste cachée. */
@Composable
private fun CarteApproximative(latitude: Double, longitude: Double) {
    Box(Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(18.dp)).background(RoseClair)) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                MapView(ctx).apply {
                    val centre = GeoPoint(latitude, longitude)
                    setMultiTouchControls(false)
                    zoomController.setVisibility(CustomZoomButtonsController.Visibility.NEVER)
                    controller.setZoom(13.0)
                    controller.setCenter(centre)
                    overlays.add(Polygon(this).apply {
                        setPoints(Polygon.pointsAsCircle(centre, 900.0))
                        fillPaint.color = Rose.copy(alpha = 0.15f).toArgb()
                        outlinePaint.color = Rose.toArgb()
                        outlinePaint.strokeWidth = 4f
                        outlinePaint.style = Paint.Style.STROKE
                    })
                }
            },
            onRelease = { it.onDetach() },
        )
        // La carte est une simple image : les gestes servent à faire défiler la page
        Box(Modifier.matchParentSize().pointerInput(Unit) {})
        Text("© OpenStreetMap", style = MaterialTheme.typography.labelSmall, color = Encre, modifier = Modifier.align(Alignment.BottomEnd).background(Color.White.copy(alpha = 0.8f)).padding(horizontal = 6.dp, vertical = 2.dp))
    }
}

/** Panneau de réservation : dates, voyageurs, animal, détail du prix, puis paiement. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PanneauReservation(etat: Etat, a: Annonce, complet: Boolean, onFermer: () -> Unit) {
    val r = etat.recherche
    var animal by rememberSaveable { mutableStateOf(false) }
    var dates by remember { mutableStateOf(false) }
    var occupe by remember { mutableStateOf(false) }
    var erreurPaiement by remember { mutableStateOf<String?>(null) }
    val portee = rememberCoroutineScope()
    val voyageurs = r.voyageurs.coerceIn(1, a.voyageurs.coerceAtLeast(1))
    val n = Prix.nuits(r.arrivee, r.depart)

    // Mêmes contrôles que le site ; la base revérifie tout au moment de réserver
    val ete = n > 0 && (a.nuitsMinEte != null || a.nuitsMaxEte != null) && r.arrivee != null && r.arrivee.monthValue in 6..8
    val nMin = if (ete) a.nuitsMinEte ?: a.nuitsMin ?: 1 else a.nuitsMin ?: 1
    val nMax = if (ete) a.nuitsMaxEte ?: a.nuitsMax else a.nuitsMax
    val quand = if (ete) " en été (arrivée de juin à août)" else ""
    val erreur = when {
        r.voyageurs > a.voyageurs -> "Ce logement accueille ${Prix.pluriel(a.voyageurs, "voyageur", "voyageurs")} maximum."
        n in 1 until nMin -> "Ce logement se loue ${Prix.pluriel(nMin, "nuit", "nuits")} minimum$quand."
        n > 0 && nMax != null && n > nMax -> "Ce logement se loue $nMax nuits maximum$quand."
        else -> null
    }
    val c = if (n > 0) Prix.sejour(a, n, r.arrivee, animal) else null
    val promos = buildList {
        if (a.promoNouvelle) add("-20 % : promotion nouvelle annonce")
        if (a.reductionSemaine > 0) add("-${a.reductionSemaine} % dès 7 nuits")
        if (a.reductionMois > 0) add("-${a.reductionMois} % dès 28 nuits")
        if (a.reductionAnticipee > 0) add("-${a.reductionAnticipee} % en réservant ${if (a.anticipeeJours >= 365) "1 an" else "${Math.round(a.anticipeeJours / 30.0)} mois"} à l'avance")
        if (a.reductionDerniereMinute > 0) add("-${a.reductionDerniereMinute} % pour une arrivée dans moins de ${Prix.pluriel(a.derniereMinuteJours, "jour", "jours")}")
    }

    fun reserver() {
        portee.launch {
            occupe = true; erreurPaiement = null
            try {
                if (!etat.connecte) { etat.ouvrir(Ecran.Compte); return@launch }
                val p = etat.rafraichirCompte()
                if (p == null) { etat.ouvrir(Ecran.Compte); return@launch }
                if (p.statutVerification != "verifie" && !etat.admin) { etat.ouvrir(Ecran.Verification); return@launch }
                val url = Api.reserver(a.id, r.arrivee.toString(), r.depart.toString(), voyageurs, animal && a.animaux)
                etat.ouvrir(Ecran.Paiement(url))
            } catch (e: ErreurSundarly) {
                erreurPaiement = e.message
            } catch (e: Exception) {
                erreurPaiement = "La réservation n'a pas pu être créée. Réessayez."
            } finally { occupe = false }
        }
    }

    ModalBottomSheet(onDismissRequest = onFermer, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Color.White) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 20.dp).navigationBarsPadding()) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(etat.prix(a.prixNuit, a.devise), style = MaterialTheme.typography.headlineSmall)
                Text(" par nuit", style = MaterialTheme.typography.bodyMedium, color = GrisTexte, modifier = Modifier.padding(bottom = 2.dp))
            }
            if (promos.isNotEmpty()) {
                Surface(color = RoseClair, shape = RoundedCornerShape(14.dp), modifier = Modifier.padding(top = 12.dp).fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text("🎁 Promotions", style = MaterialTheme.typography.titleSmall)
                        promos.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, color = GrisTexte) }
                        Text("La meilleure s'applique automatiquement.", style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CaseDate("Arrivée", r.arrivee, Modifier.weight(1f)) { dates = true }
                CaseDate("Départ", r.depart, Modifier.weight(1f)) { dates = true }
            }
            Spacer(Modifier.height(12.dp))
            Compteur("Voyageurs", Prix.pluriel(voyageurs, "voyageur", "voyageurs"), voyageurs > 1, voyageurs < a.voyageurs, { etat.recherche = r.copy(voyageurs = voyageurs - 1) }, { etat.recherche = r.copy(voyageurs = voyageurs + 1) })
            Spacer(Modifier.height(8.dp))
            if (a.animaux) {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable { animal = !animal }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = animal, onCheckedChange = { animal = it }, colors = CheckboxDefaults.colors(checkedColor = Rose))
                    Text("Je viens avec un animal" + if (a.fraisAnimaux > 0) " (+${etat.prix(a.fraisAnimaux, a.devise)})" else " (gratuit)", style = MaterialTheme.typography.bodyMedium)
                }
            } else if (complet) Text("🐾 Animaux non acceptés", style = MaterialTheme.typography.bodyMedium, color = Gris, modifier = Modifier.padding(vertical = 8.dp))

            if (c != null && erreur == null) {
                Spacer(Modifier.height(10.dp))
                LignePrix("${etat.prix(a.prixNuit, a.devise)} × ${Prix.pluriel(n, "nuit", "nuits")}", etat.prix(c.base, a.devise))
                if (c.reduction > 0) LignePrix(c.libelleReduction, "-" + etat.prix(c.reduction, a.devise), couleur = Vert)
                if (c.menage > 0) LignePrix("Frais de ménage", etat.prix(c.menage, a.devise))
                if (c.animaux > 0) LignePrix("Frais pour l'animal", etat.prix(c.animaux, a.devise))
                LignePrix("Frais de service Sundarly", etat.prix(0.0, a.devise), couleur = Vert)
                Box(Modifier.padding(vertical = 8.dp).fillMaxWidth().height(1.dp).background(Ligne))
                LignePrix("Total", etat.prix(c.total, a.devise), gras = true)
                if (a.devise != etat.devise) Text("Prix fixé par l'hôte en ${a.devise} ; conversion indicative. Vous payez ${Prix.exact(c.total, a.devise)}.", style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 6.dp))
            }
            if (erreur != null) Bandeau(erreur, RougeFond, Rouge, Modifier.padding(top = 12.dp))
            if (erreurPaiement != null) Bandeau(erreurPaiement!!, RougeFond, Rouge, Modifier.padding(top = 12.dp))
            Spacer(Modifier.height(16.dp))
            BoutonRose(if (n > 0) "Réserver" else "Choisissez vos dates", Modifier.fillMaxWidth(), actif = erreur == null, occupe = occupe) {
                if (n > 0) reserver() else dates = true
            }
            Text("🔒 Identité vérifiée obligatoire pour réserver · paiement sécurisé", style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 10.dp))
        }
    }
    if (dates) ChoixDates(r.arrivee, r.depart, onFermer = { dates = false }) { arr, dep -> etat.recherche = etat.recherche.copy(arrivee = arr, depart = dep); dates = false }
}

@Composable
private fun LignePrix(libelle: String, montant: String, gras: Boolean = false, couleur: Color = Encre) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        val style = if (gras) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium
        Text(libelle, style = style, color = couleur, modifier = Modifier.weight(1f).padding(end = 12.dp))
        Text(montant, style = style, color = couleur, fontWeight = if (gras) FontWeight.Bold else FontWeight.Medium)
    }
}

/** Toutes les photos, les unes sous les autres. */
@Composable
fun EcranGalerie(etat: Etat, ecran: Ecran.Galerie) {
    val liste = rememberLazyListState(initialFirstVisibleItemIndex = ecran.depart.coerceIn(0, (ecran.photos.size - 1).coerceAtLeast(0)))
    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { etat.retour() }) { Icon(Icons.Filled.Close, contentDescription = "Fermer") }
            Text(Prix.pluriel(ecran.photos.size, "photo", "photos"), style = MaterialTheme.typography.titleMedium)
        }
        LazyColumn(state = liste, contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.navigationBarsPadding()) {
            itemsIndexed(ecran.photos) { i, u ->
                AsyncImage(model = u, contentDescription = "Photo ${i + 1}", contentScale = ContentScale.FillWidth, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(RoseClair))
            }
        }
    }
}

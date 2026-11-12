package com.sundarly.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.sundarly.app.R
import com.sundarly.app.data.Annonce
import com.sundarly.app.data.Api
import com.sundarly.app.data.Prix
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/** Les quatre onglets du bas : Explorer, Favoris, Voyages, Profil. */
@Composable
fun EcranOnglets(etat: Etat) {
    Scaffold(
        containerColor = Color.White,
        bottomBar = {
            Column {
                Box(Modifier.fillMaxWidth().height(1.dp).background(Ligne))
                NavigationBar(containerColor = Color.White, tonalElevation = 0.dp) {
                    Onglet.entries.forEach { o ->
                        NavigationBarItem(
                            selected = etat.onglet == o, onClick = { etat.onglet = o },
                            icon = {
                                Icon(
                                    when (o) { Onglet.Explorer -> Icons.Filled.Search; Onglet.Favoris -> Icons.Filled.FavoriteBorder; Onglet.Voyages -> Icons.Filled.DateRange; Onglet.Profil -> Icons.Filled.Person },
                                    contentDescription = null,
                                )
                            },
                            label = { Text(o.titre, style = MaterialTheme.typography.labelSmall) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Rose, selectedTextColor = Rose, indicatorColor = RoseClair, unselectedIconColor = Gris, unselectedTextColor = Gris),
                        )
                    }
                }
            }
        },
    ) { marges ->
        Box(Modifier.padding(marges).fillMaxSize()) {
            when (etat.onglet) {
                Onglet.Explorer -> OngletExplorer(etat)
                Onglet.Favoris -> OngletFavoris(etat)
                Onglet.Voyages -> OngletVoyages(etat)
                Onglet.Profil -> OngletProfil(etat)
            }
        }
    }
}

@Composable
fun LogoSundarly(taille: Int = 26) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(painterResource(R.drawable.logo_sundarly), contentDescription = null, modifier = Modifier.size((taille + 6).dp))
        Spacer(Modifier.width(8.dp))
        Text("sundarly", color = Rose, fontFamily = Jakarta, fontWeight = FontWeight.ExtraBold, fontSize = taille.sp, letterSpacing = (-0.5).sp)
    }
}

@Composable
fun ChoixDevise(etat: Etat) {
    var ouvert by remember { mutableStateOf(false) }
    Box {
        Surface(onClick = { ouvert = true }, shape = CircleShape, color = Color.White, border = androidx.compose.foundation.BorderStroke(1.dp, Bord)) {
            Text(Prix.NOMS_DEVISES[etat.devise] ?: etat.devise, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
        }
        DropdownMenu(ouvert, onDismissRequest = { ouvert = false }, containerColor = Color.White) {
            Prix.DEVISES.forEach { d ->
                DropdownMenuItem(text = { Text(Prix.NOMS_DEVISES[d] ?: d, fontWeight = if (d == etat.devise) FontWeight.Bold else FontWeight.Normal) }, onClick = { etat.choisirDevise(d); ouvert = false })
            }
        }
    }
}

/** Barre de recherche arrondie : résume la recherche en cours et ouvre le panneau de recherche. */
@Composable
fun BarreRecherche(etat: Etat, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val r = etat.recherche
    val details = buildList {
        if (r.arrivee != null && r.depart != null) add("${Prix.jourCourt(r.arrivee)} – ${Prix.jourCourt(r.depart)}") else add("Quand ?")
        add(if (r.voyageurs > 0) Prix.pluriel(r.voyageurs, "voyageur", "voyageurs") else "Voyageurs")
    }.joinToString(" · ")
    Surface(
        onClick = onClick, shape = CircleShape, color = Color.White, border = androidx.compose.foundation.BorderStroke(1.dp, Ligne),
        modifier = modifier.fillMaxWidth().shadow(8.dp, CircleShape, ambientColor = Rose.copy(alpha = 0.25f), spotColor = Rose.copy(alpha = 0.25f)),
    ) {
        Row(Modifier.padding(horizontal = 18.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Search, contentDescription = null, tint = Rose, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(r.q.ifBlank { "Où allez-vous ?" }, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(details, style = MaterialTheme.typography.bodySmall, color = Gris, maxLines = 1)
            }
        }
    }
}

@Composable
fun OngletExplorer(etat: Etat) {
    var panneau by remember { mutableStateOf(false) }
    val liens = LocalUriHandler.current
    val liste = etat.catalogue
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                LogoSundarly()
                ChoixDevise(etat)
            }
            Text("La location courte durée autrement.", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp))
            Text("Villas, riads, appartements… Aucun frais de service : le prix affiché est le prix que vous payez.", style = MaterialTheme.typography.bodyMedium, color = GrisTexte, modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp))
            BarreRecherche(etat, Modifier.padding(horizontal = 20.dp, vertical = 18.dp)) { panneau = true }
        }
        when {
            etat.chargement && liste.isEmpty() -> item { Chargement() }
            etat.erreurCatalogue != null && liste.isEmpty() -> item { Message("Oups…", etat.erreurCatalogue, "Réessayer") { etat.chargerCatalogue() } }
            etat.siteFerme -> item { Message("Bientôt disponible", "Les logements arrivent très vite sur Sundarly.") }
            liste.isEmpty() -> item { Message("Aucun logement pour le moment", "Revenez bientôt : de nouveaux logements arrivent chaque semaine.") }
            else -> {
                // Regroupement par ville, de la plus fournie à la moins fournie
                val villes = liste.groupBy { Prix.nomVille(it.ville) }.entries.sortedByDescending { it.value.size }
                val promos = liste.filter { Prix.badgePromo(it).isNotEmpty() }
                if (promos.size >= 3) item(key = "promos") { Rangee("En promotion en ce moment", promos, etat) { etat.recherche = Recherche(); etat.ouvrir(Ecran.Resultats("En promotion en ce moment")) } }
                items(villes, key = { "v-" + it.key }) { (ville, annonces) ->
                    Rangee("Logements à $ville", annonces, etat) { etat.recherche = Recherche(q = ville); etat.ouvrir(Ecran.Resultats()) }
                }
                item(key = "nouveautes") {
                    Rangee("Nouveautés sur Sundarly", liste.sortedByDescending { it.creeLe.orEmpty() }.take(12), etat) { etat.recherche = Recherche(); etat.ouvrir(Ecran.Resultats()) }
                }
                item(key = "hotes") {
                    Surface(color = RoseClair, shape = RoundedCornerShape(22.dp), modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp).fillMaxWidth()) {
                        Column(Modifier.padding(20.dp)) {
                            Text("Vous avez un logement ?", style = MaterialTheme.typography.titleLarge)
                            Spacer(Modifier.height(6.dp))
                            Text("Inscrivez-le gratuitement : seulement 10 % de commission, et 0 % sur vos 3 premières réservations.", style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
                            Spacer(Modifier.height(14.dp))
                            BoutonRose("Publier mon logement") { liens.openUri(Api.SITE + "/publier.html") }
                        }
                    }
                }
            }
        }
    }
    if (panneau) PanneauRecherche(etat, onFermer = { panneau = false }) { panneau = false; etat.ouvrir(Ecran.Resultats()) }
}

@Composable
private fun Rangee(titre: String, annonces: List<Annonce>, etat: Etat, onTitre: () -> Unit) {
    Column(Modifier.padding(top = 10.dp, bottom = 10.dp)) {
        Row(Modifier.fillMaxWidth().clickable(onClick = onTitre).padding(horizontal = 20.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(titre, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Tout voir", tint = Encre)
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            items(annonces, key = { it.id }) { a -> CarteCompacte(a, etat, 172.dp) { etat.ouvrir(Ecran.Fiche(id = a.id)) } }
        }
    }
}

/** Panneau de recherche : destination, dates, voyageurs. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanneauRecherche(etat: Etat, onFermer: () -> Unit, onRechercher: () -> Unit) {
    var q by remember { mutableStateOf(etat.recherche.q) }
    var arrivee by remember { mutableStateOf(etat.recherche.arrivee) }
    var depart by remember { mutableStateOf(etat.recherche.depart) }
    var voyageurs by remember { mutableStateOf(etat.recherche.voyageurs) }
    var dates by remember { mutableStateOf(false) }
    val villes = remember(etat.catalogue) { etat.catalogue.groupBy { Prix.nomVille(it.ville) }.entries.sortedByDescending { it.value.size }.map { it.key } }

    ModalBottomSheet(onDismissRequest = onFermer, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Color.White) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 20.dp).imePadding().navigationBarsPadding()) {
            Text("Trouver un logement", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = q, onValueChange = { q = it }, label = { Text("Destination") }, placeholder = { Text("Ville, pays…") },
                singleLine = true, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                trailingIcon = { if (q.isNotEmpty()) IconButton(onClick = { q = "" }) { Icon(Icons.Filled.Close, contentDescription = "Effacer") } },
            )
            if (villes.isNotEmpty()) {
                Row(Modifier.padding(top = 10.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    villes.forEach { v -> Puce(v, q.equals(v, ignoreCase = true)) { q = if (q.equals(v, ignoreCase = true)) "" else v } }
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CaseDate("Arrivée", arrivee, Modifier.weight(1f)) { dates = true }
                CaseDate("Départ", depart, Modifier.weight(1f)) { dates = true }
            }
            Spacer(Modifier.height(16.dp))
            Compteur("Voyageurs", if (voyageurs == 0) "Peu importe" else Prix.pluriel(voyageurs, "voyageur", "voyageurs"), voyageurs > 0, voyageurs < 16, { voyageurs-- }, { voyageurs++ })
            Spacer(Modifier.height(22.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { q = ""; arrivee = null; depart = null; voyageurs = 0 }) { Text("Tout effacer", color = Encre, style = MaterialTheme.typography.labelLarge) }
                Spacer(Modifier.weight(1f))
                BoutonRose("Rechercher") {
                    etat.recherche = etat.recherche.copy(q = q.trim(), arrivee = arrivee.takeIf { depart != null }, depart = depart.takeIf { arrivee != null }, voyageurs = voyageurs)
                    onRechercher()
                }
            }
        }
    }
    if (dates) ChoixDates(arrivee, depart, onFermer = { dates = false }) { a, d -> arrivee = a; depart = d; dates = false }
}

@Composable
fun Puce(texte: String, choisie: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = choisie, onClick = onClick, label = { Text(texte, style = MaterialTheme.typography.labelMedium) }, shape = CircleShape,
        colors = FilterChipDefaults.filterChipColors(containerColor = Color.White, selectedContainerColor = Encre, selectedLabelColor = Color.White, labelColor = Encre),
        border = FilterChipDefaults.filterChipBorder(enabled = true, selected = choisie, borderColor = Bord, selectedBorderColor = Encre),
    )
}

@Composable
fun CaseDate(titre: String, date: LocalDate?, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).border(1.dp, Bord, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(titre, style = MaterialTheme.typography.labelMedium, color = Gris)
        Text(date?.let { Prix.jour(it.toString()) } ?: "Ajouter", style = MaterialTheme.typography.titleSmall, color = if (date == null) Gris else Encre)
    }
}

@Composable
fun Compteur(titre: String, valeur: String, peutMoins: Boolean, peutPlus: Boolean, moins: () -> Unit, plus: () -> Unit) {
    Row(Modifier.fillMaxWidth().border(1.dp, Bord, RoundedCornerShape(16.dp)).padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(titre, style = MaterialTheme.typography.labelMedium, color = Gris)
            Text(valeur, style = MaterialTheme.typography.titleSmall)
        }
        BoutonCompteur("−", "Moins", peutMoins, moins)
        Spacer(Modifier.width(8.dp))
        BoutonCompteur("+", "Plus", peutPlus, plus)
    }
}

@Composable
private fun BoutonCompteur(signe: String, description: String, actif: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, enabled = actif, shape = CircleShape, color = Color.White, border = androidx.compose.foundation.BorderStroke(1.dp, if (actif) Encre else Bord), modifier = Modifier.size(40.dp)) {
        Box(contentAlignment = Alignment.Center) {
            if (signe == "+") Icon(Icons.Filled.Add, contentDescription = description, tint = if (actif) Encre else Bord, modifier = Modifier.size(20.dp))
            else Box(Modifier.width(14.dp).height(2.dp).background(if (actif) Encre else Bord))
        }
    }
}

/** Calendrier plein écran pour choisir l'arrivée et le départ (jamais dans le passé). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChoixDates(arrivee: LocalDate?, depart: LocalDate?, onFermer: () -> Unit, onValider: (LocalDate?, LocalDate?) -> Unit) {
    fun ms(d: LocalDate?) = d?.atStartOfDay(ZoneOffset.UTC)?.toInstant()?.toEpochMilli()
    fun date(ms: Long?) = ms?.let { Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate() }
    val aujourdhui = remember { LocalDate.now() }
    val debut = remember { ms(aujourdhui)!! }
    val etatDates = rememberDateRangePickerState(
        initialSelectedStartDateMillis = ms(arrivee?.takeIf { !it.isBefore(aujourdhui) }),
        initialSelectedEndDateMillis = ms(depart?.takeIf { arrivee != null && !arrivee.isBefore(aujourdhui) }),
        yearRange = aujourdhui.year..(aujourdhui.year + 2),
        selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis >= debut
            override fun isSelectableYear(year: Int) = year >= aujourdhui.year
        },
    )
    Dialog(onDismissRequest = onFermer, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = Color.White) {
            Column(Modifier.statusBarsPadding().navigationBarsPadding()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onFermer) { Icon(Icons.Filled.Close, contentDescription = "Fermer") }
                    Text("Vos dates", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    TextButton(onClick = { etatDates.setSelection(null, null) }) { Text("Effacer", color = Encre) }
                }
                DateRangePicker(
                    state = etatDates, modifier = Modifier.weight(1f), showModeToggle = false,
                    title = null,
                    headline = {
                        val a = date(etatDates.selectedStartDateMillis); val d = date(etatDates.selectedEndDateMillis)
                        Text(
                            when {
                                a != null && d != null -> "${Prix.jourCourt(a)} – ${Prix.jourCourt(d)} · ${Prix.pluriel(Prix.nuits(a, d), "nuit", "nuits")}"
                                a != null -> "${Prix.jourCourt(a)} – choisissez le départ"
                                else -> "Choisissez l'arrivée"
                            },
                            style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                        )
                    },
                )
                Box(Modifier.fillMaxWidth().height(1.dp).background(Ligne))
                val a = date(etatDates.selectedStartDateMillis); val d = date(etatDates.selectedEndDateMillis)
                BoutonRose("Valider", Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), actif = (a == null && d == null) || (a != null && d != null && d.isAfter(a))) { onValider(a, d) }
            }
        }
    }
}

/** Liste des logements qui correspondent à la recherche, avec filtres par type. */
@Composable
fun EcranResultats(etat: Etat, ecran: Ecran.Resultats) {
    var panneau by remember { mutableStateOf(false) }
    val base = if (ecran.titre != null) etat.resultats().filter { Prix.badgePromo(it).isNotEmpty() } else etat.resultats()
    val types = remember(etat.catalogue) { etat.catalogue.map { it.typeLogement }.filter { it.isNotBlank() }.distinct().sorted() }
    val r = etat.recherche
    val n = Prix.nuits(r.arrivee, r.depart)
    Scaffold(
        containerColor = Color.White,
        topBar = {
            Column(Modifier.background(Color.White).statusBarsPadding()) {
                Row(Modifier.padding(start = 12.dp, end = 20.dp, top = 10.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    BoutonRetour({ etat.retour() })
                    Spacer(Modifier.width(10.dp))
                    BarreRecherche(etat, Modifier.weight(1f)) { panneau = true }
                }
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Puce("Tous les logements", r.type.isEmpty()) { etat.recherche = r.copy(type = "") }
                    types.forEach { t -> Puce(t, r.type == t) { etat.recherche = r.copy(type = if (r.type == t) "" else t) } }
                }
                Spacer(Modifier.height(6.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).background(Ligne))
            }
        },
    ) { marges ->
        LazyColumn(Modifier.fillMaxSize().padding(marges), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(26.dp)) {
            item {
                Text(
                    if (base.isEmpty()) "Aucun logement ne correspond à votre recherche."
                    else (ecran.titre?.let { "$it · " } ?: "") + Prix.pluriel(base.size, "logement", "logements") + (if (r.q.isNotBlank()) " · « ${r.q} »" else "") + (if (n > 0) " · " + Prix.pluriel(n, "nuit", "nuits") else ""),
                    style = MaterialTheme.typography.titleMedium,
                )
                if (base.isEmpty()) {
                    Spacer(Modifier.height(14.dp))
                    BoutonContour("Effacer la recherche") { etat.recherche = Recherche() }
                }
            }
            items(base, key = { it.id }) { a -> CarteLarge(a, etat) { etat.ouvrir(Ecran.Fiche(id = a.id)) } }
        }
    }
    if (panneau) PanneauRecherche(etat, onFermer = { panneau = false }) { panneau = false }
}

@Composable
fun OngletFavoris(etat: Etat) {
    val liste = etat.catalogue.filter { it.id in etat.favoris }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(26.dp)) {
        item { Text("Favoris", style = MaterialTheme.typography.headlineLarge) }
        if (liste.isEmpty()) item {
            if (etat.chargement) Chargement()
            else Message("Aucun favori pour le moment", "Touchez le cœur d'un logement pour le retrouver ici.", "Explorer les logements") { etat.onglet = Onglet.Explorer }
        }
        items(liste, key = { it.id }) { a -> CarteLarge(a, etat) { etat.ouvrir(Ecran.Fiche(id = a.id)) } }
    }
}

package com.sundarly.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sundarly.app.data.Api
import com.sundarly.app.data.ErreurSundarly
import com.sundarly.app.data.Prix
import com.sundarly.app.data.Reservation

/** Mes voyages, et les réservations reçues pour mes logements. */
@Composable
fun OngletVoyages(etat: Etat) {
    var liste by remember { mutableStateOf<List<Reservation>?>(null) }
    var erreur by remember { mutableStateOf<String?>(null) }
    var essai by remember { mutableStateOf(0) }

    LaunchedEffect(etat.connecte, essai) {
        if (!etat.connecte) return@LaunchedEffect
        erreur = null
        try { liste = Api.reservations() } catch (e: ErreurSundarly) {
            etat.rafraichirCompte(); erreur = e.message
        } catch (e: Exception) { erreur = "Impossible de charger vos réservations." }
    }

    val l = liste
    val voyages = l?.filter { it.role == "voyageur" }.orEmpty()
    val recues = l?.filter { it.role == "hote" }.orEmpty()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text("Voyages", style = MaterialTheme.typography.headlineLarge) }
        when {
            !etat.connecte -> item { Message("Connectez-vous pour voir vos voyages", "Vos réservations et vos contrats de séjour apparaîtront ici.", "Se connecter") { etat.ouvrir(Ecran.Compte) } }
            erreur != null && l == null -> item { Message("Oups…", erreur, "Réessayer") { essai++ } }
            l == null -> item { Chargement() }
            else -> {
                if (voyages.isEmpty()) item { Message("Aucun voyage pour le moment", "Trouvez votre prochain séjour sans frais de service.", "Découvrir les logements") { etat.onglet = Onglet.Explorer } }
                items(voyages, key = { it.id }) { r -> CarteReservation(r) { etat.ouvrir(Ecran.Contrat(r.id)) } }
                if (recues.isNotEmpty()) {
                    item { Text("Réservations de mes logements", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 14.dp)) }
                    items(recues, key = { "h-" + it.id }) { r -> CarteReservation(r) { etat.ouvrir(Ecran.Contrat(r.id)) } }
                }
            }
        }
    }
}

@Composable
private fun CarteReservation(r: Reservation, onClick: () -> Unit) {
    val voyageur = r.role == "voyageur"
    val aSigner = voyageur && r.contratAccepteLe == null && r.statut != "annulee"
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).border(1.dp, Ligne, RoundedCornerShape(18.dp)).clickable(onClick = onClick).padding(12.dp)) {
        Photo(r.photo, Modifier.size(92.dp).clip(RoundedCornerShape(12.dp)))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(r.titre, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text("${Prix.nomVille(r.ville)} · ${Prix.jour(r.arrivee)} → ${Prix.jour(r.depart)}", style = MaterialTheme.typography.bodySmall, color = Gris)
            Text(Prix.pluriel(r.voyageurs, "voyageur", "voyageurs") + (r.autre?.let { " · " + (if (voyageur) "hôte : " else "voyageur : ") + it } ?: ""), style = MaterialTheme.typography.bodySmall, color = Gris)
            Spacer(Modifier.height(6.dp))
            val (texte, fond, couleur) = when {
                r.statut == "annulee" -> Triple("Annulée", RougeFond, Rouge)
                r.contratAccepteLe == null -> Triple("Contrat à accepter", JauneFond, Jaune)
                r.statut == "terminee" -> Triple("Séjour terminé", VertFond, Vert)
                else -> Triple("Confirmée", VertFond, Vert)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Pastille(texte, fond, couleur)
                Spacer(Modifier.width(8.dp))
                Text(if (voyageur) "Payé : ${Prix.exact(r.total, r.devise)}" else "Vous recevrez : ${Prix.exact(r.montantHote, r.devise)}", style = MaterialTheme.typography.bodySmall)
            }
            if (!r.motif.isNullOrBlank()) Text(r.motif, style = MaterialTheme.typography.bodySmall, color = Gris, modifier = Modifier.padding(top = 4.dp))
            Text(if (aSigner) "Accepter le contrat ›" else "Voir le contrat ›", style = MaterialTheme.typography.labelMedium, color = RoseFonce, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

/** Profil : compte, vérification d'identité, devise, espace hôte et informations. */
@Composable
fun OngletProfil(etat: Etat) {
    val liens = LocalUriHandler.current
    val contexte = LocalContext.current
    var confirmer by remember { mutableStateOf(false) }
    var suppression by remember { mutableStateOf(false) }
    LaunchedEffect(etat.connecte) { if (etat.connecte && etat.profil == null) etat.rafraichirCompte() }

    fun ecrire(sujet: String, texte: String = "") {
        val envoi = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:info@sundarly.com?subject=" + Uri.encode(sujet) + "&body=" + Uri.encode(texte)))
        runCatching { contexte.startActivity(envoi) }.onFailure { liens.openUri(Api.SITE) }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(top = 18.dp, bottom = 28.dp)) {
        Text("Profil", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(18.dp))
        val p = etat.profil
        if (!etat.connecte) {
            Surface(color = RoseClair, shape = RoundedCornerShape(22.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp)) {
                    Text("Bienvenue sur Sundarly", style = MaterialTheme.typography.titleLarge)
                    Text("Connectez-vous pour réserver un logement, retrouver vos voyages et gérer votre compte.", style = MaterialTheme.typography.bodyMedium, color = GrisTexte, modifier = Modifier.padding(top = 6.dp, bottom = 16.dp))
                    BoutonRose("Se connecter ou créer un compte", Modifier.fillMaxWidth()) { etat.ouvrir(Ecran.Compte) }
                }
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(p?.prenom ?: etat.email ?: "S", 60)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text(listOfNotNull(p?.prenom, p?.nom?.takeIf { it != "-" }).joinToString(" ").ifBlank { "Mon compte" }, style = MaterialTheme.typography.titleLarge)
                    etat.email?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = Gris) }
                }
            }
            Spacer(Modifier.height(18.dp))
            val (texte, fond, couleur) = when (p?.statutVerification) {
                "verifie" -> Triple("Identité vérifiée", VertFond, Vert)
                "en_cours" -> Triple("Vérification en cours", JauneFond, Jaune)
                "refuse" -> Triple("Documents à renvoyer", RougeFond, Rouge)
                else -> Triple("Identité à vérifier", RougeFond, Rouge)
            }
            LigneMenu("Vérification d'identité", "Obligatoire pour réserver ou publier", { etat.ouvrir(Ecran.Verification) }) { Pastille(texte, fond, couleur) }
        }

        Section("Préférences")
        Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Devise d'affichage", style = MaterialTheme.typography.titleSmall)
                Text("Les prix des hôtes sont convertis à titre indicatif", style = MaterialTheme.typography.bodySmall, color = Gris)
            }
            ChoixDevise(etat)
        }

        Section("Propriétaires")
        LigneMenu("Publier mon logement", "Inscription gratuite, 10 % de commission seulement", { liens.openUri(Api.SITE + "/publier.html") })
        LigneMenu("Mon espace hôte", "Annonces, calendrier et paiements sur sundarly.com", { liens.openUri(Api.SITE + "/espace-hote.html") })

        Section("Sundarly")
        LigneMenu("Pourquoi Sundarly", null, { liens.openUri(Api.SITE + "/pourquoi-sundarly") })
        LigneMenu("Laisser ou lire mes avis", null, { liens.openUri(Api.SITE + "/avis.html") })
        LigneMenu("Nous contacter", "info@sundarly.com", { ecrire("Question depuis l'application Sundarly") })
        LigneMenu("Conditions générales", null, { liens.openUri(Api.SITE + "/conditions-generales.html") })
        LigneMenu("Politique de confidentialité", null, { liens.openUri(Api.SITE + "/confidentialite.html") })
        LigneMenu("Mentions légales", null, { liens.openUri(Api.SITE + "/mentions-legales.html") })

        if (etat.connecte) {
            Section("Compte")
            LigneMenu("Se déconnecter", null, { confirmer = true })
            LigneMenu("Supprimer mon compte", "Demande traitée par notre équipe", { suppression = true })
        }
        Spacer(Modifier.height(20.dp))
        Text("Sundarly · location de vacances sans frais de service", style = MaterialTheme.typography.bodySmall, color = Gris)
    }

    if (confirmer) AlertDialog(
        onDismissRequest = { confirmer = false }, containerColor = Color.White,
        title = { Text("Se déconnecter ?") },
        confirmButton = { TextButton(onClick = { confirmer = false; etat.deconnecter() }) { Text("Se déconnecter", color = RoseFonce) } },
        dismissButton = { TextButton(onClick = { confirmer = false }) { Text("Annuler", color = Encre) } },
    )
    if (suppression) AlertDialog(
        onDismissRequest = { suppression = false }, containerColor = Color.White,
        title = { Text("Supprimer mon compte") },
        text = { Text("Votre demande est envoyée par e-mail à notre équipe, qui supprime votre compte et vos données (hors obligations légales liées aux réservations passées).") },
        confirmButton = {
            TextButton(onClick = {
                suppression = false
                ecrire("Suppression de mon compte Sundarly", "Bonjour,\n\nJe souhaite supprimer mon compte Sundarly associé à l'adresse ${etat.email.orEmpty()}.\n\nMerci.")
            }) { Text("Envoyer la demande", color = RoseFonce) }
        },
        dismissButton = { TextButton(onClick = { suppression = false }) { Text("Annuler", color = Encre) } },
    )
}

@Composable
private fun Section(titre: String) {
    Box(Modifier.padding(top = 18.dp, bottom = 14.dp).fillMaxWidth().height(1.dp).background(Ligne))
    Text(titre.uppercase(), style = MaterialTheme.typography.labelSmall, color = Gris, modifier = Modifier.padding(bottom = 4.dp))
}

@Composable
private fun LigneMenu(titre: String, detail: String?, onClick: () -> Unit, fin: (@Composable () -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(titre, style = MaterialTheme.typography.titleSmall)
            if (detail != null) Text(detail, style = MaterialTheme.typography.bodySmall, color = Gris)
        }
        if (fin != null) { fin(); Spacer(Modifier.width(6.dp)) }
        Icon(Icons.Filled.KeyboardArrowRight, contentDescription = null, tint = Gris)
    }
}

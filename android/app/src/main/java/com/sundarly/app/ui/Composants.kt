package com.sundarly.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.sundarly.app.data.Annonce
import com.sundarly.app.data.Prix

@Composable
fun BoutonRose(texte: String, modifier: Modifier = Modifier, actif: Boolean = true, occupe: Boolean = false, onClick: () -> Unit) {
    Button(
        onClick = onClick, enabled = actif && !occupe, modifier = modifier.heightIn(min = 52.dp),
        shape = CircleShape, contentPadding = PaddingValues(horizontal = 26.dp, vertical = 12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Rose, contentColor = Color.White, disabledContainerColor = Rose.copy(alpha = 0.45f), disabledContentColor = Color.White),
    ) {
        if (occupe) {
            CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
            Spacer(Modifier.width(10.dp))
        }
        Text(texte, style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center)
    }
}

@Composable
fun BoutonContour(texte: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick, modifier = modifier.heightIn(min = 48.dp), shape = CircleShape,
        border = BorderStroke(1.5.dp, Encre), colors = ButtonDefaults.outlinedButtonColors(contentColor = Encre),
    ) { Text(texte, style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center) }
}

@Composable
fun Pastille(texte: String, fond: Color = Color.White, couleur: Color = Encre, modifier: Modifier = Modifier) {
    Surface(color = fond, shape = CircleShape, modifier = modifier, shadowElevation = if (fond == Color.White) 2.dp else 0.dp) {
        Text(texte, color = couleur, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp), maxLines = 1)
    }
}

@Composable
fun BoutonRond(onClick: () -> Unit, description: String, modifier: Modifier = Modifier, contenu: @Composable () -> Unit) {
    Surface(onClick = onClick, shape = CircleShape, color = Color.White.copy(alpha = 0.94f), shadowElevation = 3.dp, modifier = modifier.size(40.dp)) {
        Box(contentAlignment = Alignment.Center) { contenu() }
    }
}

@Composable
fun BoutonRetour(onClick: () -> Unit, modifier: Modifier = Modifier) {
    BoutonRond(onClick, "Retour", modifier) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Retour", tint = Encre, modifier = Modifier.size(20.dp)) }
}

@Composable
fun Coeur(actif: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    IconButton(onClick = onClick, modifier = modifier) {
        if (actif) Icon(Icons.Filled.Favorite, contentDescription = "Retirer des favoris", tint = Rose, modifier = Modifier.size(26.dp))
        else {
            // cœur blanc bordé, lisible sur toutes les photos
            Icon(Icons.Filled.Favorite, contentDescription = null, tint = Color.Black.copy(alpha = 0.35f), modifier = Modifier.size(26.dp))
            Icon(Icons.Filled.FavoriteBorder, contentDescription = "Ajouter aux favoris", tint = Color.White, modifier = Modifier.size(26.dp))
        }
    }
}

@Composable
fun Photo(url: String?, modifier: Modifier = Modifier, description: String? = null) {
    AsyncImage(model = url, contentDescription = description, contentScale = ContentScale.Crop, modifier = modifier.background(RoseClair))
}

/** Petite carte des rangées de l'accueil : photo carrée, type · ville, lits · note, prix. */
@Composable
fun CarteCompacte(a: Annonce, etat: Etat, largeur: Dp, onClick: () -> Unit) {
    Column(Modifier.width(largeur).clip(RoundedCornerShape(18.dp)).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(18.dp))) {
            Photo(a.photos.firstOrNull(), Modifier.fillMaxSize())
            val badge = Prix.badgePromo(a).ifEmpty { if (a.nbAvis > 0 && (a.noteMoyenne ?: 0.0) >= 4.8) "Coup de cœur voyageurs" else "" }
            if (badge.isNotEmpty()) Pastille(badge, modifier = Modifier.align(Alignment.TopStart).padding(10.dp))
            Coeur(a.id in etat.favoris, { etat.basculerFavori(a.id) }, Modifier.align(Alignment.TopEnd))
        }
        Spacer(Modifier.height(8.dp))
        Text("${a.typeLogement.ifEmpty { "Logement" }} · ${Prix.nomVille(a.ville)}", style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text("${Prix.pluriel(a.lits.coerceAtLeast(1), "lit", "lits")} · ${Prix.note(a)}", style = MaterialTheme.typography.bodySmall, color = Gris, maxLines = 1)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(etat.prix(a.prixNuit, a.devise), style = MaterialTheme.typography.titleSmall)
            Text(" par nuit", style = MaterialTheme.typography.bodySmall, color = GrisTexte)
        }
        Spacer(Modifier.height(4.dp))
    }
}

/** Grande carte des listes : carrousel de photos, lieu, titre, détails, prix (au total si des dates sont choisies). */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun CarteLarge(a: Annonce, etat: Etat, onClick: () -> Unit) {
    val photos = a.photos.take(6)
    val r = etat.recherche
    val n = Prix.nuits(r.arrivee, r.depart)
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(1.18f).clip(RoundedCornerShape(20.dp))) {
            if (photos.size > 1) {
                val pager = rememberPagerState { photos.size }
                HorizontalPager(pager, Modifier.fillMaxSize()) { i -> Photo(photos[i], Modifier.fillMaxSize()) }
                Points(photos.size, pager.currentPage, Modifier.align(Alignment.BottomCenter).padding(bottom = 10.dp))
            } else Photo(photos.firstOrNull(), Modifier.fillMaxSize())
            val badge = Prix.badgePromo(a)
            if (badge.isNotEmpty()) Pastille(badge, modifier = Modifier.align(Alignment.TopStart).padding(12.dp))
            Coeur(a.id in etat.favoris, { etat.basculerFavori(a.id) }, Modifier.align(Alignment.TopEnd).padding(2.dp))
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("${Prix.nomVille(a.ville)}, ${a.pays}", style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Text(Prix.note(a), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 8.dp))
        }
        Text(a.titre, style = MaterialTheme.typography.bodyMedium, color = GrisTexte, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text("${a.typeLogement} · ${Prix.pluriel(a.voyageurs, "voyageur", "voyageurs")} · ${Prix.pluriel(a.chambres, "chambre", "chambres")}", style = MaterialTheme.typography.bodyMedium, color = Gris, maxLines = 1)
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            if (n > 0) {
                Text(etat.prix(Prix.sejour(a, n, r.arrivee, false).total, a.devise), style = MaterialTheme.typography.titleMedium)
                Text(" au total · ${Prix.pluriel(n, "nuit", "nuits")}", style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
            } else {
                Text(etat.prix(a.prixNuit, a.devise), style = MaterialTheme.typography.titleMedium)
                Text(" par nuit", style = MaterialTheme.typography.bodyMedium, color = GrisTexte)
            }
        }
    }
}

@Composable
fun Points(nombre: Int, actif: Int, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        repeat(nombre.coerceAtMost(8)) { i ->
            Box(Modifier.size(6.dp).clip(CircleShape).background(if (i == actif.coerceAtMost(7)) Color.White else Color.White.copy(alpha = 0.55f)))
        }
    }
}

@Composable
fun Chargement(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Rose) }
}

/** Message centré avec un bouton facultatif (liste vide, erreur, etc.). */
@Composable
fun Message(titre: String, texte: String? = null, bouton: String? = null, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Column(modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(titre, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        if (texte != null) {
            Spacer(Modifier.height(8.dp))
            Text(texte, style = MaterialTheme.typography.bodyMedium, color = Gris, textAlign = TextAlign.Center)
        }
        if (bouton != null) {
            Spacer(Modifier.height(20.dp))
            BoutonRose(bouton, onClick = onClick)
        }
    }
}

@Composable
fun Bandeau(texte: String, fond: Color, couleur: Color, modifier: Modifier = Modifier) {
    Surface(color = fond, shape = RoundedCornerShape(12.dp), modifier = modifier.fillMaxWidth()) {
        Text(texte, color = couleur, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp))
    }
}

@Composable
fun TitreSection(texte: String, modifier: Modifier = Modifier) {
    Text(texte, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = modifier)
}

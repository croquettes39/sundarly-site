package com.sundarly.app.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.exifinterface.media.ExifInterface
import com.sundarly.app.data.Api
import com.sundarly.app.data.ErreurSundarly
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File

private val PAYS = listOf("France", "Suisse", "Belgique", "Maroc", "Tunisie", "Espagne", "Portugal", "Italie", "Allemagne", "Autre pays")
private val PIECES = listOf("cni" to "Carte nationale d'identité", "passeport" to "Passeport", "titre_sejour" to "Titre de séjour", "permis" to "Permis de conduire")

@Composable
fun Champ(
    valeur: String, onChange: (String) -> Unit, libelle: String, modifier: Modifier = Modifier,
    clavier: KeyboardType = KeyboardType.Text, motDePasse: Boolean = false, aide: String? = null,
    majuscules: KeyboardCapitalization = KeyboardCapitalization.None,
) {
    OutlinedTextField(
        value = valeur, onValueChange = onChange, label = { Text(libelle) }, singleLine = true,
        shape = RoundedCornerShape(16.dp), modifier = modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = if (motDePasse) KeyboardType.Password else clavier, capitalization = majuscules),
        visualTransformation = if (motDePasse) PasswordVisualTransformation() else VisualTransformation.None,
        supportingText = aide?.let { { Text(it) } },
    )
}

/** Liste déroulante simple (pays, type de pièce). */
@Composable
fun ChoixListe(libelle: String, valeur: String, options: List<Pair<String, String>>, onChoix: (String) -> Unit) {
    var ouvert by remember { mutableStateOf(false) }
    Box {
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, Bord, RoundedCornerShape(16.dp)).clickable { ouvert = true }.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(libelle, style = MaterialTheme.typography.labelMedium, color = Gris)
                Text(options.firstOrNull { it.first == valeur }?.second ?: "Choisir…", style = MaterialTheme.typography.bodyLarge, color = if (valeur.isEmpty()) Gris else Encre)
            }
            Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = Encre)
        }
        DropdownMenu(ouvert, onDismissRequest = { ouvert = false }, containerColor = Color.White) {
            options.forEach { (cle, nom) -> DropdownMenuItem(text = { Text(nom) }, onClick = { onChoix(cle); ouvert = false }) }
        }
    }
}

@Composable
private fun EnTete(titre: String, onRetour: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        BoutonRetour(onRetour)
        Spacer(Modifier.width(12.dp))
        Text(titre, style = MaterialTheme.typography.titleLarge)
    }
}

/** Connexion, création de compte et mot de passe oublié. */
@Composable
fun EcranCompte(etat: Etat) {
    var mode by rememberSaveable { mutableStateOf("connexion") }
    var email by rememberSaveable { mutableStateOf("") }
    var mdp by rememberSaveable { mutableStateOf("") }
    var prenom by rememberSaveable { mutableStateOf("") }
    var nom by rememberSaveable { mutableStateOf("") }
    var telephone by rememberSaveable { mutableStateOf("") }
    var pays by rememberSaveable { mutableStateOf("") }
    var cgu by rememberSaveable { mutableStateOf(false) }
    var occupe by remember { mutableStateOf(false) }
    var erreur by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    val portee = rememberCoroutineScope()
    val liens = LocalUriHandler.current

    /** Après connexion : retour à l'écran précédent, en passant par la vérification d'identité si elle reste à faire. */
    suspend fun continuer() {
        val p = etat.rafraichirCompte()
        if (p != null && (p.statutVerification == "non_verifie" || p.statutVerification == "refuse")) etat.remplacer(Ecran.Verification) else etat.retour()
    }

    fun envoyer(action: suspend () -> Unit) {
        portee.launch {
            occupe = true; erreur = null; info = null
            try { action() } catch (e: ErreurSundarly) { erreur = e.message } catch (e: Exception) { erreur = "Une erreur est survenue. Vérifiez votre connexion et réessayez." }
            occupe = false
        }
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        EnTete(when (mode) { "inscription" -> "Créer un compte"; "oubli" -> "Mot de passe oublié"; else -> "Connexion" }) { if (mode == "oubli") mode = "connexion" else etat.retour() }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (mode != "oubli") {
                Row(Modifier.fillMaxWidth().clip(CircleShape).background(RoseClair).padding(4.dp)) {
                    listOf("connexion" to "Se connecter", "inscription" to "Créer un compte").forEach { (m, t) ->
                        Surface(onClick = { mode = m; erreur = null; info = null }, shape = CircleShape, color = if (mode == m) Color.White else Color.Transparent, shadowElevation = if (mode == m) 2.dp else 0.dp, modifier = Modifier.weight(1f)) {
                            Text(t, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(vertical = 11.dp).fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
            }
            when (mode) {
                "connexion" -> {
                    Champ(email, { email = it }, "E-mail", clavier = KeyboardType.Email)
                    Champ(mdp, { mdp = it }, "Mot de passe", motDePasse = true)
                    BoutonRose("Se connecter", Modifier.fillMaxWidth(), actif = email.isNotBlank() && mdp.isNotEmpty(), occupe = occupe) {
                        envoyer { Api.connexion(email, mdp); continuer() }
                    }
                    TextButton(onClick = { mode = "oubli"; erreur = null; info = null }) { Text("Mot de passe oublié ?", color = RoseFonce) }
                }
                "inscription" -> {
                    Text("Un seul compte pour réserver des logements et publier les vôtres.", style = MaterialTheme.typography.bodyMedium, color = Gris)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Champ(prenom, { prenom = it }, "Prénom", Modifier.weight(1f), majuscules = KeyboardCapitalization.Words)
                        Champ(nom, { nom = it }, "Nom", Modifier.weight(1f), majuscules = KeyboardCapitalization.Words)
                    }
                    Champ(email, { email = it }, "E-mail", clavier = KeyboardType.Email)
                    Champ(telephone, { telephone = it }, "Téléphone (WhatsApp de préférence)", clavier = KeyboardType.Phone, aide = "+33…, +41…, +212…")
                    ChoixListe("Pays de résidence", pays, PAYS.map { it to it }) { pays = it }
                    Champ(mdp, { mdp = it }, "Mot de passe", motDePasse = true, aide = "8 caractères minimum")
                    Row(verticalAlignment = Alignment.Top) {
                        Checkbox(checked = cgu, onCheckedChange = { cgu = it }, colors = CheckboxDefaults.colors(checkedColor = Rose))
                        Column(Modifier.padding(top = 12.dp)) {
                            Text("J'ai 18 ans ou plus et j'accepte les conditions générales et la politique de confidentialité.", style = MaterialTheme.typography.bodyMedium)
                            Row {
                                Text("Conditions générales", style = MaterialTheme.typography.labelMedium, color = RoseFonce, modifier = Modifier.clickable { liens.openUri(Api.SITE + "/conditions-generales.html") }.padding(vertical = 6.dp))
                                Spacer(Modifier.width(16.dp))
                                Text("Confidentialité", style = MaterialTheme.typography.labelMedium, color = RoseFonce, modifier = Modifier.clickable { liens.openUri(Api.SITE + "/confidentialite.html") }.padding(vertical = 6.dp))
                            }
                        }
                    }
                    val complet = prenom.isNotBlank() && nom.isNotBlank() && email.contains("@") && telephone.trim().length >= 6 && pays.isNotEmpty() && mdp.length >= 8 && cgu
                    BoutonRose("Créer mon compte", Modifier.fillMaxWidth(), actif = complet, occupe = occupe) {
                        envoyer {
                            if (Api.inscription(email, mdp, prenom, nom, telephone, pays)) continuer()
                            else { mdp = ""; mode = "connexion"; info = "Compte créé ! Nous vous avons envoyé un e-mail : cliquez sur le lien qu'il contient pour activer votre compte (pensez à regarder dans les spams), puis connectez-vous ici." }
                        }
                    }
                }
                else -> {
                    Text("Indiquez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.", style = MaterialTheme.typography.bodyMedium, color = Gris)
                    Champ(email, { email = it }, "E-mail", clavier = KeyboardType.Email)
                    BoutonRose("Recevoir le lien", Modifier.fillMaxWidth(), actif = email.contains("@"), occupe = occupe) {
                        envoyer { Api.motDePasseOublie(email); info = "Si un compte existe avec cet e-mail, vous allez recevoir un lien pour choisir un nouveau mot de passe." }
                    }
                }
            }
            erreur?.let { Bandeau(it, RougeFond, Rouge) }
            info?.let { Bandeau(it, VertFond, Vert) }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** Vérification d'identité obligatoire : pièce (recto, verso) et selfie, envoyés dans l'espace privé du site. */
@Composable
fun EcranVerification(etat: Etat) {
    val contexte = LocalContext.current
    val portee = rememberCoroutineScope()
    var type by rememberSaveable { mutableStateOf("") }
    var numero by rememberSaveable { mutableStateOf("") }
    var recto by rememberSaveable { mutableStateOf<Uri?>(null) }
    var verso by rememberSaveable { mutableStateOf<Uri?>(null) }
    var selfie by rememberSaveable { mutableStateOf<Uri?>(null) }
    var occupe by remember { mutableStateOf(false) }
    var erreur by remember { mutableStateOf<String?>(null) }
    var charge by remember { mutableStateOf(etat.profil != null) }

    LaunchedEffect(Unit) { etat.rafraichirCompte(); charge = true; if (!etat.connecte) etat.remplacer(Ecran.Compte) }

    val statut = etat.profil?.statutVerification ?: "non_verifie"
    val aFaire = statut == "non_verifie" || statut == "refuse"
    val (badge, texte, couleurs) = when (statut) {
        "en_cours" -> Triple("En cours", "Merci ! Vos documents sont en cours de vérification par notre équipe (en général sous 48 h). Vous recevrez une confirmation dès qu'elle sera validée.", JauneFond to Jaune)
        "verifie" -> Triple("Vérifiée", "Votre identité est vérifiée. Vous pouvez profiter pleinement de Sundarly.", VertFond to Vert)
        "refuse" -> Triple("À refaire", "Vos documents n'ont pas pu être validés (photo floue, pièce expirée…). Merci de les envoyer à nouveau : c'est obligatoire pour utiliser Sundarly.", RougeFond to Rouge)
        else -> Triple("Obligatoire", "Sans identité vérifiée, vous ne pouvez ni réserver un logement ni publier une annonce. Cela prend 2 minutes : une pièce d'identité et un selfie.", RougeFond to Rouge)
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        EnTete("Vérification d'identité") { etat.retour() }
        if (!charge) { Chargement(); return@Column }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Surface(color = couleurs.first, shape = CircleShape) { Text(badge, color = couleurs.second, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) }
            Text(texte, style = MaterialTheme.typography.bodyLarge)
            if (!aFaire) {
                BoutonRose(if (statut == "verifie") "Continuer" else "Retour", Modifier.fillMaxWidth()) { etat.retour() }
            } else {
                Text("• Pour les voyageurs : obligatoire pour réserver un logement.\n• Pour les hôtes : obligatoire pour publier une annonce.\n• Pour tout le monde : une communauté de vrais profils, sans faux comptes ni arnaques.", style = MaterialTheme.typography.bodyMedium, color = Gris)
                ChoixListe("Type de pièce", type, PIECES) { type = it }
                Champ(numero, { numero = it.take(40) }, "Numéro de la pièce d'identité", aide = "Tel qu'il figure sur votre pièce", majuscules = KeyboardCapitalization.Characters)
                ZonePhoto("Recto", "Photo nette de la face avant", recto, false) { recto = it }
                if (type != "passeport") ZonePhoto("Verso", "Face arrière de la pièce", verso, false) { verso = it }
                ZonePhoto("Selfie", "Une photo de vous, visage bien visible", selfie, true) { selfie = it }
                Text("🔒 Vos documents sont envoyés de façon sécurisée et ne sont visibles que par l'équipe Sundarly.", style = MaterialTheme.typography.bodySmall, color = Gris)
                erreur?.let { Bandeau(it, RougeFond, Rouge) }
                BoutonRose("Envoyer pour vérification", Modifier.fillMaxWidth(), occupe = occupe) {
                    val num = numero.trim().uppercase()
                    val photos = buildList { add("recto" to recto); if (type != "passeport") add("verso" to verso); add("selfie" to selfie) }
                    val manque = photos.filter { it.second == null }.map { it.first }
                    erreur = when {
                        type.isEmpty() -> "Choisissez le type de pièce."
                        num.length < 4 -> "Indiquez le numéro de votre pièce d'identité."
                        manque.isNotEmpty() -> "Il manque : ${manque.joinToString(", ")}."
                        else -> null
                    }
                    if (erreur == null) portee.launch {
                        occupe = true
                        try {
                            val horodatage = System.currentTimeMillis()
                            for ((nom, uri) in photos) Api.envoyerPiece("$horodatage-$nom.jpg", compresser(contexte, uri!!))
                            etat.majProfil(Api.declarerPiece(type, num))
                        } catch (e: ErreurSundarly) { erreur = e.message } catch (e: Exception) { erreur = "L'envoi n'a pas abouti. Vérifiez votre connexion et réessayez." }
                        occupe = false
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** Une photo à fournir : prise avec l'appareil ou choisie dans la galerie. */
@Composable
private fun ZonePhoto(titre: String, aide: String, uri: Uri?, frontale: Boolean, onChoix: (Uri) -> Unit) {
    val contexte = LocalContext.current
    var enAttente by rememberSaveable { mutableStateOf<Uri?>(null) }
    val galerie = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { if (it != null) onChoix(it) }
    val appareil = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok -> val u = enAttente; if (ok && u != null) onChoix(u) }
    Column(Modifier.fillMaxWidth().border(1.dp, if (uri != null) Vert else Bord, RoundedCornerShape(16.dp)).padding(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(titre, style = MaterialTheme.typography.titleSmall)
                Text(if (uri != null) "Photo ajoutée" else aide, style = MaterialTheme.typography.bodySmall, color = if (uri != null) Vert else Gris)
            }
            if (uri != null) Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Vert, modifier = Modifier.size(26.dp))
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BoutonContour("Prendre une photo", Modifier.weight(1f)) {
                runCatching {
                    val dossier = File(contexte.cacheDir, "photos").apply { mkdirs() }
                    val u = FileProvider.getUriForFile(contexte, contexte.packageName + ".fichiers", File(dossier, "${titre.lowercase()}-${System.currentTimeMillis()}.jpg"))
                    enAttente = u; appareil.launch(u)
                }
            }
            BoutonContour("Choisir", Modifier.weight(1f)) { galerie.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
        }
    }
}

/** Réduit la photo (2 000 px au plus, JPEG) pour un envoi rapide, en respectant son orientation. */
private suspend fun compresser(contexte: Context, uri: Uri): ByteArray = withContext(Dispatchers.IO) {
    val resolveur = contexte.contentResolver
    val bornes = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolveur.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bornes) }
    var echantillon = 1
    while (maxOf(bornes.outWidth, bornes.outHeight) / echantillon > 4000) echantillon *= 2
    val image = resolveur.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = echantillon }) }
        ?: throw ErreurSundarly("Cette photo n'a pas pu être lue. Choisissez-en une autre.")
    val rotation = runCatching {
        resolveur.openInputStream(uri)?.use { ExifInterface(it).rotationDegrees } ?: 0
    }.getOrDefault(0)
    val facteur = (2000f / maxOf(image.width, image.height)).coerceAtMost(1f)
    val matrice = Matrix().apply { postScale(facteur, facteur); if (rotation != 0) postRotate(rotation.toFloat()) }
    val finale = Bitmap.createBitmap(image, 0, 0, image.width, image.height, matrice, true)
    ByteArrayOutputStream().also { finale.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
}

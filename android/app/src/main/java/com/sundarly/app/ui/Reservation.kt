package com.sundarly.app.ui

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.text.TextUtils
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.sundarly.app.data.Api
import com.sundarly.app.data.Contrat
import com.sundarly.app.data.ErreurSundarly
import com.sundarly.app.data.Prix
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Paiement sécurisé Stripe, affiché dans l'application.
 * Quand Stripe renvoie vers la page du contrat du site, l'app prend le relais et affiche le contrat à signer.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun EcranPaiement(etat: Etat, ecran: Ecran.Paiement) {
    var charge by remember { mutableStateOf(false) }
    var quitter by remember { mutableStateOf(false) }
    BackHandler { quitter = true }

    /** Vrai si l'adresse est un retour vers le site (paiement terminé ou abandonné) : l'app s'en occupe. */
    fun retourSite(url: Uri): Boolean {
        if (url.host?.endsWith("sundarly.com") != true) return false
        val chemin = url.path.orEmpty()
        val reservation = url.getQueryParameter("id")
        if (chemin.startsWith("/contrat") && reservation != null) etat.remplacer(Ecran.Contrat(reservation, url.getQueryParameter("session")))
        else etat.retour()
        return true
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().navigationBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { quitter = true }) { Icon(Icons.Filled.Close, contentDescription = "Fermer") }
            Column {
                Text("Paiement sécurisé", style = MaterialTheme.typography.titleMedium)
                Text("🔒 Stripe · aucun frais de service", style = MaterialTheme.typography.bodySmall, color = Gris)
            }
        }
        if (!charge) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Rose, trackColor = RoseClair) else Box(Modifier.fillMaxWidth().height(1.dp).background(Ligne))
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.setSupportMultipleWindows(false)
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = retourSite(request.url)
                        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                            // Filet de sécurité si la redirection n'est pas passée par shouldOverrideUrlLoading
                            if (url != null && retourSite(Uri.parse(url))) view.stopLoading()
                        }
                        override fun onPageFinished(view: WebView, url: String?) { charge = true }
                    }
                    loadUrl(ecran.url)
                }
            },
            onRelease = { it.stopLoading(); it.destroy() },
        )
    }

    if (quitter) AlertDialog(
        onDismissRequest = { quitter = false }, containerColor = Color.White,
        title = { Text("Abandonner le paiement ?") },
        text = { Text("Votre réservation n'est pas encore payée. Si vous quittez, les dates seront libérées.") },
        confirmButton = { TextButton(onClick = { quitter = false; etat.retour() }) { Text("Abandonner", color = RoseFonce) } },
        dismissButton = { TextButton(onClick = { quitter = false }) { Text("Continuer le paiement", color = Encre) } },
    )
}

private val NOMS_PIECES = mapOf("cni" to "Carte d'identité", "passeport" to "Passeport", "titre_sejour" to "Titre de séjour", "permis" to "Permis de conduire")
private val NOMS_ANNULATION = mapOf(
    "souple" to "Souple — remboursement intégral jusqu'à 24 h avant l'arrivée",
    "moderee" to "Modérée — remboursement intégral jusqu'à 5 jours avant l'arrivée",
    "stricte" to "Stricte — remboursement de 50 % jusqu'à 7 jours avant l'arrivée, rien ensuite",
)
private const val TEXTE_ACCEPTATION = "J'ai lu et j'accepte le présent contrat et le règlement du logement. Je m'engage à respecter le bien, le voisinage et le règlement, et à restituer le logement propre. Je reconnais être responsable des dégradations, de la casse et des vols survenus pendant mon séjour, et que le propriétaire ou son représentant peut mettre fin à mon séjour en cas de manquement grave."

private fun esc(s: String?): String = TextUtils.htmlEncode(s.orEmpty())

/** Remplit le modèle de contrat du site avec les données de la réservation (même logique que assets/contrat.js). */
private fun remplirContrat(gabarit: String, c: Contrat): String {
    fun montant(v: Double?) = if (v == null) "—" else esc(Prix.exact(v, c.devise))
    val valeurs = mapOf(
        "REFERENCE" to esc(c.reference),
        "DATE_EMISSION" to esc(Prix.dateComplete(Prix.instant(c.payeLe) ?: Instant.now())),
        "BANDEAU_MODELE" to "",
        "HOTE_NOM" to esc(c.hoteNom), "ADRESSE" to esc(c.adresse), "LOGEMENT" to esc(c.logement),
        "VOYAGEUR_NOM" to esc(c.voyageurNom), "PIECE_TYPE" to esc(NOMS_PIECES[c.pieceType] ?: "Pièce d'identité"),
        "PIECE_NUMERO" to (c.pieceNumero?.takeIf { it.isNotBlank() }?.let { esc(it) } ?: "<em>à indiquer ci-dessous</em>"),
        "ARRIVEE" to esc(Prix.jourLong(c.arrivee)), "DEPART" to esc(Prix.jourLong(c.depart)),
        "NB_VOYAGEURS" to Prix.pluriel(c.voyageurs, "voyageur", "voyageurs") + if (c.animaux) " + animal" else "",
        "TOTAL" to montant(c.total),
        "HEURE_ARRIVEE" to esc(c.heureArrivee ?: "—"), "HEURE_DEPART" to esc(c.heureDepart ?: "—"),
        "REGLE_ANIMAUX" to if (c.regleAnimaux) "Animaux acceptés" + (if (c.fraisAnimaux > 0) " (frais : ${montant(c.fraisAnimaux)} par séjour)" else ", sans frais") else "Animaux non acceptés",
        "REGLE_FUMEURS" to if (c.fumeurs) "Logement fumeur" else "Logement non-fumeur",
        "REGLE_FETES" to if (c.fetes) "Fêtes et événements autorisés" else "Pas de fêtes ni d'événements",
        "REGLES_HOTE" to if (!c.reglement.isNullOrBlank()) "<p><strong>Règles ajoutées par le propriétaire :</strong> " + esc(c.reglement).replace("\n", "<br>") + "</p>" else "",
        "CAUTION" to if (c.caution > 0) "<p>Une caution de <strong>${montant(c.caution)}</strong> est prévue pour ce logement : elle peut servir à couvrir tout ou partie de ces frais.</p>" else "",
        "ANNULATION" to esc(NOMS_ANNULATION[c.annulation] ?: c.annulation ?: "—"), "PAYS" to esc(c.pays),
        "DATE_ACCEPTATION" to if (c.accepteLe != null) esc(Prix.dateHeure(c.accepteLe)) else "—",
        "PREUVE" to if (c.preuve != null) "Compte vérifié · réf. " + esc(c.preuve) else "—",
    )
    val rempli = Regex("\\{\\{(\\w+)\\}\\}").replace(gabarit) { valeurs[it.groupValues[1]].orEmpty() }
    // Mise en page pour téléphone ; tant que le contrat n'est pas accepté, le bloc « signature » du modèle est masqué
    val style = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>" +
        "body{padding:16px 18px 28px !important;font-size:14px !important;font-family:sans-serif !important;}" +
        "h1{font-size:21px !important;} h2{font-size:16px !important;} .logo{font-size:24px !important;} .ref,.lbl,.sejour div span,.pied,.preuve{font-size:12px !important;}" +
        ".carte h3{font-size:12px !important;} .sejour div strong,.ref strong,.preuve strong{font-size:14px !important;} .signature h3{font-size:16px !important;}" +
        ".parties,.preuve{grid-template-columns:1fr !important;} .sejour{grid-template-columns:1fr 1fr !important;} .entete{flex-wrap:wrap;gap:8px;} .lbl{min-width:0 !important;display:block !important;}" +
        (if (c.accepteLe == null) ".signature{display:none !important;}" else "") + "</style>"
    return if (rempli.contains("</head>")) rempli.replace("</head>", "$style</head>") else style + rempli
}

/** Contrat de séjour : à signer dans les 5 minutes après le paiement, sinon la réservation est annulée. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EcranContrat(etat: Etat, ecran: Ecran.Contrat) {
    var contrat by remember { mutableStateOf<Contrat?>(null) }
    var gabarit by remember { mutableStateOf<String?>(null) }
    var erreur by remember { mutableStateOf<String?>(null) }
    var recharger by remember { mutableStateOf(0) }
    var signature by rememberSaveable { mutableStateOf(false) }
    var maintenant by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val retourStripe = ecran.sessionStripe != null

    LaunchedEffect(recharger) {
        erreur = null
        try {
            if (gabarit == null) gabarit = Api.modeleContrat()
            if (retourStripe) Api.confirmerPaiement(ecran.sessionStripe!!)
            var c = Api.contrat(ecran.reservation)
            // Le paiement peut mettre quelques secondes à être confirmé
            var essais = 0
            while (c != null && c.payeLe == null && c.statut != "annulee" && essais++ < 8) {
                contrat = c
                delay(3000)
                if (retourStripe) Api.confirmerPaiement(ecran.sessionStripe!!)
                c = Api.contrat(ecran.reservation)
            }
            if (c == null) erreur = "Ce contrat n'existe pas ou ne vous concerne pas." else contrat = c
        } catch (e: ErreurSundarly) { erreur = e.message } catch (e: Exception) { erreur = "Impossible de charger le contrat." }
    }

    val c = contrat
    val limite = Prix.instant(c?.limite)?.toEpochMilli()
    val annule = c?.statut == "annulee"
    val aSigner = c != null && c.role == "voyageur" && !annule && c.payeLe != null && c.accepteLe == null
    // Compte à rebours ; à zéro, on recharge un peu plus tard pour afficher l'annulation
    LaunchedEffect(aSigner, limite) {
        if (!aSigner || limite == null) return@LaunchedEffect
        while (true) {
            maintenant = System.currentTimeMillis()
            if (maintenant >= limite) { delay(65_000); recharger++; break }
            delay(1000)
        }
    }
    val reste = if (limite != null) ((limite - maintenant) / 1000).coerceAtLeast(0) else null

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            BoutonRetour({ etat.retour() })
            Spacer(Modifier.width(12.dp))
            Column {
                Text("Contrat de séjour", style = MaterialTheme.typography.titleLarge)
                if (c != null) Text("Réservation n° ${c.reference}", style = MaterialTheme.typography.bodySmall, color = Gris)
            }
        }
        val g = gabarit
        when {
            erreur != null && c == null -> Message("Oups…", erreur, "Réessayer") { recharger++ }
            c == null || g == null -> Chargement()
            else -> {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    when {
                        annule -> Bandeau("Réservation annulée. ${c.motifAnnulation.orEmpty()}", RougeFond, Rouge)
                        c.payeLe == null -> Bandeau("⏳ Paiement en cours de vérification… Cette page se met à jour automatiquement.", JauneFond, Jaune)
                        aSigner -> {
                            if (retourStripe) { Bandeau("✓ Paiement reçu, merci ! Il reste une étape : acceptez le contrat pour confirmer définitivement votre réservation.", VertFond, Vert); Spacer(Modifier.height(8.dp)) }
                            Bandeau(
                                "Dernière étape obligatoire : votre réservation n'est confirmée qu'après la signature de ce contrat." +
                                    (if (reste != null) " Il vous reste ${reste / 60}:${(reste % 60).toString().padStart(2, '0')} pour le signer, sinon la réservation sera annulée et remboursée." else ""),
                                JauneFond, Jaune,
                            )
                        }
                        c.accepteLe != null && retourStripe -> Bandeau("✓ Réservation confirmée ! Retrouvez-la à tout moment dans « Voyages ».", VertFond, Vert)
                        c.accepteLe == null -> Bandeau("En attente de la signature du voyageur" + (c.limite?.let { " (avant ${Prix.dateHeure(it)})" } ?: "") + ".", JauneFond, Jaune)
                    }
                }
                Spacer(Modifier.height(8.dp))
                val html = remember(g, c) { remplirContrat(g, c) }
                AndroidView(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    factory = { ctx -> WebView(ctx).apply { settings.javaScriptEnabled = false; setBackgroundColor(android.graphics.Color.WHITE) } },
                    update = { vue -> if (vue.tag != html) { vue.tag = html; vue.loadDataWithBaseURL(Api.SITE + "/", html, "text/html", "UTF-8", null) } },
                )
                Column(Modifier.background(Color.White).navigationBarsPadding()) {
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Ligne))
                    Box(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                        when {
                            aSigner -> BoutonRose("Lire et signer le contrat", Modifier.fillMaxWidth()) { signature = true }
                            c.accepteLe != null -> BoutonRose("Voir mes voyages", Modifier.fillMaxWidth()) { etat.accueil(Onglet.Voyages) }
                            else -> BoutonContour("Retour", Modifier.fillMaxWidth()) { etat.retour() }
                        }
                    }
                }
            }
        }
    }

    if (signature && c != null && aSigner) {
        var numero by rememberSaveable { mutableStateOf(c.pieceNumero.orEmpty()) }
        var accepte by rememberSaveable { mutableStateOf(false) }
        var occupe by remember { mutableStateOf(false) }
        var erreurSignature by remember { mutableStateOf<String?>(null) }
        val portee = rememberCoroutineScope()
        ModalBottomSheet(onDismissRequest = { signature = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Color.White) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 20.dp).imePadding().navigationBarsPadding()) {
                Text("Acceptation électronique du voyageur", style = MaterialTheme.typography.titleLarge, color = Rose)
                if (reste != null) Text("Temps restant : ${reste / 60}:${(reste % 60).toString().padStart(2, '0')}", style = MaterialTheme.typography.bodyMedium, color = Jaune, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(14.dp))
                Champ(numero, { numero = it.take(40) }, "Numéro de votre pièce d'identité", aide = "Tel qu'il figure sur votre pièce", majuscules = KeyboardCapitalization.Characters)
                Row(Modifier.clip(RoundedCornerShape(12.dp)).clickable { accepte = !accepte }.padding(top = 4.dp), verticalAlignment = Alignment.Top) {
                    Checkbox(checked = accepte, onCheckedChange = { accepte = it }, colors = CheckboxDefaults.colors(checkedColor = Rose))
                    Text(TEXTE_ACCEPTATION, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 12.dp))
                }
                erreurSignature?.let { Bandeau(it, RougeFond, Rouge, Modifier.padding(top = 12.dp)) }
                Spacer(Modifier.height(16.dp))
                BoutonRose("J'accepte le contrat et je confirme ma réservation", Modifier.fillMaxWidth(), actif = accepte, occupe = occupe) {
                    if (numero.trim().length < 4) { erreurSignature = "Indiquez le numéro de votre pièce d'identité."; return@BoutonRose }
                    portee.launch {
                        occupe = true; erreurSignature = null
                        try {
                            Api.accepterContrat(ecran.reservation, numero.trim())
                            contrat = Api.contrat(ecran.reservation) ?: contrat
                            signature = false
                        } catch (e: ErreurSundarly) { erreurSignature = e.message } catch (e: Exception) { erreurSignature = "L'acceptation n'a pas pu être enregistrée." }
                        occupe = false
                    }
                }
            }
        }
    }
}

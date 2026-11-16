package com.sundarly.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.Composable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import com.sundarly.app.ui.Ecran
import com.sundarly.app.ui.EcranCompte
import com.sundarly.app.ui.EcranContrat
import com.sundarly.app.ui.EcranFiche
import com.sundarly.app.ui.EcranGalerie
import com.sundarly.app.ui.EcranOnglets
import com.sundarly.app.ui.EcranPaiement
import com.sundarly.app.ui.EcranResultats
import com.sundarly.app.ui.EcranVerification
import com.sundarly.app.ui.Etat
import com.sundarly.app.ui.Onglet
import com.sundarly.app.ui.ThemeSundarly

class MainActivity : ComponentActivity() {
    private val etat: Etat by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) ouvrirLien(intent)
        setContent { ThemeSundarly { Application(etat) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        ouvrirLien(intent)
    }

    /** Un lien www.sundarly.com/logement/<nom> ouvre directement la fiche dans l'app. */
    private fun ouvrirLien(intent: Intent?) {
        val segments = intent?.data?.pathSegments.orEmpty()
        if (segments.size >= 2 && segments[0] == "logement") etat.ouvrir(Ecran.Fiche(slug = segments[1].lowercase()))
        // Raccourci d'essai : ouvrir directement un onglet (adb shell am start … --es onglet Profil)
        intent?.getStringExtra("onglet")?.let { nom -> Onglet.entries.firstOrNull { it.name == nom }?.let { etat.onglet = it } }
        if (intent?.getStringExtra("ecran") == "compte") etat.ouvrir(Ecran.Compte)
        if (intent?.getStringExtra("ecran") == "resultats") etat.ouvrir(Ecran.Resultats())
        // Dates de séjour transmises par un lien (ex. essai automatique, ou plus tard liens partagés)
        val arrivee = intent?.getStringExtra("arrivee")?.let { runCatching { java.time.LocalDate.parse(it) }.getOrNull() }
        val depart = intent?.getStringExtra("depart")?.let { runCatching { java.time.LocalDate.parse(it) }.getOrNull() }
        if (arrivee != null && depart != null && depart.isAfter(arrivee) && !arrivee.isBefore(java.time.LocalDate.now()))
            etat.recherche = etat.recherche.copy(arrivee = arrivee, depart = depart)
    }
}

/** Affiche l'écran du dessus de la pile, ou les onglets ; chaque écran garde sa position de défilement. */
@Composable
fun Application(etat: Etat) {
    BackHandler(enabled = etat.pile.isNotEmpty()) { etat.retour() }
    val etats = rememberSaveableStateHolder()
    val ecran = etat.pile.lastOrNull()
    val cle = if (ecran == null) "onglets" else "ecran-${etat.pile.size}-${ecran.hashCode()}"
    etats.SaveableStateProvider(cle) {
        when (ecran) {
            null -> EcranOnglets(etat)
            is Ecran.Resultats -> EcranResultats(etat, ecran)
            is Ecran.Fiche -> EcranFiche(etat, ecran)
            is Ecran.Galerie -> EcranGalerie(etat, ecran)
            is Ecran.Compte -> EcranCompte(etat)
            is Ecran.Verification -> EcranVerification(etat)
            is Ecran.Paiement -> EcranPaiement(etat, ecran)
            is Ecran.Contrat -> EcranContrat(etat, ecran)
        }
    }
}

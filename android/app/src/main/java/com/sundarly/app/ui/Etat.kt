package com.sundarly.app.ui

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sundarly.app.data.Annonce
import com.sundarly.app.data.Api
import com.sundarly.app.data.ErreurSundarly
import com.sundarly.app.data.Prix
import com.sundarly.app.data.Profil
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Les écrans qui s'empilent au-dessus des quatre onglets. */
sealed interface Ecran {
    data class Resultats(val titre: String? = null) : Ecran
    data class Fiche(val id: String? = null, val slug: String? = null) : Ecran
    data class Galerie(val photos: List<String>, val depart: Int) : Ecran
    data object Compte : Ecran
    data object Verification : Ecran
    data class Paiement(val url: String) : Ecran
    data class Contrat(val reservation: String, val sessionStripe: String? = null) : Ecran
}

enum class Onglet(val titre: String) { Explorer("Explorer"), Favoris("Favoris"), Voyages("Voyages"), Profil("Profil") }

/** Critères de recherche, gardés d'un écran à l'autre (comme les paramètres d'adresse du site). */
data class Recherche(
    val q: String = "", val arrivee: LocalDate? = null, val depart: LocalDate? = null,
    val voyageurs: Int = 0, val type: String = "",
)

class Etat(app: Application) : AndroidViewModel(app) {
    private val prefs = app.getSharedPreferences("sundarly", Context.MODE_PRIVATE)

    // Navigation
    val pile = mutableStateListOf<Ecran>()
    var onglet by mutableStateOf(Onglet.Explorer)
    fun ouvrir(e: Ecran) { pile.add(e) }
    fun retour(): Boolean = if (pile.isNotEmpty()) { pile.removeAt(pile.lastIndex); true } else false
    fun remplacer(e: Ecran) { if (pile.isNotEmpty()) pile.removeAt(pile.lastIndex); pile.add(e) }
    fun accueil(o: Onglet) { pile.clear(); onglet = o }

    // Devise d'affichage
    var devise by mutableStateOf(prefs.getString("devise", null)?.takeIf { it in Prix.DEVISES } ?: Prix.deviseParDefaut())
        private set
    fun choisirDevise(d: String) { devise = d; prefs.edit().putString("devise", d).apply() }
    fun prix(montant: Double, deviseAnnonce: String) = Prix.afficher(montant, deviseAnnonce, devise)

    // Favoris (gardés sur l'appareil, comme sur le site)
    var favoris by mutableStateOf(prefs.getStringSet("favoris", emptySet())!!.toSet())
        private set
    fun basculerFavori(id: String) {
        favoris = if (id in favoris) favoris - id else favoris + id
        prefs.edit().putStringSet("favoris", favoris).apply()
    }

    // Catalogue
    var catalogue by mutableStateOf<List<Annonce>>(emptyList())
        private set
    var chargement by mutableStateOf(true)
        private set
    var erreurCatalogue by mutableStateOf<String?>(null)
        private set
    var siteFerme by mutableStateOf(false)
        private set
    var recherche by mutableStateOf(Recherche())

    // Compte
    var connecte by mutableStateOf(Api.session != null)
        private set
    var profil by mutableStateOf<Profil?>(null)
        private set
    var admin by mutableStateOf(false)
        private set
    val email: String? get() = Api.session?.user?.email

    init {
        chargerCatalogue()
        if (connecte) viewModelScope.launch { rafraichirCompte() }
    }

    fun chargerCatalogue() {
        viewModelScope.launch {
            chargement = true; erreurCatalogue = null
            try {
                val ouvert = Api.siteOuvert()
                admin = Api.estAdmin()
                siteFerme = !ouvert && !admin
                catalogue = if (siteFerme) emptyList() else Api.catalogue().filter { it.statut == "en_ligne" || it.statut == "validee" || admin }
            } catch (e: ErreurSundarly) {
                erreurCatalogue = e.message
            } catch (e: Exception) {
                erreurCatalogue = "Impossible de charger les logements pour le moment."
            }
            chargement = false
        }
    }

    /** Relit la session et le profil (après connexion, envoi des pièces, etc.). */
    suspend fun rafraichirCompte(): Profil? {
        connecte = Api.session != null
        if (!connecte) { profil = null; admin = false; return null }
        return try {
            val p = Api.profil()
            profil = p; admin = Api.estAdmin(); connecte = Api.session != null
            p
        } catch (e: Exception) {
            connecte = Api.session != null
            if (!connecte) profil = null
            profil
        }
    }

    fun majProfil(p: Profil) { profil = p }

    fun deconnecter() {
        viewModelScope.launch { Api.deconnexion(); connecte = false; profil = null; admin = false }
    }

    /** Annonces qui correspondent à la recherche en cours. */
    fun resultats(): List<Annonce> {
        val r = recherche
        val q = Prix.simplifier(r.q.trim())
        return catalogue.filter { a ->
            (r.type.isEmpty() || a.typeLogement == r.type) &&
                (r.voyageurs == 0 || a.voyageurs >= r.voyageurs) &&
                (q.isEmpty() || Prix.simplifier("${a.ville} ${a.pays} ${a.titre} ${a.typeLogement}").contains(q))
        }
    }
}

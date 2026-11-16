package com.sundarly.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Une annonce : sert à la fois pour le catalogue (liste) et pour la fiche complète. */
@Serializable
data class Annonce(
    val id: String = "",
    val slug: String? = null,
    val statut: String = "",
    val titre: String = "",
    @SerialName("type_logement") val typeLogement: String = "",
    @SerialName("type_espace") val typeEspace: String? = null,
    val ville: String = "",
    val pays: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val voyageurs: Int = 1,
    val chambres: Int = 0,
    val lits: Int = 1,
    @SerialName("salles_de_bain") val sallesDeBain: Int = 0,
    val photos: List<String> = emptyList(),
    val devise: String = "EUR",
    @SerialName("prix_nuit") val prixNuit: Double = 0.0,
    @SerialName("frais_menage") val fraisMenage: Double = 0.0,
    @SerialName("frais_animaux") val fraisAnimaux: Double = 0.0,
    val caution: Double = 0.0,
    val equipements: List<String> = emptyList(),
    val accessibilite: List<String> = emptyList(),
    val securite: List<String> = emptyList(),
    @SerialName("created_at") val creeLe: String? = null,
    @SerialName("hote_prenom") val hotePrenom: String? = null,
    @SerialName("hote_verifie") val hoteVerifie: Boolean = false,
    @SerialName("hote_depuis") val hoteDepuis: String? = null,
    @SerialName("promo_nouvelle_active") val promoNouvelle: Boolean = false,
    @SerialName("reduction_semaine") val reductionSemaine: Int = 0,
    @SerialName("reduction_mois") val reductionMois: Int = 0,
    @SerialName("reduction_anticipee") val reductionAnticipee: Int = 0,
    @SerialName("anticipee_jours") val anticipeeJours: Int = 90,
    @SerialName("reduction_derniere_minute") val reductionDerniereMinute: Int = 0,
    @SerialName("derniere_minute_jours") val derniereMinuteJours: Int = 7,
    @SerialName("note_moyenne") val noteMoyenne: Double? = null,
    @SerialName("nb_avis") val nbAvis: Int = 0,
    // Champs de la fiche complète
    val description: String? = null,
    @SerialName("mon_logement") val monLogement: String? = null,
    @SerialName("acces_voyageurs") val accesVoyageurs: String? = null,
    @SerialName("echanges_voyageurs") val echangesVoyageurs: String? = null,
    @SerialName("autres_infos") val autresInfos: String? = null,
    @SerialName("nuits_min") val nuitsMin: Int? = null,
    @SerialName("nuits_max") val nuitsMax: Int? = null,
    @SerialName("nuits_min_ete") val nuitsMinEte: Int? = null,
    @SerialName("nuits_max_ete") val nuitsMaxEte: Int? = null,
    val annulation: String? = null,
    @SerialName("heure_arrivee") val heureArrivee: String? = null,
    @SerialName("heure_depart") val heureDepart: String? = null,
    val animaux: Boolean = false,
    val fumeurs: Boolean = false,
    val fetes: Boolean = false,
    val reglement: String? = null,
)

@Serializable
data class UnAvis(
    val prenom: String? = null,
    val date: String? = null,
    val note: Int = 5,
    val commentaire: String? = null,
    val reponse: String? = null,
)

@Serializable
data class AvisLogement(
    val nombre: Int = 0,
    val moyenne: Double? = null,
    val criteres: Map<String, Double?> = emptyMap(),
    val liste: List<UnAvis> = emptyList(),
)

@Serializable
data class Reservation(
    val id: String = "",
    val role: String = "voyageur",
    val titre: String = "",
    val ville: String = "",
    val photo: String? = null,
    val arrivee: String = "",
    val depart: String = "",
    val voyageurs: Int = 1,
    val total: Double = 0.0,
    @SerialName("montant_hote") val montantHote: Double = 0.0,
    val devise: String = "EUR",
    val statut: String = "",
    @SerialName("contrat_accepte_le") val contratAccepteLe: String? = null,
    @SerialName("contrat_limite") val contratLimite: String? = null,
    val motif: String? = null,
    val autre: String? = null,
)

@Serializable
data class Contrat(
    val reference: String = "",
    val role: String = "voyageur",
    val statut: String = "",
    @SerialName("paye_le") val payeLe: String? = null,
    val limite: String? = null,
    @SerialName("accepte_le") val accepteLe: String? = null,
    val preuve: String? = null,
    @SerialName("motif_annulation") val motifAnnulation: String? = null,
    @SerialName("hote_nom") val hoteNom: String? = null,
    val adresse: String? = null,
    val logement: String? = null,
    val titre: String? = null,
    val pays: String? = null,
    @SerialName("voyageur_nom") val voyageurNom: String? = null,
    @SerialName("piece_type") val pieceType: String? = null,
    @SerialName("piece_numero") val pieceNumero: String? = null,
    val arrivee: String = "",
    val depart: String = "",
    val voyageurs: Int = 1,
    val animaux: Boolean = false,
    val total: Double? = null,
    val devise: String = "EUR",
    @SerialName("heure_arrivee") val heureArrivee: String? = null,
    @SerialName("heure_depart") val heureDepart: String? = null,
    @SerialName("regle_animaux") val regleAnimaux: Boolean = false,
    @SerialName("frais_animaux") val fraisAnimaux: Double = 0.0,
    val fumeurs: Boolean = false,
    val fetes: Boolean = false,
    val reglement: String? = null,
    val caution: Double = 0.0,
    val annulation: String? = null,
)

@Serializable
data class Profil(
    val id: String = "",
    val prenom: String = "",
    val nom: String = "",
    val telephone: String? = null,
    val pays: String? = null,
    @SerialName("statut_verification") val statutVerification: String = "non_verifie",
    @SerialName("type_piece") val typePiece: String? = null,
)

/** Session de connexion (jetons Supabase). */
@Serializable
data class Session(
    @SerialName("access_token") val jeton: String = "",
    @SerialName("refresh_token") val jetonRafraichi: String = "",
    @SerialName("expires_at") val expireA: Long = 0,
    @SerialName("expires_in") val expireDans: Long = 3600,
    val user: Utilisateur = Utilisateur(),
)

@Serializable
data class Utilisateur(
    val id: String = "",
    val email: String? = null,
    @SerialName("user_metadata") val infos: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap(),
)

/** Erreur affichable telle quelle à l'utilisateur. */
class ErreurSundarly(message: String) : Exception(message)

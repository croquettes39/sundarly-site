package com.sundarly.app.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Accès aux données Sundarly : même base (Supabase) et mêmes fonctions serveur que le site.
 * La clé ci-dessous est la clé publique du site (elle est déjà dans assets/config.js).
 */
object Api {
    const val SITE = "https://www.sundarly.com"
    private const val SUPABASE = "https://gbdjiczesmhhsrqhvrgj.supabase.co"
    private const val CLE = "sb_publishable_ffvkq3kWc-XkUcBIbAfRsQ_2b0P68hn"
    const val AGENT = "SundarlyAndroid/1.0"

    val json = Json { ignoreUnknownKeys = true; coerceInputValues = true; explicitNulls = false; isLenient = true }
    private val JSON_TYPE = "application/json; charset=utf-8".toMediaType()
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS).readTimeout(40, TimeUnit.SECONDS).writeTimeout(90, TimeUnit.SECONDS)
        .build()

    private lateinit var prefs: SharedPreferences
    private val verrou = Mutex()

    @Volatile
    var session: Session? = null
        private set

    fun demarrer(contexte: Context) {
        prefs = contexte.applicationContext.getSharedPreferences("sundarly", Context.MODE_PRIVATE)
        session = prefs.getString("session", null)?.let { runCatching { json.decodeFromString<Session>(it) }.getOrNull() }
    }

    private fun enregistrer(s: Session?) {
        session = s
        prefs.edit().apply { if (s == null) remove("session") else putString("session", json.encodeToString(s)) }.apply()
    }

    // ---------- Requêtes ----------

    private class Reponse(val code: Int, val corps: String)

    private suspend fun appeler(
        methode: String, url: String, corps: String? = null, jeton: String? = null,
        entetes: Map<String, String> = emptyMap(), octets: ByteArray? = null, type: String? = null,
    ): Reponse = withContext(Dispatchers.IO) {
        val b = Request.Builder().url(url).header("User-Agent", AGENT)
        if (url.startsWith(SUPABASE)) {
            b.header("apikey", CLE)
            b.header("Authorization", "Bearer " + (jeton ?: CLE))
        } else if (jeton != null) b.header("Authorization", "Bearer $jeton")
        entetes.forEach { (k, v) -> b.header(k, v) }
        val envoi = when {
            octets != null -> octets.toRequestBody((type ?: "application/octet-stream").toMediaType())
            corps != null -> corps.toRequestBody(JSON_TYPE)
            methode == "POST" || methode == "PATCH" -> "{}".toRequestBody(JSON_TYPE)
            else -> null
        }
        b.method(methode, envoi)
        try {
            http.newCall(b.build()).execute().use { r -> Reponse(r.code, r.body?.string().orEmpty()) }
        } catch (e: IOException) {
            throw ErreurSundarly("Connexion impossible. Vérifiez votre connexion internet et réessayez.")
        }
    }

    private fun messageErreur(corps: String, defaut: String): String {
        val o = runCatching { json.parseToJsonElement(corps).jsonObject }.getOrNull() ?: return defaut
        for (cle in listOf("erreur", "message", "msg", "error_description")) {
            val v = (o[cle] as? JsonPrimitive)?.contentOrNull
            if (!v.isNullOrBlank()) return v
        }
        return defaut
    }

    /** Jeton valide de l'utilisateur connecté (renouvelé si besoin), ou null. */
    suspend fun jeton(): String? = verrou.withLock {
        val s = session ?: return@withLock null
        if (s.expireA - System.currentTimeMillis() / 1000 > 90) return@withLock s.jeton
        val r = appeler("POST", "$SUPABASE/auth/v1/token?grant_type=refresh_token",
            buildJsonObject { put("refresh_token", s.jetonRafraichi) }.toString())
        if (r.code in 200..299) {
            val n = avecExpiration(json.decodeFromString<Session>(r.corps))
            enregistrer(n); n.jeton
        } else {
            // Jeton refusé : la session est terminée ; une erreur réseau, elle, a déjà levé une exception
            if (r.code == 400 || r.code == 401 || r.code == 403) enregistrer(null)
            null
        }
    }

    private fun avecExpiration(s: Session) =
        if (s.expireA > 0) s else s.copy(expireA = System.currentTimeMillis() / 1000 + s.expireDans)

    private suspend fun rpcBrut(nom: String, params: JsonObject = JsonObject(emptyMap()), connecte: Boolean = false): JsonElement {
        val j = jeton()
        if (connecte && j == null) throw ErreurSundarly("Connectez-vous pour continuer.")
        val r = appeler("POST", "$SUPABASE/rest/v1/rpc/$nom", params.toString(), j)
        if (r.code !in 200..299) throw ErreurSundarly(messageErreur(r.corps, "Une erreur est survenue. Réessayez."))
        return if (r.corps.isBlank()) JsonNull else json.parseToJsonElement(r.corps)
    }

    // ---------- Catalogue ----------

    suspend fun siteOuvert(): Boolean = (rpcBrut("site_ouvert") as? JsonPrimitive)?.contentOrNull == "true"

    suspend fun estAdmin(): Boolean =
        if (session == null) false else runCatching { (rpcBrut("est_admin") as? JsonPrimitive)?.contentOrNull == "true" }.getOrDefault(false)

    suspend fun catalogue(): List<Annonce> {
        val e = rpcBrut("catalogue")
        return if (e is JsonNull) emptyList() else json.decodeFromJsonElement(e)
    }

    suspend fun idParSlug(slug: String): String? =
        (rpcBrut("annonce_par_slug", buildJsonObject { put("p_slug", slug.lowercase()) }) as? JsonPrimitive)?.contentOrNull

    suspend fun fiche(id: String): Annonce? {
        val e = rpcBrut("fiche_logement", buildJsonObject { put("annonce", id) })
        return if (e is JsonNull) null else json.decodeFromJsonElement<Annonce>(e)
    }

    suspend fun avis(id: String): AvisLogement {
        val e = rpcBrut("avis_logement", buildJsonObject { put("p_annonce", id) })
        return if (e is JsonNull) AvisLogement() else json.decodeFromJsonElement(e)
    }

    // ---------- Compte ----------

    suspend fun connexion(email: String, motDePasse: String) {
        val r = appeler("POST", "$SUPABASE/auth/v1/token?grant_type=password",
            buildJsonObject { put("email", email.trim().lowercase()); put("password", motDePasse) }.toString())
        if (r.code !in 200..299) throw ErreurSundarly(traduire(r.corps))
        enregistrer(avecExpiration(json.decodeFromString<Session>(r.corps)))
    }

    /** Crée le compte. Renvoie true si l'utilisateur est connecté tout de suite, false s'il doit confirmer son e-mail. */
    suspend fun inscription(email: String, motDePasse: String, prenom: String, nom: String, telephone: String, pays: String): Boolean {
        val corps = buildJsonObject {
            put("email", email.trim().lowercase()); put("password", motDePasse)
            put("data", buildJsonObject { put("prenom", prenom.trim()); put("nom", nom.trim()); put("telephone", telephone.trim()); put("pays", pays) })
        }
        val retour = java.net.URLEncoder.encode("$SITE/compte.html", "UTF-8")
        val r = appeler("POST", "$SUPABASE/auth/v1/signup?redirect_to=$retour", corps.toString())
        if (r.code !in 200..299) throw ErreurSundarly(traduire(r.corps))
        val o = json.parseToJsonElement(r.corps).jsonObject
        return if (o["access_token"] != null) { enregistrer(avecExpiration(json.decodeFromString<Session>(r.corps))); true } else false
    }

    suspend fun motDePasseOublie(email: String) {
        val retour = java.net.URLEncoder.encode("$SITE/compte.html", "UTF-8")
        val r = appeler("POST", "$SUPABASE/auth/v1/recover?redirect_to=$retour",
            buildJsonObject { put("email", email.trim().lowercase()) }.toString())
        if (r.code !in 200..299) throw ErreurSundarly(traduire(r.corps))
    }

    suspend fun deconnexion() {
        val j = session?.jeton
        enregistrer(null)
        if (j != null) runCatching { appeler("POST", "$SUPABASE/auth/v1/logout", "{}", j) }
    }

    private fun traduire(corps: String): String {
        val m = messageErreur(corps, "").lowercase()
        return when {
            "invalid login" in m -> "E-mail ou mot de passe incorrect."
            "email not confirmed" in m -> "Votre e-mail n'est pas encore confirmé : cliquez sur le lien reçu par e-mail (pensez aux spams)."
            "already registered" in m || "already been registered" in m -> "Un compte existe déjà avec cet e-mail. Connectez-vous."
            "rate limit" in m -> "Trop de tentatives. Patientez quelques minutes puis réessayez."
            "password" in m -> "Mot de passe trop faible : 8 caractères minimum."
            else -> "Une erreur est survenue. Vérifiez votre connexion et réessayez."
        }
    }

    /** Profil de l'utilisateur connecté ; créé à la première connexion comme sur le site. */
    suspend fun profil(): Profil {
        val j = jeton() ?: throw ErreurSundarly("Connectez-vous pour continuer.")
        val s = session!!
        val r = appeler("GET", "$SUPABASE/rest/v1/profils?id=eq.${s.user.id}&select=*", jeton = j)
        if (r.code !in 200..299) throw ErreurSundarly(messageErreur(r.corps, "Impossible de charger votre profil."))
        json.decodeFromString<List<Profil>>(r.corps).firstOrNull()?.let { return it }
        fun info(cle: String) = (s.user.infos[cle] as? JsonPrimitive)?.contentOrNull?.trim().orEmpty()
        val nouveau = buildJsonObject {
            put("id", s.user.id)
            put("prenom", info("prenom").ifEmpty { "Voyageur" })
            put("nom", info("nom").ifEmpty { "-" })
            put("telephone", info("telephone").ifEmpty { "000000" })
            info("pays").takeIf { it.isNotEmpty() }?.let { put("pays", it) }
        }
        val c = appeler("POST", "$SUPABASE/rest/v1/profils", nouveau.toString(), j, mapOf("Prefer" to "return=representation"))
        if (c.code !in 200..299) throw ErreurSundarly(messageErreur(c.corps, "Impossible de créer votre profil."))
        return json.decodeFromString<List<Profil>>(c.corps).first()
    }

    // ---------- Vérification d'identité ----------

    /** Envoie une photo (JPEG) dans le dossier privé des pièces d'identité. */
    suspend fun envoyerPiece(nom: String, jpeg: ByteArray) {
        val j = jeton() ?: throw ErreurSundarly("Connectez-vous pour continuer.")
        val r = appeler("POST", "$SUPABASE/storage/v1/object/pieces-identite/${session!!.user.id}/$nom",
            jeton = j, entetes = mapOf("x-upsert" to "false"), octets = jpeg, type = "image/jpeg")
        if (r.code !in 200..299) throw ErreurSundarly("L'envoi n'a pas abouti. Vérifiez votre connexion et réessayez.")
    }

    suspend fun declarerPiece(type: String, numero: String): Profil {
        val j = jeton() ?: throw ErreurSundarly("Connectez-vous pour continuer.")
        val corps = buildJsonObject {
            put("type_piece", type); put("numero_piece", numero); put("statut_verification", "en_cours")
            put("piece_envoyee_le", java.time.Instant.now().toString())
        }
        val r = appeler("PATCH", "$SUPABASE/rest/v1/profils?id=eq.${session!!.user.id}", corps.toString(), j, mapOf("Prefer" to "return=representation"))
        if (r.code !in 200..299) throw ErreurSundarly(messageErreur(r.corps, "L'envoi n'a pas abouti. Réessayez."))
        return json.decodeFromString<List<Profil>>(r.corps).first()
    }

    // ---------- Réservation, paiement, contrat ----------

    /** Crée la réservation (prix recalculé par la base) et renvoie l'adresse de paiement Stripe. */
    suspend fun reserver(annonce: String, arrivee: String, depart: String, voyageurs: Int, animal: Boolean): String {
        val j = jeton() ?: throw ErreurSundarly("Connectez-vous pour réserver.")
        val corps = buildJsonObject {
            put("annonce", annonce); put("arrivee", arrivee); put("depart", depart); put("voyageurs", voyageurs); put("animal", animal)
        }
        val r = appeler("POST", "$SITE/api/reserver", corps.toString(), j)
        val url = runCatching { json.parseToJsonElement(r.corps).jsonObject["url"]?.jsonPrimitive?.contentOrNull }.getOrNull()
        if (r.code !in 200..299 || url.isNullOrBlank()) throw ErreurSundarly(messageErreur(r.corps, "La réservation n'a pas pu être créée. Réessayez."))
        return url
    }

    /** Fait vérifier le paiement par le serveur (qui relit la session chez Stripe). */
    suspend fun confirmerPaiement(sessionStripe: String) {
        runCatching { appeler("POST", "$SITE/api/confirmer", buildJsonObject { put("session", sessionStripe) }.toString()) }
    }

    suspend fun reservations(): List<Reservation> {
        val e = rpcBrut("mes_reservations", connecte = true)
        return if (e is JsonNull) emptyList() else json.decodeFromJsonElement(e)
    }

    suspend fun contrat(reservation: String): Contrat? {
        val e = rpcBrut("contrat_reservation", buildJsonObject { put("p_reservation", reservation) }, connecte = true)
        return if (e is JsonNull) null else json.decodeFromJsonElement<Contrat>(e)
    }

    suspend fun accepterContrat(reservation: String, numeroPiece: String) {
        rpcBrut("accepter_contrat", buildJsonObject {
            put("p_reservation", reservation); put("p_numero_piece", numeroPiece)
            put("p_navigateur", "Application Android Sundarly (${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}, Android ${android.os.Build.VERSION.RELEASE})")
        }, connecte = true)
    }

    /** Modèle du contrat : le même fichier que le site, pour que le texte soit toujours identique. */
    suspend fun modeleContrat(): String {
        val r = appeler("GET", "$SITE/modeles/contrat-sejour.html")
        if (r.code !in 200..299 || r.corps.isBlank()) throw ErreurSundarly("Impossible de charger le contrat. Réessayez.")
        return r.corps
    }
}

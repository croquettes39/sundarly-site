package com.sundarly.app.data

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONObject
import java.util.Locale

/**
 * Langue de l'application : choix de la personne, sinon langue du téléphone, sinon langue du pays du téléphone.
 * Les textes restent écrits en français dans le code ; ils sont traduits à l'affichage (voir ui/Texte.kt)
 * avec les mêmes dictionnaires que le site (assets/langues/<langue>.json : texte français → traduction).
 */
object Langue {
    val LANGUES = linkedMapOf(
        "fr" to "Français", "en" to "English", "es" to "Español", "pt" to "Português",
        "de" to "Deutsch", "it" to "Italiano", "nl" to "Nederlands",
    )
    private val PAYS_FR = setOf("FR", "MA", "TN", "DZ", "BE", "LU", "MC", "HT", "GP", "MQ", "GF", "SN", "CI")
    private val PAYS_ES = setOf("ES", "MX", "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT", "HN", "NI", "PA", "PY", "PE", "PR", "UY", "VE")
    private val PAYS_PT = setOf("PT", "BR")
    private val PAYS_DE = setOf("DE", "AT", "CH", "LI")

    var code by mutableStateOf("fr")
        private set
    private var dico: Map<String, String> = emptyMap()
    private var morceaux: Regex? = null
    private val memo = HashMap<String, String>()
    private val NOMBRE = Regex("\\d+(?:[.,]\\d+)?")
    private val LETTRES = Regex("[A-Za-zÀ-ÿ]{2}")
    private val ESPACES = Regex("\\s+")

    fun parDefaut(): String {
        val l = Locale.getDefault()
        if (l.language in LANGUES) return l.language
        return when (l.country.uppercase(Locale.ROOT)) {
            in PAYS_FR -> "fr"
            in PAYS_ES -> "es"
            in PAYS_PT -> "pt"
            in PAYS_DE -> "de"
            "IT", "SM" -> "it"
            "NL", "SR" -> "nl"
            else -> "en"
        }
    }

    fun demarrer(contexte: Context) {
        val prefs = contexte.getSharedPreferences("sundarly", Context.MODE_PRIVATE)
        val choix = prefs.getString("langue", null)?.takeIf { it in LANGUES }
        charger(contexte, choix ?: parDefaut())
    }

    fun choisir(contexte: Context, langue: String) {
        if (langue !in LANGUES) return
        contexte.getSharedPreferences("sundarly", Context.MODE_PRIVATE).edit().putString("langue", langue).apply()
        charger(contexte, langue)
    }

    private fun charger(contexte: Context, langue: String) {
        var d: Map<String, String> = emptyMap()
        var m: Regex? = null
        if (langue != "fr") {
            try {
                val json = JSONObject(contexte.assets.open("langues/$langue.json").bufferedReader(Charsets.UTF_8).use { it.readText() })
                val t = json.getJSONObject("t")
                val carte = HashMap<String, String>(t.length() * 2)
                val cles = t.keys()
                while (cles.hasNext()) { val k = cles.next(); carte[k] = t.getString(k) }
                d = carte
                val f = json.optJSONArray("f")
                if (f != null) {
                    val liste = ArrayList<String>()
                    for (i in 0 until f.length()) { val k = f.getString(i); if (carte.containsKey(k)) liste.add(k) }
                    liste.sortByDescending { it.length }
                    if (liste.isNotEmpty()) {
                        m = Regex("(^|[^A-Za-zÀ-ÿ])(" + liste.joinToString("|") { Regex.escape(it) } + ")(?![A-Za-zÀ-ÿ])")
                    }
                }
            } catch (e: Exception) {
                d = emptyMap(); m = null
            }
        }
        synchronized(memo) { memo.clear(); dico = d; morceaux = m }
        code = langue
    }

    /** Locale pour les dates. */
    fun locale(): Locale = when (code) {
        "fr" -> Locale.FRANCE
        "en" -> if (Locale.getDefault().language == "en") Locale.getDefault() else Locale.US
        else -> Locale.forLanguageTag(code)
    }

    /** Traduit un texte écrit en français ; le rend tel quel s'il n'est pas connu (titres et descriptions des hôtes, etc.). */
    fun t(texte: String): String {
        if (code == "fr" || texte.isEmpty() || dico.isEmpty()) return texte
        if (texte.indexOf('\n') >= 0) return texte.split('\n').joinToString("\n") { ligne(it) }
        return ligne(texte)
    }

    private fun ligne(brut: String): String {
        synchronized(memo) { memo[brut]?.let { return it } }
        val resultat = traduire(brut)
        synchronized(memo) { if (memo.size > 4000) memo.clear(); memo[brut] = resultat }
        return resultat
    }

    private fun traduire(brut: String): String {
        val c = brut.replace(' ', ' ').replace(' ', ' ').replace(ESPACES, " ").trim()
        if (c.length < 2 || c.length > 1500 || !LETTRES.containsMatchIn(c)) return brut
        // une puce ou un symbole en tête (« • », « ✓ »…) est gardé tel quel
        val nombres = ArrayList<String>()
        val k = NOMBRE.replace(c) { nombres.add(it.value); "#" }
        var t: String? = dico[k]
        if (t == null && k.startsWith("• ")) dico[k.substring(2)]?.let { t = "• $it" }
        val m = morceaux
        if (t == null && m != null && c.length <= 400) {
            var couvert = 0
            val essai = m.replace(k) { r -> couvert += r.groupValues[2].length; r.groupValues[1] + (dico[r.groupValues[2]] ?: r.groupValues[2]) }
            if (couvert > 0 && !(k.length > 60 && couvert < k.length * 0.4)) t = essai
        }
        val trouve = t ?: return brut
        var i = 0
        val avecNombres = Regex("#").replace(trouve) { if (i < nombres.size) nombres[i++] else "#" }
        val debut = brut.takeWhile { it.isWhitespace() }
        val fin = brut.takeLastWhile { it.isWhitespace() }
        return if (debut.length + fin.length >= brut.length) avecNombres else debut + avecNombres + fin
    }
}

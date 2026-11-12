package com.sundarly.app.data

import java.text.Normalizer
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import java.util.TimeZone
import kotlin.math.roundToLong

/** Devises, prix, promotions et dates : mêmes règles que le site (assets/devise.js et voyageurs-commun.js). */
object Prix {
    val DEVISES = listOf("EUR", "MAD", "CHF")
    val NOMS_DEVISES = mapOf("EUR" to "€ EUR", "MAD" to "DH MAD", "CHF" to "CHF")
    private val TAUX = mapOf("EUR" to 1.0, "MAD" to 10.9, "CHF" to 0.94) // pour 1 €, taux indicatifs
    private val FR: Locale = Locale.FRANCE

    /** Euro par défaut ; dirham au Maroc ; franc suisse en Suisse. */
    fun deviseParDefaut(): String {
        val tz = TimeZone.getDefault().id
        val pays = Locale.getDefault().country
        return when {
            tz == "Africa/Casablanca" || tz == "Africa/El_Aaiun" || pays == "MA" -> "MAD"
            tz == "Europe/Zurich" || pays == "CH" -> "CHF"
            else -> "EUR"
        }
    }

    fun convertir(montant: Double, de: String, vers: String): Double = montant / (TAUX[de] ?: 1.0) * (TAUX[vers] ?: 1.0)

    private fun nombre(v: Double, decimales: Int): String =
        NumberFormat.getNumberInstance(FR).apply { minimumFractionDigits = decimales; maximumFractionDigits = decimales }.format(v)

    fun formater(montant: Double, devise: String, decimales: Int = 0): String {
        val n = nombre(if (decimales == 0) montant.roundToLong().toDouble() else montant, decimales)
        return when (devise) { "EUR" -> "$n €"; "MAD" -> "$n DH"; else -> "CHF $n" }
    }

    /** Prix d'une annonce (dans sa devise) affiché dans la devise choisie par le voyageur. */
    fun afficher(montant: Double, deviseAnnonce: String, deviseVoulue: String): String =
        formater(convertir(montant, deviseAnnonce, deviseVoulue), deviseVoulue)

    /** Montant exact, sans conversion (réservations, contrat). */
    fun exact(montant: Double, devise: String): String {
        val n = NumberFormat.getNumberInstance(FR).apply { maximumFractionDigits = 2 }.format(montant)
        return n + " " + when (devise) { "EUR" -> "€"; "MAD" -> "DH"; else -> devise }
    }

    fun pluriel(n: Int, un: String, plusieurs: String) = "$n " + if (n > 1) plusieurs else un

    fun nuits(arrivee: LocalDate?, depart: LocalDate?): Int {
        if (arrivee == null || depart == null) return 0
        return ChronoUnit.DAYS.between(arrivee, depart).toInt().coerceAtLeast(0)
    }

    /** Promotions (comme Airbnb) : la plus avantageuse s'applique, elles ne se cumulent pas. */
    fun promotion(a: Annonce, n: Int, arrivee: LocalDate?): Pair<Int, String>? {
        val liste = mutableListOf<Pair<Int, String>>()
        if (a.promoNouvelle) liste += 20 to "Promotion nouvelle annonce (-20 %)"
        if (n >= 28 && a.reductionMois > 0) liste += a.reductionMois to "Réduction au mois (-${a.reductionMois} %)"
        if (n >= 7 && a.reductionSemaine > 0) liste += a.reductionSemaine to "Réduction à la semaine (-${a.reductionSemaine} %)"
        if (arrivee != null) {
            val jours = ChronoUnit.DAYS.between(LocalDate.now(), arrivee)
            if (a.reductionAnticipee > 0 && jours >= a.anticipeeJours) liste += a.reductionAnticipee to "Réservation anticipée (-${a.reductionAnticipee} %)"
            if (a.reductionDerniereMinute > 0 && jours in 0..a.derniereMinuteJours) liste += a.reductionDerniereMinute to "Dernière minute (-${a.reductionDerniereMinute} %)"
        }
        return liste.maxByOrNull { it.first }
    }

    fun badgePromo(a: Annonce): String {
        if (a.promoNouvelle) return "-20 % · Nouvelle annonce"
        val m = maxOf(a.reductionSemaine, a.reductionMois, a.reductionAnticipee, a.reductionDerniereMinute)
        return if (m > 0) "Jusqu'à -$m %" else ""
    }

    class Sejour(val base: Double, val reduction: Double, val libelleReduction: String, val menage: Double, val animaux: Double) {
        val total get() = base - reduction + menage + animaux
    }

    /** Calcul du séjour : nuits × prix, réduction, ménage, animal — jamais de frais de service. */
    fun sejour(a: Annonce, n: Int, arrivee: LocalDate?, animal: Boolean): Sejour {
        val base = a.prixNuit * n
        val p = promotion(a, n, arrivee)
        return Sejour(base, if (p != null) base * p.first / 100 else 0.0, p?.second.orEmpty(), a.fraisMenage, if (animal && a.animaux) a.fraisAnimaux else 0.0)
    }

    fun note(a: Annonce): String =
        if (a.nbAvis > 0 && a.noteMoyenne != null) "★ " + nombre(a.noteMoyenne, 2) + " (${a.nbAvis})" else "★ Nouveau"

    fun decimal(v: Double, decimales: Int) = nombre(v, decimales)

    fun nomVille(v: String): String {
        val t = v.trim()
        if (t.contains("ourika", ignoreCase = true)) return "Vallée de l'Ourika"
        val s = StringBuilder()
        var debut = true
        for (c in t.lowercase(FR)) {
            s.append(if (debut && c.isLetter()) c.titlecaseChar() else c)
            debut = c == ' ' || c == '\'' || c == '-'
        }
        return s.toString()
    }

    /** Texte sans accents ni majuscules, pour la recherche. */
    fun simplifier(s: String): String =
        Normalizer.normalize(s.lowercase(FR), Normalizer.Form.NFD).replace(Regex("\\p{Mn}+"), "")

    // ---------- Dates ----------
    private val COURT = DateTimeFormatter.ofPattern("d MMM", FR)
    private val MOYEN = DateTimeFormatter.ofPattern("d MMM yyyy", FR)
    private val LONG = DateTimeFormatter.ofPattern("EEE d MMM yyyy", FR)
    private val MOIS = DateTimeFormatter.ofPattern("MMMM yyyy", FR)
    private val COMPLET = DateTimeFormatter.ofPattern("d MMMM yyyy", FR)
    private val DATE_HEURE = DateTimeFormatter.ofPattern("d MMM yyyy 'à' HH:mm", FR)

    fun jourCourt(d: LocalDate): String = d.format(COURT)
    fun jour(d: String): String = runCatching { LocalDate.parse(d.take(10)).format(MOYEN) }.getOrDefault(d)
    fun jourLong(d: String): String = runCatching { LocalDate.parse(d.take(10)).format(LONG) }.getOrDefault(d)
    fun instant(d: String?): Instant? = d?.let { runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull() ?: runCatching { Instant.parse(it) }.getOrNull() }
    fun moisAnnee(d: String?): String = instant(d)?.atZone(ZoneId.systemDefault())?.format(MOIS).orEmpty()
    fun dateComplete(i: Instant): String = i.atZone(ZoneId.systemDefault()).format(COMPLET)
    fun dateHeure(d: String?): String = instant(d)?.atZone(ZoneId.systemDefault())?.format(DATE_HEURE) ?: "—"

    /** « 15:00:00 » → « 15:00 » */
    fun heure(h: String?): String? = h?.trim()?.takeIf { it.isNotEmpty() }
}

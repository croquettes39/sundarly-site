package com.sundarly.app

import com.sundarly.app.data.Annonce
import com.sundarly.app.data.Api
import com.sundarly.app.data.Contrat
import com.sundarly.app.data.Prix
import com.sundarly.app.data.Reservation
import kotlinx.serialization.decodeFromString
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** Les calculs de l'app doivent donner les mêmes résultats que le site (assets/voyageurs-commun.js). */
class PrixTest {
    private val base = Annonce(id = "a", prixNuit = 100.0, devise = "EUR", fraisMenage = 30.0, fraisAnimaux = 15.0, animaux = true)

    @Test fun sejourSimple() {
        val s = Prix.sejour(base, 3, LocalDate.now().plusDays(30), false)
        assertEquals(300.0, s.base, 0.001); assertEquals(0.0, s.reduction, 0.001); assertEquals(330.0, s.total, 0.001)
    }

    @Test fun animalFactureSeulementSiAccepte() {
        assertEquals(345.0, Prix.sejour(base, 3, null, true).total, 0.001)
        assertEquals(330.0, Prix.sejour(base.copy(animaux = false), 3, null, true).total, 0.001)
    }

    @Test fun laMeilleurePromotionSApplique_sansCumul() {
        val a = base.copy(promoNouvelle = true, reductionSemaine = 10, reductionMois = 30)
        assertEquals(20, Prix.promotion(a, 7, null)!!.first)   // nouvelle annonce (-20) > semaine (-10)
        assertEquals(30, Prix.promotion(a, 28, null)!!.first)  // mois (-30) > nouvelle annonce (-20)
        val s = Prix.sejour(a, 7, null, false)
        assertEquals(140.0, s.reduction, 0.001); assertEquals(590.0, s.total, 0.001) // ménage jamais réduit
    }

    @Test fun promotionsSelonLaDateDArrivee() {
        val a = base.copy(reductionAnticipee = 12, anticipeeJours = 90, reductionDerniereMinute = 8, derniereMinuteJours = 7)
        assertEquals(12, Prix.promotion(a, 2, LocalDate.now().plusDays(120))!!.first)
        assertEquals(8, Prix.promotion(a, 2, LocalDate.now().plusDays(3))!!.first)
        assertNull(Prix.promotion(a, 2, LocalDate.now().plusDays(30)))
        assertNull(Prix.promotion(base, 10, LocalDate.now().plusDays(30)))
    }

    @Test fun devises() {
        assertEquals(1090.0, Prix.convertir(100.0, "EUR", "MAD"), 0.001)
        assertEquals(100.0, Prix.convertir(1090.0, "MAD", "EUR"), 0.001)
        assertEquals("700 DH", Prix.afficher(700.0, "MAD", "MAD"))
        assertEquals("64 €", Prix.afficher(700.0, "MAD", "EUR"))
        assertTrue(Prix.formater(1300.0, "CHF").startsWith("CHF 1"))
    }

    @Test fun textes() {
        assertEquals("Marrakech", Prix.nomVille("MARRAKECH"))
        assertEquals("Vallée de l'Ourika", Prix.nomVille("Vallée de l'Ourika – Marrakech"))
        assertEquals("1 nuit", Prix.pluriel(1, "nuit", "nuits")); assertEquals("2 nuits", Prix.pluriel(2, "nuit", "nuits"))
        assertEquals("★ Nouveau", Prix.note(base))
        assertEquals("★ 4,87 (12)", Prix.note(base.copy(nbAvis = 12, noteMoyenne = 4.87)))
        assertEquals("essaouira", Prix.simplifier("Éssaouira"))
        assertEquals(3, Prix.nuits(LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 4)))
    }

    @Test fun lectureDesReponsesDeLaBase() {
        // champs absents ou vides (null) : valeurs par défaut, sans plantage
        val a = Api.json.decodeFromString<List<Annonce>>("""[{"id":"x","titre":"Riad","prix_nuit":700,"devise":"MAD","photos":null,"frais_menage":null,"note_moyenne":null,"nb_avis":0,"latitude":31.63,"reduction_semaine":null,"champ_inconnu":1}]""").first()
        assertEquals(700.0, a.prixNuit, 0.001); assertTrue(a.photos.isEmpty()); assertEquals(0.0, a.fraisMenage, 0.001); assertEquals(0, a.reductionSemaine)
        val r = Api.json.decodeFromString<Reservation>("""{"id":"r","role":"voyageur","titre":"T","ville":"V","photo":null,"arrivee":"2026-12-01","depart":"2026-12-04","voyageurs":2,"total":1500.50,"montant_hote":1400,"devise":"MAD","statut":"confirmee","paye_le":"2026-11-12T10:00:00.123456+00:00","contrat_accepte_le":null,"contrat_limite":"2026-11-12T10:05:00+00:00","motif":null,"autre":"Sandra"}""")
        assertEquals("1 500,5 DH".replace(' ', ' '), Prix.exact(r.total, r.devise).replace(' ', ' ').replace(' ', ' '))
        val c = Api.json.decodeFromString<Contrat>("""{"reference":"SUN-2026-ABC123","role":"voyageur","statut":"confirmee","paye_le":"2026-11-12T10:00:00+00:00","limite":"2026-11-12T10:05:00+00:00","accepte_le":null,"total":1500,"devise":"MAD","arrivee":"2026-12-01","depart":"2026-12-04","voyageurs":2,"animaux":false,"regle_animaux":true,"frais_animaux":null,"caution":null,"fumeurs":false,"fetes":false}""")
        assertEquals(300_000L, Prix.instant(c.limite)!!.toEpochMilli() - Prix.instant(c.payeLe)!!.toEpochMilli())
    }
}

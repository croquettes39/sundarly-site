#!/usr/bin/env python3
"""Sundarly — génère le mode d'emploi d'installation de l'application Android dans chaque langue.
Usage : python3 outils/generer_mode_emploi.py <dossier des polices Plus Jakarta Sans (.ttf)>
Produit assets/mode-emploi-android-<langue>.jpg (1080 × 1920) et assets/mode-emploi-android-mini-<langue>.webp.
Le français garde les fichiers d'origine (mode-emploi-android.jpg et -mini.webp). assets/langue.js choisit le bon fichier.
Il faut Playwright (Chromium) et Pillow."""
import sys, os, base64, html
from playwright.sync_api import sync_playwright
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLICES = sys.argv[1] if len(sys.argv) > 1 else "."
def b(x): return "<b>" + x + "</b>"
def k(x): return '<span class="touche">' + x + "</span>"
ROSE = '<span class="rose">sundarly.com/app</span>'

T = {
 "en": dict(badge="HOW-TO GUIDE", h1a="Install the", h1b="Sundarly", h1c="app on Android",
  intro="5 steps, 2 minutes. The app is free and does not come from Google Play yet: that is why your phone asks you a few questions.",
  e=[("Download the app", "Scan the QR code with your camera, or open " + ROSE + " in Chrome."),
     ("Confirm the download", "If Chrome shows “File might be harmful”, tap " + k("Download anyway")),
     ("Open the file", "Tap " + k("Open") + " in the “Download complete” message, or open " + b("sundarly.apk") + " in your Downloads."),
     ("Allow the installation", "The first time: tap " + k("Settings") + ", turn on " + b("“Allow from this source”") + ", then go back."),
     ("Install and open", "Tap " + k("Install") + " then " + k("Open") + ". Create your account and book, with no service fees.")],
  note=b("“Unknown app” message from Google Play Protect?") + " That is normal as long as the app is not on Google Play: tap “More details”, then “Install anyway”.",
  q=b("A question?") + " info@sundarly.com", bientot="Coming soon to Google Play and iPhone."),
 "es": dict(badge="GUÍA DE USO", h1a="Instala la app", h1b="Sundarly", h1c="en Android",
  intro="5 pasos, 2 minutos. La aplicación es gratuita y todavía no viene de Google Play: por eso tu teléfono te hace algunas preguntas.",
  e=[("Descarga la aplicación", "Escanea el código QR con la cámara, o abre " + ROSE + " en Chrome."),
     ("Confirma la descarga", "Si Chrome indica «Este tipo de archivo puede ser peligroso», toca " + k("Descargar de todos modos")),
     ("Abre el archivo", "Toca " + k("Abrir") + " en el mensaje «Descarga completada», o abre " + b("sundarly.apk") + " en tus Descargas."),
     ("Autoriza la instalación", "La primera vez: toca " + k("Ajustes") + ", activa " + b("«Permitir de esta fuente»") + " y vuelve atrás."),
     ("Instala y abre", "Toca " + k("Instalar") + " y luego " + k("Abrir") + ". Crea tu cuenta y reserva, sin gastos de servicio.")],
  note=b("¿Mensaje «App desconocida» de Google Play Protect?") + " Es normal mientras la app no esté en Google Play: toca «Más detalles» y después «Instalar de todos modos».",
  q=b("¿Alguna pregunta?") + " info@sundarly.com", bientot="Próximamente en Google Play y en iPhone."),
 "pt": dict(badge="PASSO A PASSO", h1a="Instale o app", h1b="Sundarly", h1c="no Android",
  intro="5 passos, 2 minutos. O aplicativo é gratuito e ainda não vem do Google Play: por isso o seu celular faz algumas perguntas.",
  e=[("Baixe o aplicativo", "Escaneie o QR code com a câmera, ou abra " + ROSE + " no Chrome."),
     ("Confirme o download", "Se o Chrome mostrar «O arquivo pode ser perigoso», toque em " + k("Fazer o download mesmo assim")),
     ("Abra o arquivo", "Toque em " + k("Abrir") + " na mensagem «Download concluído», ou abra " + b("sundarly.apk") + " nos seus Downloads."),
     ("Autorize a instalação", "Na primeira vez: toque em " + k("Configurações") + ", ative " + b("«Permitir desta fonte»") + " e volte."),
     ("Instale e abra", "Toque em " + k("Instalar") + " e depois em " + k("Abrir") + ". Crie sua conta e reserve, sem taxas de serviço.")],
  note=b("Mensagem «App desconhecido» do Google Play Protect?") + " É normal enquanto o app não estiver no Google Play: toque em «Mais detalhes» e depois em «Instalar mesmo assim».",
  q=b("Dúvidas?") + " info@sundarly.com", bientot="Em breve no Google Play e no iPhone."),
 "de": dict(badge="ANLEITUNG", h1a="Die App", h1b="Sundarly", h1c="auf Android installieren",
  intro="5 Schritte, 2 Minuten. Die App ist kostenlos und kommt noch nicht aus Google Play: Deshalb stellt Ihr Handy ein paar Fragen.",
  e=[("App herunterladen", "QR-Code mit der Kamera scannen oder " + ROSE + " in Chrome öffnen."),
     ("Download bestätigen", "Wenn Chrome „Diese Datei kann schädlich sein“ anzeigt, tippen Sie auf " + k("Trotzdem herunterladen")),
     ("Datei öffnen", "Tippen Sie in der Meldung „Download abgeschlossen“ auf " + k("Öffnen") + " oder öffnen Sie " + b("sundarly.apk") + " in Ihren Downloads."),
     ("Installation erlauben", "Beim ersten Mal: auf " + k("Einstellungen") + " tippen, " + b("„Dieser Quelle vertrauen“") + " aktivieren, dann zurück."),
     ("Installieren und öffnen", "Auf " + k("Installieren") + " und dann " + k("Öffnen") + " tippen. Konto erstellen und buchen, ohne Servicegebühren.")],
  note=b("Meldung „Unbekannte App“ von Google Play Protect?") + " Das ist normal, solange die App nicht bei Google Play ist: auf „Weitere Details“ und dann „Trotzdem installieren“ tippen.",
  q=b("Fragen?") + " info@sundarly.com", bientot="Bald bei Google Play und für iPhone."),
 "it": dict(badge="GUIDA", h1a="Installa l'app", h1b="Sundarly", h1c="su Android",
  intro="5 passaggi, 2 minuti. L'app è gratuita e non arriva ancora da Google Play: per questo il telefono ti fa qualche domanda.",
  e=[("Scarica l'app", "Scansiona il codice QR con la fotocamera, oppure apri " + ROSE + " in Chrome."),
     ("Conferma il download", "Se Chrome mostra «Questo tipo di file può essere pericoloso», tocca " + k("Scarica comunque")),
     ("Apri il file", "Tocca " + k("Apri") + " nel messaggio «Download completato», oppure apri " + b("sundarly.apk") + " nei tuoi Download."),
     ("Autorizza l'installazione", "La prima volta: tocca " + k("Impostazioni") + ", attiva " + b("«Consenti da questa fonte»") + ", poi torna indietro."),
     ("Installa e apri", "Tocca " + k("Installa") + " poi " + k("Apri") + ". Crea il tuo account e prenota, senza costi di servizio.")],
  note=b("Messaggio «App sconosciuta» di Google Play Protect?") + " È normale finché l'app non è su Google Play: tocca «Altri dettagli», poi «Installa comunque».",
  q=b("Una domanda?") + " info@sundarly.com", bientot="Presto su Google Play e su iPhone."),
 "nl": dict(badge="HANDLEIDING", h1a="Installeer de app", h1b="Sundarly", h1c="op Android",
  intro="5 stappen, 2 minuten. De app is gratis en komt nog niet uit Google Play: daarom stelt je telefoon een paar vragen.",
  e=[("Download de app", "Scan de QR-code met je camera, of open " + ROSE + " in Chrome."),
     ("Bevestig de download", "Als Chrome ‘Dit bestand kan schadelijk zijn’ toont, tik op " + k("Toch downloaden")),
     ("Open het bestand", "Tik op " + k("Openen") + " in de melding ‘Download voltooid’, of open " + b("sundarly.apk") + " in je Downloads."),
     ("Sta de installatie toe", "De eerste keer: tik op " + k("Instellingen") + ", zet " + b("‘Toestaan van deze bron’") + " aan en ga terug."),
     ("Installeer en open", "Tik op " + k("Installeren") + " en dan " + k("Openen") + ". Maak je account aan en boek, zonder servicekosten.")],
  note=b("Melding ‘Onbekende app’ van Google Play Protect?") + " Dat is normaal zolang de app niet in Google Play staat: tik op ‘Meer details’ en dan ‘Toch installeren’.",
  q=b("Een vraag?") + " info@sundarly.com", bientot="Binnenkort op Google Play en iPhone."),
}
ICONES = [None,
 '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 '<path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4"/>',
 '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="2.6" fill="#D81B60"/>',
 '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>']

def police(nom, poids):
    d = base64.b64encode(open(os.path.join(POLICES, nom), "rb").read()).decode()
    return "@font-face{font-family:J;font-weight:%d;src:url(data:font/ttf;base64,%s)}" % (poids, d)

def page(t):
    qr = open(os.path.join(RACINE, "assets", "qr-app.svg"), encoding="utf-8").read()
    qr = qr[qr.index("<svg"):].replace('width="264" height="264"', 'viewBox="0 0 264 264"', 1)
    css = "".join(police(n, p) for n, p in [("jakarta_regular.ttf", 400), ("jakarta_medium.ttf", 500), ("jakarta_semibold.ttf", 600), ("jakarta_bold.ttf", 700), ("jakarta_extrabold.ttf", 800)])
    etapes = ""
    for i, (titre, texte) in enumerate(t["e"]):
        droite = '<div class="qr">' + qr + "</div>" if i == 0 else '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#D81B60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONES[i] + "</svg>"
        etapes += '<div class="etape"><span class="num">%d</span><div class="txt"><h2>%s</h2><p>%s</p></div>%s</div>' % (i + 1, titre, texte, droite)
    return """<!doctype html><html><head><meta charset="utf-8"><style>%s
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1920px;font-family:J,sans-serif;color:#231F20;background:#FCEEF3;position:relative;overflow:hidden;padding:88px 72px 0}
.rond{position:absolute;border-radius:50%%;background:#F8D3E0}.r1{width:760px;height:760px;right:-360px;top:-340px}.r2{width:700px;height:700px;left:-360px;bottom:-420px;background:#FDF5F8}
.tete{display:flex;justify-content:space-between;align-items:center;position:relative}
.logo{display:flex;align-items:center;gap:14px;color:#D81B60;font-weight:800;font-size:46px;letter-spacing:-1.5px}
.badge{background:#fff;color:#D81B60;font-weight:800;font-size:21px;letter-spacing:1.5px;padding:11px 20px;border-radius:999px}
h1{font-size:%dpx;line-height:1.02;font-weight:800;letter-spacing:-3px;margin-top:62px;position:relative}
h1 em{font-style:normal;color:#D81B60}
.intro{font-size:27px;line-height:1.38;color:#4A4346;margin:24px 0 46px;position:relative;font-weight:500;max-width:920px}
.etape{background:#fff;border-radius:34px;padding:32px 36px 32px 30px;display:flex;gap:26px;align-items:flex-start;margin-bottom:26px;position:relative;box-shadow:0 2px 10px rgba(216,27,96,.06)}
.num{flex:none;width:62px;height:62px;border-radius:50%%;background:#D81B60;color:#fff;font-weight:800;font-size:30px;display:flex;align-items:center;justify-content:center}
.txt{flex:1}h2{font-size:32px;font-weight:700;letter-spacing:-.8px;margin-bottom:8px}
p{font-size:24.500px;line-height:1.42;color:#4A4346;font-weight:500}
b{color:#231F20;font-weight:700}.rose{color:#D81B60;font-weight:700}
.touche{display:inline-block;background:#231F20;color:#fff;font-weight:700;font-size:21px;padding:3px 13px;border-radius:10px;white-space:nowrap}
.qr{flex:none;width:136px;height:136px}.qr svg{width:100%%;height:100%%}.ico{flex:none;width:56px;height:56px;margin-top:4px}
.note{background:#FFF4D6;border-radius:24px;padding:20px 28px;font-size:22.500px;line-height:1.4;color:#5A4A12;position:relative;font-weight:500;margin-top:4px}.note b{color:#3D3208}
.pied{position:absolute;left:72px;right:72px;bottom:64px;display:flex;justify-content:space-between;align-items:flex-end;font-size:23px;line-height:1.4;color:#4A4346;font-weight:500}
.pied .lien{color:#D81B60;font-weight:800;font-size:32px}
</style></head><body><div class="rond r1"></div><div class="rond r2"></div>
<div class="tete"><div class="logo"><svg width="54" height="54" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="15" r="6" stroke="currentColor" stroke-width="2.500"/><path d="M17 3v3M5 15h3M26 15h3M8.500 6.500l2 2M25.500 6.500l-2 2" stroke="currentColor" stroke-width="2.500" stroke-linecap="round"/><path d="M4 27c3-3 6-3 9 0s6 3 9 0 6-3 9 0" stroke="currentColor" stroke-width="2.500" stroke-linecap="round"/></svg>sundarly</div><span class="badge">%s</span></div>
<h1>%s<br><em>%s</em> %s</h1><p class="intro">%s</p>%s
<div class="note">%s</div>
<div class="pied"><div>%s<br>%s</div><div class="lien">sundarly.com/app</div></div></body></html>""" % (css, t.get("taille", 68), t["badge"], t["h1a"], t["h1b"], t["h1c"], t["intro"], etapes, t["note"], t["q"], t["bientot"])

with sync_playwright() as p:
    nav = p.chromium.launch()
    pg = nav.new_page(viewport={"width": 1080, "height": 1920})
    for l, t in T.items():
        pg.set_content(page(t)); pg.wait_for_timeout(300)
        bas = pg.evaluate("document.querySelector('.note').getBoundingClientRect().bottom")
        png = "/tmp/mode-emploi-%s.png" % l
        pg.screenshot(path=png)
        im = Image.open(png).convert("RGB")
        im.save(os.path.join(RACINE, "assets", "mode-emploi-android-%s.jpg" % l), quality=86, optimize=True)
        im.resize((240, 427), Image.LANCZOS).save(os.path.join(RACINE, "assets", "mode-emploi-android-mini-%s.webp" % l), quality=80)
        print(l, "bas de la note :", round(bas), "(doit rester sous 1760)")
    nav.close()

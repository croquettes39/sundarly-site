# Sundarly — génère les e-mails de relance "vérification d'identité" (HTML, compatible Gmail/Outlook/GMX)
import sys, html, pathlib
SITE = "https://www.sundarly.com"
ROSE, ENCRE, GRIS, PALE = "#D81B60", "#1F1A1D", "#6B6268", "#FFF3F7"

def email(prenom, titre, intro, bouton, lien, etapes, note):
    p = html.escape(prenom)
    li = "".join(f'''<tr><td width="34" valign="top" style="padding:0 0 14px 0"><div style="width:26px;height:26px;border-radius:13px;background:{ROSE};color:#fff;font:700 14px/26px Arial,sans-serif;text-align:center">{i}</div></td>
<td valign="top" style="padding:3px 0 14px 8px;font:15px/22px Arial,sans-serif;color:{ENCRE}">{e}</td></tr>''' for i, e in enumerate(etapes, 1))
    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(titre)}</title></head>
<body style="margin:0;padding:0;background:#F6F1F3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1F3"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">
 <tr><td style="background:{ROSE};padding:26px 32px" align="left">
   <table role="presentation" cellpadding="0" cellspacing="0"><tr>
     <td><img src="{SITE}/assets/logo-512.png" width="44" height="44" alt="" style="display:block;border:0;border-radius:11px"></td>
     <td style="padding-left:12px;font:800 26px/1 Arial,sans-serif;color:#ffffff;letter-spacing:-0.5px">sundarly</td>
   </tr></table>
 </td></tr>
 <tr><td style="padding:38px 36px 8px 36px">
   <p style="margin:0 0 8px;font:700 13px/1 Arial,sans-serif;color:{ROSE};letter-spacing:1.2px;text-transform:uppercase">Dernière étape</p>
   <h1 style="margin:0 0 18px;font:800 27px/34px Arial,sans-serif;color:{ENCRE}">{titre.replace("{p}", p)}</h1>
   <p style="margin:0 0 16px;font:16px/25px Arial,sans-serif;color:{ENCRE}">{"Bonjour " + p + "," if p else "Bonjour,"}</p>
   {intro}
 </td></tr>
 <tr><td align="center" style="padding:14px 36px 30px 36px">
   <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="{ROSE}" style="border-radius:999px">
     <a href="{lien}" style="display:inline-block;padding:17px 38px;font:700 17px/1 Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px">{bouton}</a>
   </td></tr></table>
   <p style="margin:12px 0 0;font:13px/18px Arial,sans-serif;color:{GRIS}">Cela prend environ 2 minutes.</p>
 </td></tr>
 <tr><td style="padding:0 36px 10px 36px">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PALE};border-radius:16px"><tr><td style="padding:22px 22px 8px 22px">
     <p style="margin:0 0 14px;font:700 16px/22px Arial,sans-serif;color:{ENCRE}">Comment ça marche</p>
     <table role="presentation" cellpadding="0" cellspacing="0">{li}</table>
   </td></tr></table>
 </td></tr>
 <tr><td style="padding:22px 36px 34px 36px">
   <p style="margin:0 0 16px;font:14px/21px Arial,sans-serif;color:{GRIS}">🔒 {note}</p>
   <p style="margin:0;font:16px/25px Arial,sans-serif;color:{ENCRE}">À très vite sur Sundarly,<br><strong>L'équipe Sundarly</strong></p>
 </td></tr>
 <tr><td style="background:{ENCRE};padding:24px 36px" align="center">
   <p style="margin:0 0 6px;font:800 18px/1 Arial,sans-serif;color:#ffffff">sundarly</p>
   <p style="margin:0 0 10px;font:13px/19px Arial,sans-serif;color:#D9CFD4">Locations de vacances en Europe, au Maroc et en Tunisie<br>0 % de frais de service pour les voyageurs</p>
   <p style="margin:0;font:12px/18px Arial,sans-serif;color:#A99BA2">Une question ? Répondez simplement à cet e-mail ou écrivez à <a href="mailto:info@sundarly.com" style="color:#FF8FB8;text-decoration:none">info@sundarly.com</a><br><a href="{SITE}" style="color:#FF8FB8;text-decoration:none">www.sundarly.com</a></p>
 </td></tr>
</table>
</td></tr></table></body></html>'''

NOTE = "Vos documents sont envoyés de façon chiffrée et ne sont jamais montrés aux voyageurs. Seule l'équipe Sundarly les consulte, uniquement pour vérifier votre identité."

def relance(prenom):
    intro = f'''<p style="margin:0 0 16px;font:16px/25px Arial,sans-serif;color:{ENCRE}">Merci d'avoir rejoint Sundarly ! Votre compte est prêt, il ne manque plus qu'une chose : <strong>la vérification de votre identité</strong>.</p>
   <p style="margin:0 0 16px;font:16px/25px Arial,sans-serif;color:{ENCRE}">Chez Sundarly, chaque hôte et chaque voyageur est vérifié. C'est ce qui permet à notre communauté d'accueillir et de voyager en toute confiance, sans faux profils ni arnaques. <strong>Sans cette étape, vous ne pourrez ni publier d'annonce ni réserver un logement.</strong></p>
   <p style="margin:0 0 6px;font:16px/25px Arial,sans-serif;color:{ENCRE}">Les réservations ouvrent le <strong>20 novembre</strong> : faites-le dès maintenant pour être prêt(e) le jour J, et profitez de <strong>0 % de commission sur vos 3 premières réservations</strong>.</p>'''
    etapes = ["Connectez-vous à votre compte Sundarly.", "Choisissez votre pièce d'identité et prenez-la en photo (recto, et verso si besoin).", "Ajoutez un selfie, visage bien visible. Notre équipe valide en général sous 48 h."]
    return email(prenom, "{p}, plus qu'une étape avant d'accueillir vos premiers voyageurs", intro, "Vérifier mon identité", f"{SITE}/verification.html?retour=espace-hote.html", etapes, NOTE)

def activer(prenom):
    intro = f'''<p style="margin:0 0 16px;font:16px/25px Arial,sans-serif;color:{ENCRE}">Vous avez commencé à créer votre compte Sundarly, mais votre adresse e-mail n'a pas encore été confirmée : votre compte n'est donc pas encore actif.</p>
   <p style="margin:0 0 6px;font:16px/25px Arial,sans-serif;color:{ENCRE}">Inscrivez-vous à nouveau avec <strong>la même adresse e-mail</strong> : vous recevrez un nouveau lien de confirmation. Ensuite, il ne restera qu'à vérifier votre identité, <strong>obligatoire pour publier une annonce ou réserver</strong>. Les réservations ouvrent le <strong>20 novembre</strong>.</p>'''
    etapes = ["Cliquez sur le bouton ci-dessous et inscrivez-vous avec cette adresse e-mail.", "Ouvrez l'e-mail de confirmation reçu (pensez aux spams) et cliquez sur le lien.", "Vérifiez votre identité : une pièce d'identité et un selfie, en 2 minutes."]
    return email(prenom, "Activez votre compte Sundarly", intro, "Activer mon compte", f"{SITE}/compte.html?mode=inscription", etapes, NOTE)

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    (out / "modele-relance-identite.html").write_text(relance("Prénom"), encoding="utf-8")
    (out / "modele-activation-compte.html").write_text(activer(""), encoding="utf-8")

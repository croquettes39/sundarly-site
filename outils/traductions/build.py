import json,re,os,glob
L=json.load(open('/tmp/w/liste.json'))['L']; nh=json.load(open('/tmp/w/liste.json'))['nh']
ANC={724:"Le prix affiché est le prix que vous payez. Pas de mauvaise surprise au moment de payer.",725:"Destinations à découvrir",726:"Vous payez sur Sundarly ; l'adresse exacte et les coordonnées de l'hôte vous sont transmises après la réservation.",727:"L'inscription est gratuite. Créez votre compte hôte, publiez votre annonce en quelques minutes et ne payez que # % de commission sur le prix des nuits (# % sur vos # premières réservations pendant le lancement). Le ménage vous revient en entier.",728:"Quand partir ?",729:"# € de frais de service",730:"Hôtes vérifiés",731:"Publiez-le gratuitement et gardez # % de vos revenus : # % de commission seulement, sur les nuits. # % sur vos # premières réservations.",732:"Chaque hôte fait vérifier son identité avant de publier son logement.",733:"Choisissez vos dates et le nombre de voyageurs, puis réservez directement sur Sundarly. Le paiement est sécurisé et les coordonnées de l'hôte vous sont transmises dès que la réservation est confirmée et payée.",734:"Paiement sécurisé",735:"La Médina"}
langs=['en','es','pt','de','it','nl']; D={l:{} for l in langs}; frag=set(); err=0; vus=set()
for f in sorted(glob.glob('/tmp/w/tr/c*.txt')):
    for n,line in enumerate(open(f,encoding='utf-8'),1):
        line=line.rstrip('\n')
        if not line.strip(): continue
        p=[x.strip() for x in line.split(' ¦ ')]
        if len(p)!=7: print('ERR champs',f,n,len(p),line[:60]); err+=1; continue
        if p[0].startswith('K:'): k=p[0][2:]; js=True
        else:
            i=int(p[0]); k=ANC.get(i,L[i]); js=i>=nh; vus.add(i)
        for l,v in zip(langs,p[1:]):
            if k.count('#')!=v.count('#') : print('ERR #',f,n,l,k[:50],'|',v[:50]); err+=1
            D[l][k]=v
        if js and 3<=len(k)<=90: frag.add(k)
# petits mots et libellés utiles aussi comme morceaux
for k in list(D['en']):
    if len(k)<=40 and k not in frag and re.fullmatch(r"[A-Za-zÀ-ÿ' \-]+",k) and len(k)>=4 and k[0].isupper(): frag.add(k)
os.makedirs('assets/langues',exist_ok=True)
for l in langs:
    json.dump({'t':D[l],'f':sorted(frag)},open(f'assets/langues/{l}.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print('entrées',len(D['en']),'morceaux',len(frag),'erreurs',err)
manq=[(i,k) for i,k in enumerate(L) if i not in vus and k not in D['en']]
print('non traduits',len(manq)); print([k[:30] for i,k in manq if re.search(r'[a-zéè]{4}',k)][:120])

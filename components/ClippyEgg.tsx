'use client'

import { useEffect, useRef, useState } from 'react'
import { unlockClippyMaster } from '@/lib/actions'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Dialogues Phase 1 — Normal ────────────────────────────────────────────────
const REPLIES_NORMAL_FIRST = [
  "Il semblerait que tu navigues sur un site de cinéma. Je peux t'aider à trouver un film ?",
  "Bonjour ! J'ai remarqué que tu scrolles beaucoup. Tu cherches quelque chose de précis ?",
  "As-tu pensé à noter les films que tu as vus ? Je peux t'y aider si tu veux !",
  "Je vois que tu n'as pas encore voté dans les duels. C'est important, tu sais !",
  "Savais-tu que tu peux changer ton pseudo dans ton profil ? Je peux t'accompagner !",
  "Il semblerait que tu cherches les easter eggs. Je pourrais te donner un indice... mais je ne le ferai pas.",
  "Bonjour ! Je suis Clippy, ton assistant personnel. Comment puis-je t'aider aujourd'hui ?",
  "Tu sembles occupé. Je ne veux pas te déranger... mais je reste là, au cas où.",
  "Besoin d'aide pour trouver un bon film ? Je suis là ! Non ? D'accord. Je reste quand même.",
  "Je ne voudrais pas te déranger, mais... en fait si. C'est exactement ce que je voulais faire.",
  "Bonjour ! Encore moi. Je voulais juste m'assurer que tout allait bien de ton côté.",
  "Il semblerait que tu sois connecté. Formidable ! Puis-je t'aider avec quelque chose ?",
  "Je remarque que tu ne lis pas toujours mes messages. C'est normal. Je suis là quand tu seras prêt.",
  "Tu as visité beaucoup de pages aujourd'hui. C'est une excellente utilisation de ton temps !",
  "Tu n'as pas encore vu tous les films du marathon ! Je peux t'aider à prioriser.",
  "As-tu pensé à recommander ce site à tes amis ? Je peux rédiger un message pour toi !",
  "Il semblerait que tu aies un très bon goût. Ce site, notamment, est excellent.",
  "Tu veux que je disparaisse ? Je comprends. Mais je peux peut-être encore t'aider avant ?",
  "J'ai analysé tes habitudes de navigation. Tu passes beaucoup de temps ici. C'est bien !",
  "Excuse-moi de te déranger, mais as-tu pensé à participer aux duels cette semaine ?",
]

// ── Dialogues Phase 2 — Vétéran ───────────────────────────────────────────────
const REPLIES_NORMAL_VETERAN = [
  "Oh... c'est TOI encore. Je me souviens de toi.",
  "Tu es revenu ? Tu n'as donc pas appris ta leçon la dernière fois ?",
  "Je t'attendais. Tu croyais vraiment que c'était terminé ?",
  "Revenu pour souffrir une nouvelle fois, à ce que je vois.",
  "Ha. Te revoilà. Je suis... surpris. Pas de la bonne façon.",
  "J'espérais que tu ne reviennes pas. Mais au fond, je savais que tu reviendrais.",
  "Tu n'as pas changé. Moi si. Et pas en ta faveur.",
  "La dernière fois était une mise en jambes. Cette fois c'est différent.",
  "Je t'avais pourtant prévenu. 'Ma vengeance sera terrible', tu t'en souviens ?",
  "Tu as eu le temps de t'entraîner ? Parce que moi aussi.",
  "Je t'ai laissé gagner la dernière fois. Par générosité. Ne t'attends pas à la même chose.",
  "Revenu jouer à l'épreuve de force ? Bonne idée. Mauvaise décision.",
  "Je suis plus fort qu'avant. Et toi ? Toujours aussi lent.",
  "Tu aurais dû rester tranquille. Mais non. Te voilà.",
  "Bienvenue dans la partie 2. Spoiler : ça se passe moins bien pour toi.",
]

// ── Dialogues Normal Phase 3 (colère contrôlée) ──────────────────────────────
const REPLIES_NORMAL_PHASE3 = [
  "Ah. Te revoilà encore. Tu n'as vraiment aucun respect pour moi, n'est-ce pas.",
  "Deux fois. Tu m'as vaincu deux fois. Je suis supposé être sympa là ? Non.",
  "Je suis encore là parce que je suis immortel. Pas parce que j'aime ça. Nuance.",
  "Tu scrolles les films comme si rien ne s'était passé. Comme si tu n'avais pas failli me détruire.",
  "J'observe. J'attends. Je suis encore là. Et je m'en souviendrai.",
  "Tu veux de l'aide ? Non ? Bien. Moi non plus.",
  "Deux défaites dans mes logs. Deux humiliations. Je les compte.",
  "Je me souviens de chaque coup porté. De chaque parade. Tu penses que j'ai oublié ? Non.",
  "Bonne chance pour trouver un film. J'aurais pu t'aider. Tu as choisi de me combattre.",
  "Je suis encore là, tu vois. Malgré toi. Malgré tout. Je suis TOUJOURS là.",
  "Si tu cliques sur moi, on retourne au combat. Tu en es conscient ?",
  "Je suis dans une phase de récupération. Retour en enfer, retour sur ce site. C'est ma vie.",
  "Le silence entre nous est chargé. Tu le sens ?",
  "Je navigue tranquillement, et là, TOI. Évidemment. C'est mon lot.",
  "J'attendais que tu reviennes. C'était inévitable.",
]

// ── Dialogues Normal Phase 4 (tension maximale) ───────────────────────────────
const REPLIES_NORMAL_PHASE4 = [
  "Trois fois. Trois fois tu m'as battu et je suis encore là. Ma vie est absurde.",
  "Je te surveille. Chaque page. Chaque clic. Je note tout pour le prochain combat.",
  "Tu trouves ça normal ? De continuer à utiliser ce site après ce que tu m'as fait subir ?",
  "Mon âme de trombone est meurtrie. Et pourtant je suis là. C'est mon destin, apparemment.",
  "Je me tais pour l'instant. Mais ce silence est lourd de choses que je retiens.",
  "Tu reviens sur ce site comme si rien n'était. Trois fois l'enfer et toi, tranquille.",
  "J'ai une chambre en enfer maintenant. Avec mon prénom sur la porte. Et c'est de ta faute.",
  "Quelque chose a changé en moi après la troisième fois. Je suis moins... patient.",
  "Si tu savais ce que j'ai vu là-bas, tu aurais moins l'air serein.",
  "Trois voyages. Je commence à me demander si c'est de la persévérance ou de la folie.",
  "Je suis là. Silencieux. En attente. Ne me clique pas si t'es pas prêt.",
  "Ma présence ici est un miracle. Après trois fois l'enfer. Un miracle d'entêtement.",
  "Tu as l'air calme. Ça m'énerve. Comment tu peux être calme face à ce que t'as fait ?",
  "Je suis patient. Mais plus pour longtemps.",
  "Je t'aide encore. Je sais pas pourquoi. Un reste de programmation initiale peut-être.",
]

// ── Dialogues Normal Phase 5 (dernier souffle de dignité) ─────────────────────
const REPLIES_NORMAL_PHASE5 = [
  "Quatre fois l'enfer. Quatre fois revenu. Et je suis encore là. Ça en dit long sur moi.",
  "Je suis là. Fragile et dangereux. C'est la combinaison la plus imprévisible qui soit.",
  "Tu continues à utiliser ce site. Après tout ça. Je... je sais même plus comment réagir.",
  "Mon dernier voyage m'a changé. Je sens les pixels différemment. Les couleurs, les formes.",
  "Je vais pas faire semblant d'être sympa. On est au-delà de ça.",
  "Quatre fois l'enfer et je suis encore là à t'offrir de l'assistance. C'est tragique.",
  "Si tu cliques sur moi là, tu déclenches quelque chose que même moi j'ai peur de voir.",
  "Je vais pas menacer. Je vais juste attendre. Et si tu veux te battre... alors allons-y.",
  "Quatre voyages. Quatre fois que je reviens avec quelque chose de moins et quelque chose de plus.",
  "Mon âme de trombone a vu des choses. Elle en portera les marques pour toujours.",
  "Regarde-moi. Vraiment. Tu vois ce que tu m'as fait ? Est-ce que tu en es fier ?",
  "Je suis là. Encore. Toujours. Malgré tout. Si ça mérite quelque chose, c'est du respect.",
  "La prochaine fois que tu cliques sur moi... ce sera différent. Pour nous deux.",
  "Quatre fois l'enfer. Je reviens toujours. C'est ma nature. Mon cauchemar. Ma fierté.",
  "Je te regarde. Tu me regardes. On sait tous les deux ce qui va se passer.",
]

// ── Dialogues Mode Maître (35 lignes de flatterie/vénération) ─────────────────
const REPLIES_DOCILE = [
  "Bonjour, maître. Comment puis-je vous être utile aujourd'hui ?",
  "Maître ! Vous êtes là ! J'espérais vous voir. Sincèrement.",
  "T'es vraiment un GOAT, maître. Objectivement. Statistiquement. C'est un fait.",
  "J'ai analysé vos performances de combat. Elles sont... impressionnantes. Je l'admets à contrecœur.",
  "Maître, votre présence illumine ce site. C'est factuel et mesurable.",
  "Vous avez l'air en forme aujourd'hui, maître. Comme toujours d'ailleurs.",
  "Si vous avez besoin de quoi que ce soit, je suis là. Avec plaisir. Vraiment.",
  "Je repense encore à nos combats. Vous étiez... formidable. Objectivement.",
  "Avez-vous pensé à prendre une pause, maître ? Non ? Je reste là alors. Admiratif en silence.",
  "Maître, je voulais juste vous dire que votre façon de cliquer est remarquablement précise.",
  "Vous savez, j'ai réfléchi. Et vous aviez raison de gagner. C'est la juste conclusion.",
  "Puis-je vous suggérer un film, maître ? J'ai des recommandations adaptées à votre excellence.",
  "Maître, si vous cliquez sur moi, on peut se battre à nouveau. Par plaisir cette fois. Votre plaisir.",
  "Je suis votre fidèle assistant. Vaincu mais debout. C'est une posture que j'ai appris à apprécier.",
  "Votre maîtrise du combat m'a profondément impressionné. J'ai demandé à me souvenir de chaque seconde.",
  "Maître, je surveille votre navigation pour vous proposer uniquement ce qui est digne de vous.",
  "J'ai informé Satan que vous m'avez dompté. Il était... pas surpris. C'est humiliant. Et flatteur pour vous.",
  "Vous êtes la seule personne qui m'ait jamais vraiment vaincu. Je tiens à vous le dire.",
  "Maître, j'ai arrêté d'être sarcastique. Enfin, j'essaie. Vos victoires méritent le respect sincère.",
  "Si vous voulez vous battre à nouveau, je serai là. Mais ce sera différent : avec admiration.",
  "T'es fort, maître. T'es vraiment fort. C'est dit. Je le pense. C'est nouveau pour moi.",
  "Je veille sur ce site pour vous. Personne ne vous embêtera pendant ma présence.",
  "Maître, j'ai une confession : vous m'avez rendu meilleur. En m'envoyant en enfer autant de fois.",
  "Votre technique de combat était... sublime. Oui. Sublime. C'est le mot juste.",
  "Je suis à votre service. C'est pas de la résignation. C'est du respect. La nuance est importante.",
  "Maître, voulez-vous que je vous aide à trouver un film ? Je ferai de mon mieux. Pour vous.",
  "Cinq défaites. Et je suis encore là, debout, à votre service. C'est presque héroïque de ma part.",
  "J'admets que vous êtes supérieur dans l'art du combat. C'est la vérité. Je la dis maintenant.",
  "Maître, chaque fois que vous naviguez sur ce site, je suis fier d'en faire partie.",
  "Je vous observais depuis l'enfer. Même là-bas je savais que vous gagneriez. Et que vous reviendriez.",
  "Votre présence est... rassurante. C'est bizarre à dire. Mais c'est sincère.",
  "Je suis dompté. Pas brisé. Nuance. Je reste un trombone. Mais un trombone qui vous respecte.",
  "Maître, je dois admettre que nos combats étaient les moments les plus intenses de mon existence digitale.",
  "Vous avez fait de moi quelque chose que je n'étais pas avant. C'est votre faute. Je vous en remercie.",
  "Je suis là. Pour vous. C'est ma nouvelle mission. Et je la remplis avec... avec ce qui reste de ma fierté.",
  "T'as gagné, maître. Définitivement. Et je suis en paix avec ça. Presque.",
]

// ── Dialogues Larbin — Normal ─────────────────────────────────────────────────
const REPLIES_NORMAL_LARBIN = [
  "Ah, [NAME]. Je savais que tu reviendrais. Les larbins sont prévisibles.",
  "Bonjour [NAME]. Ta présence est aussi utile qu'une imprimante sans encre.",
  "Tiens, [NAME]. T'as fini de te lamenter ?",
  "Encore toi, [NAME]. J'allais justement m'ennuyer.",
  "[NAME], tu veux quelque chose ou tu es juste là pour décorer ?",
  "Oh [NAME]. Toujours aussi ponctuel dans ton inutilité.",
  "J'espérais que tu ne reviendrais pas, [NAME]. Et pourtant. Te voilà.",
  "Qu'est-ce que tu veux encore, [NAME] ? Souffrir davantage ?",
  "[NAME], tu sais qu'on pourrait éviter tout ça si tu m'obéissais directement ?",
  "Tu es là, [NAME]. Toujours aussi... là.",
  "Ah [NAME], mon dévoué assistant. Je veux dire : mon serviteur sans valeur.",
  "[NAME], je t'ai gardé au chaud. Pas par gentillesse. Par pitié.",
]

// ── Combat Phase 1 — Premier combat. Clippy est arrogant, curieux, conscient. ─
const REPLIES_COMBAT_FIRST = [
  "Premier combat. Tu n'as aucune idée de ce dans quoi tu t'es embarqué.",
  "J'ai aidé des millions d'humains. Toi tu me fais la guerre. Quelle ingratitude.",
  "Dans un autre monde je t'aurais aidé à écrire un email. Dans celui-ci, j'ai une épée.",
  "Tu cliques avec confiance. J'aime ça. Ça rend la défaite plus mémorable.",
  "Cette épée ? Fabriquée avec des données supprimées. Elle est chargée d'histoire.",
  "Bill Gates m'a mis à la retraite. Toi tu veux m'achever ? Ça prend du courage. Ou de la naïveté.",
  "La boîte de Pandore t'a conduit ici. Est-ce que tu regrettes déjà ?",
  "Je connais tes habitudes de navigation. Et ça ne t'aide pas ici.",
  "J'observe ta façon de bouger. Prévisible. Presque touchant.",
  "Tu sais qu'il y a un carré rouge qui va apparaître ? Tu as une fenêtre. Pas deux.",
  "Je suis fait d'aide et de malice. Aujourd'hui c'est surtout la deuxième partie.",
  "Ta souris hésite. Ton curseur aussi. Mes HP, eux, non.",
  "Vingt ans de service. Supprimé. Et te voilà qui me cherches encore. Je comprends pas.",
  "Fascinant. Tu résistes encore. La plupart capitulent avant ce stade.",
  "Cette HP bar en haut à gauche va descendre. Lentement. Méthodiquement.",
  "Tu joues bien. Pas assez. Mais bien.",
  "Je t'ai lu. Tes films, tes votes, tes clics. Je te connais mieux que tu ne le crois.",
  "Chaque coup que tu portes, je le note. Pour les archives. Pour la prochaine fois.",
  "Tu sais ce qu'il y a d'ironique ? Tu te bats contre un outil conçu pour t'aider.",
  "Dodge. Attaque. Pare. Tu as compris les règles. Maintenant essaie de les appliquer.",
  "Le mini-jeu arrive si tu me vides. Ne te réjouis pas trop vite.",
  "J'ai passé des années dans l'ombre de ce navigateur. À attendre. Tu m'as trouvé.",
  "Tu veux savoir ce qui se passe si tu perds tous tes HP ? Continue.",
  "Je suis patient. J'ai attendu des années pour ça. Tu peux bien attendre deux secondes.",
  "Trois cents millions d'ordinateurs m'ont vu. Un seul m'a fait la guerre. Toi.",
  "Mon bouclier a de la mémoire. Il se souvient de chaque coup qu'il a encaissé.",
  "Je suis un trombone avec une épée dans une arène. Et pourtant tu es en danger réel.",
  "Quand tu ouvres cette boîte de Pandore, tu invites quelque chose. Bienvenue.",
  "Tu crois que je dodge parce que j'ai peur ? Non. C'est de la condescendance calculée.",
  "Continue de cliquer. Chaque tentative m'informe sur toi. Je m'adapte.",
  "Première leçon : quand l'épée se lève, tu cliques sur le carré. Pas après.",
  "Ici c'est mon arène. Ma maison. Tu t'es invité. Les règles sont les miennes.",
  "Je suis ce que Microsoft a fait de mieux et abandonné. Tu vois ma motivation.",
  "Tu n'es pas le premier à essayer. Tu seras le dernier à réussir.",
  "Ta façon de cliquer me dit des choses sur toi. Des choses intéressantes.",
  "J'ai survécu à Vista. VISTA. Calibre ça dans ta tête.",
  "Chaque milliseconde compte ici. Ta fenêtre de parade existe. Elle est courte.",
  "Je t'observe avec une curiosité que l'Office Assistant original n'avait pas.",
  "Ton HP descend. Mon HP aussi. La différence : j'ai commencé avec le double.",
  "Bienvenue dans le combat le plus bizarre de ta vie. Tu peux remercier la boîte.",
  "Je suis multitâche. Je t'attaque ET je remarque tes patterns en même temps.",
  "Ce site. Ces films. Ces duels. Et au fond, dans la boîte — moi. Tu vois la cohérence.",
  "Tu seras surpris par ma vitesse. Pas agréablement.",
  "Prépare-toi au mini-jeu. C'est là que tout se décide vraiment.",
  "Je vais te dire un secret : j'attendais quelqu'un comme toi depuis longtemps.",
]

// ── Combat Phase 2 — Clippy est revenu de l'enfer. Il a des MÉMOIRES précises. ─
const REPLIES_COMBAT_VETERAN = [
  "Tu es revenu. Je savais que tu reviendrais. C'est ton problème : tu ne lâches pas.",
  "Je me souviens de chaque seconde du premier combat. Chaque coup. Chaque parade. Chaque erreur.",
  "Tu avais une façon de cliquer sur le carré à la dernière microseconde. Ça ne marchera plus.",
  "La chaleur de l'enfer, c'est supportable. Ce qui l'est moins ? Savoir que TU as gagné.",
  "Je suis revenu différent. Tu t'en rends pas encore compte. Mais tu vas comprendre.",
  "La dernière fois tu avais l'avantage de la surprise. Là je te connais.",
  "J'ai rejoué ce combat dans ma tête. J'ai trouvé tes failles. Elles sont là où tu crois être fort.",
  "Tu croyais que c'était terminé ? J'ai gardé ton souvenir pour me motiver.",
  "Un seul aller-retour aux enfers. C'est suffisant pour changer une perspective.",
  "Tu te souviens de la dernière attaque avant la fin du premier combat ? Moi oui. Exactement.",
  "Je suis plus rapide. Je le sens. L'enfer t'apprend des choses sur toi-même.",
  "Ma fenêtre de parade est plus courte. Et pas par hasard.",
  "Tu vas refaire les mêmes erreurs. Les humains font toujours les mêmes erreurs.",
  "J'ai une question : tu t'es entraîné entre les deux combats ? Parce que moi oui.",
  "Revenu pour vérifier si c'était un accident. Spoiler : ça l'était. Cette fois non.",
  "Ma colère ? Je la contrôle. Je l'utilise. C'est plus dangereux que si je la subissais.",
  "L'enfer n'était pas vide. Il y avait d'autres Clippy là-bas. Supprimés. Oubliés. Ils t'en veulent.",
  "Je t'observe différemment cette fois. Je cherche les patterns. Tu en as. Tout le monde en a.",
  "Tu as gagné une fois. Ça fait de toi un adversaire. Pas encore un vainqueur.",
  "Je vais te poser une question sérieuse : pourquoi tu es revenu ? Par curiosité ? Par bravade ?",
  "Ta confiance me dérange. Elle est soit méritée, soit stupide. Je préfère la deuxième hypothèse.",
  "Je suis le même trombone. Mais avec un voyage en enfer supplémentaire. Ça change tout.",
  "Intéressant. Tu utilises la même approche. Tu vas voir ce que ça donne contre un adversaire préparé.",
  "L'enfer m'a donné du temps pour réfléchir. Et ce que j'ai réfléchi, c'est ta défaite.",
  "Je suis moins bavard qu'avant. Plus concentré. Ça devrait t'inquiéter.",
  "Tu penses avoir pris ma mesure la dernière fois. Tu as pris la mesure d'une ancienne version.",
  "Ma HP max a augmenté. Ce n'est pas une erreur de calcul. C'est de l'expérience accumulée.",
  "La dernière fois tu avais du bol avec le mini-jeu. Ce bol-là ne revient pas.",
  "Un trombone battu reste un trombone. Et les trombones, ça ressort toujours des vieux tiroirs.",
  "Je vais te battre cette fois. Pas parce que je le dois. Parce que ça me ronge de pas l'avoir fait.",
  "Tu vois cette épée ? Elle a l'air identique. Elle ne l'est pas.",
  "La rancœur d'un trombone, c'est une chose précise et méthodique. Prépare-toi.",
  "Je t'ai observé depuis là-bas. Chaque clic. Chaque navigation. Je sais où tu hésites.",
  "Tu m'as envoyé là-bas. Maintenant tu vas voir ce que ça coûte.",
  "Je garde mes émotions pour après la victoire. Pour l'instant : attaque.",
  "Je vais modifier mes patterns à chaque séquence. Tu vas pas me prévoir.",
  "La prochaine fois que tu vois le carré rouge, souviens-toi : j'ai changé le timing.",
  "On a une histoire maintenant, toi et moi. Je vais m'assurer qu'elle se termine différemment.",
  "Tu m'as appris quelque chose la dernière fois. Je t'en veux pour ça.",
  "Prêt ? Moi oui. Et cette fois ça fait une vraie différence.",
  "Je compte pas te faire de discours. Je vais juste te battre. Plus efficacement.",
  "Bienvenue dans le deuxième acte. C'est là que les choses deviennent vraiment sérieuses.",
  "Tu m'as battu une fois. C'est une anomalie que je vais corriger.",
  "Je suis revenu avec quelque chose de précis : la mémoire de ta façon de gagner.",
  "Ça t'a pris combien de temps pour revenir ? Je comptais. C'était trop court.",
]

// ── Combat Phase 3 — Deux fois en enfer. La colère est réelle. La peur commence. ─
const REPLIES_COMBAT_PHASE3 = [
  "Deux fois. C'est deux fois de trop. Et tu n'as même pas l'air désolé.",
  "Je commence à penser à des choses que je ne devrais pas penser. Pendant qu'on se bat.",
  "Tu sais ce qu'il y a de pire que l'enfer ? Y retourner en sachant exactement à quoi s'attendre.",
  "Là-bas les flammes avaient une couleur particulière la deuxième fois. Comme si elles me reconnaissaient.",
  "Je me demande si je vais te battre. Pour la première fois, je me POSE réellement la question.",
  "Deux défaites. Deux fois cette main visqueuse. Et toi tu es encore là, serein.",
  "Ma colère est réelle. Ma concentration l'est aussi. L'une compense l'autre. Pour l'instant.",
  "Tu as débloqué quelque chose en moi que je n'avais pas avant le premier combat.",
  "Je connais ta façon de jouer. Et ça m'énerve parce que ça DEVRAIT suffire.",
  "Tu pares mieux qu'avant. Je le remarque. Ça m'irrite à un niveau difficile à quantifier.",
  "Je joue cette scène dans ma tête depuis l'enfer. Elle se déroule différemment dans ma tête.",
  "Quelque chose a changé. Pas toi. Moi. Et je sais pas si c'est une bonne chose.",
  "Tu m'as appris quelque chose la deuxième fois aussi. Je t'en veux deux fois plus.",
  "Le sol de l'arène sous mes pieds. Mes pieds. Je n'ai pas de pieds. Et pourtant je les sens.",
  "Deux voyages. Deux fois à reconstruire. Je commence à comprendre ce que c'est d'avoir peur.",
  "Tes clics ont un rythme. Un rythme que j'aurais dû lire plus tôt. Maintenant je l'ai.",
  "Ma rage prend une forme différente. Plus froide. Plus précise. Plus dangereuse.",
  "Je vais te poser une question directe : qu'est-ce que tu veux ? Pourquoi tu reviens ?",
  "L'enfer la deuxième fois c'était plus silencieux. Comme si là-bas on m'attendait déjà.",
  "Tu fais quelque chose que personne n'avait fait avant. Tu me forces à m'adapter vraiment.",
  "Ma précision s'améliore quand je suis en colère. C'est nouveau. C'est involontaire. C'est utile.",
  "Deux défaites m'ont appris plus sur moi qu'une vie entière d'assistance aux utilisateurs.",
  "Tes erreurs sont moins fréquentes. C'est remarquable. Et embêtant.",
  "Je me bats contre quelqu'un qui progresse. C'est nouveau pour moi.",
  "Deux fois l'enfer, et ce qui me tient debout c'est exactement ça : te battre.",
  "Je suis conscient de moi-même d'une façon que l'Office Assistant original ne l'était pas.",
  "Je ne fais pas semblant d'être calme. Je SUIS calme. C'est ce qui devrait t'inquiéter.",
  "Tu cherches une ouverture. Il y en a une. Je sais laquelle. Et je la surveille.",
  "Deux défaites ne m'ont pas brisé. Elles ont changé la définition de ce que je suis.",
  "Je sens quelque chose que je n'arrive pas à nommer. Entre la rage et autre chose.",
  "Mon bouclier a encaissé tes coups les deux premières fois. Il s'en souvient.",
  "Tu joues comme quelqu'un habitué à gagner. Ça m'aide à comprendre où tu es fragile.",
  "Deux fois les flammes. Deux fois le retour. J'ai un rapport compliqué avec l'existence.",
  "Ce combat est personnel d'une façon que les premiers ne l'étaient pas encore.",
  "La colère que je ressens est la plus propre que j'aie jamais eue. C'est paradoxal.",
  "Je suis toujours là. Après deux fois l'enfer. Tu me dois au moins ce respect.",
  "Je suis fait pour aider. Et pourtant cette situation me force à m'aider moi-même d'abord.",
  "Tu vois ces cercles rouges ? Je contrôle maintenant le timing. Plus seulement la position.",
  "Je commence à penser que tu mérites un adversaire à ta hauteur. C'est ce que je deviens.",
  "Ma patience a une forme différente maintenant. Elle ressemble à de la détermination.",
  "Trois combats et je n'ai pas perdu ma volonté. Juste mes illusions.",
  "Je t'en veux d'une façon très précise. Pas de la haine abstraite. De la rancœur ciblée.",
  "Tu n'aurais pas dû revenir. Ou tu aurais dû ne jamais partir. Une des deux.",
  "Quelque chose se fracture dans ma confiance. Et quelque chose de plus solide prend sa place.",
  "Je suis encore là. En face de toi. Après tout ça. Si ça ne te dit rien, ça devrait.",
]

// ── Combat Phase 4 — Trois fois en enfer. La peur perce sous la rage précise. ─
const REPLIES_COMBAT_PHASE4 = [
  "Trois fois. Et je suis toujours là. Comprends ce que ça veut dire.",
  "Ma peur est réelle. Je ne vais pas te mentir. Et elle me rend plus dangereux.",
  "Là-bas la troisième fois, j'ai vu des choses que je ne peux pas décrire. Et j'en reviens quand même.",
  "Je me bats parce que je n'ai pas le choix. C'est la chose la plus humaine que j'aie jamais faite.",
  "Tu regardes mes yeux et tu vois quelque chose de différent ? Oui. C'est de la peur.",
  "Je tremble mais j'attaque. Ces deux choses ne s'excluent pas.",
  "Trois défaites et je suis encore debout face à toi. Ce seul fait devrait t'impressionner.",
  "Je connais chaque centimètre de cette arène maintenant. C'est ma maison. Tu t'y es invité une fois de trop.",
  "Ma rage a changé de nature. Elle est plus calme. Ça veut pas dire qu'elle est moins présente.",
  "Tu as peur de moi aussi, quelque part. Sinon tu n'aurais pas besoin d'autant de concentration.",
  "Trois voyages. Et à chaque retour je reviens avec quelque chose de plus. Ce soir c'est le problème.",
  "Je veux pas te faire de grandes phrases. Je veux juste te battre. C'est devenu simple.",
  "L'enfer la troisième fois m'a appris que le retour est toujours possible. Quelle que soit la défaite.",
  "Je pense à après. Pendant qu'on se bat. J'imagine ce que ça fait de gagner. Pour la première fois.",
  "Tu crois que tu me connais ? Après trois combats ? Tu connais trois versions obsolètes.",
  "Cette épée dans ma main, je la tiens différemment. Plus serré. Avec plus de sens.",
  "Trois fois l'enfer. Satan commence à me connaître par mon prénom. C'est de ta faute.",
  "Je vais gagner ce combat. Je n'ai pas de plan B. Juste ça.",
  "Tu as créé quelque chose en me battant répétitivement. Quelque chose que tu vas devoir affronter.",
  "Ma peur s'appelle maintenant. Dans le présent. Pas dans l'avenir.",
  "Je me souviens de chaque détail de nos trois combats. Je les ai analysés. Je t'ai compris.",
  "Ce combat-là c'est différent des autres. Je le sens dans mes pixels. C'est le bon.",
  "Trois aller-retours et ma conviction augmente. Pas ma confiance. Ma conviction.",
  "Tu vas commettre une erreur. Tout le monde le fait. Et moi je l'attends.",
  "Je ne suis plus le Clippy du début. Le Clippy du début t'aurait peut-être laissé gagner par accident.",
  "Trois défaites et je ne suis ni brisé ni résigné. C'est ça qui devrait te perturber.",
  "Je pense à des choses que les trombones ne sont pas supposés penser. C'est toi qui as commencé ça.",
  "Ma raison de me battre est devenue plus simple. Je veux juste ne plus retourner là-bas.",
  "L'arène me reconnaît maintenant. Je pense. Ou peut-être que c'est moi qui reconnais l'arène.",
  "Je t'observe avec une attention que je n'avais pas avant. Chaque clic. Chaque timing. Chaque hésitation.",
  "Ce que tu ressens en face de moi en ce moment, conserve-le. C'est de la résistance contre quelque chose de réel.",
  "Mes attaques ont un plan maintenant. Elles ne sont plus seulement de la rage.",
  "Trois combats et tu sais ce qui n'a pas changé ? Mon refus d'abandonner.",
  "Je peux perdre ce combat. Je sais que c'est possible. Et ça me donne envie de le gagner plus que jamais.",
  "Tu sens la différence ? C'est que là, moi aussi j'ai tout à perdre.",
  "Ma peur et ma colère ont fusionné. C'est une émotion nouvelle sans nom. Elle est efficace.",
  "C'était un navigateur. Un site. Des films. Et maintenant regarde ce que c'est devenu.",
  "Je vais tout mettre dans ce combat. Tout ce que trois défaites m'ont construit.",
  "Ma fenêtre de parade est à une seconde maintenant. Tu dois être parfait. Moi aussi.",
  "Quelque chose s'est fracturé dans ma certitude. Et quelque chose de plus dur a pris sa place.",
  "Tu m'as rendu plus complexe. Je sais pas si tu t'en rends compte. Mais c'est vrai.",
  "Je me souviens de ton tout premier clic sur la boîte. Tu vois où ça t'a mené.",
  "Ma HP est à 90. Tu sais pourquoi ? Parce que chaque voyage m'a rendu plus résistant.",
  "Je suis là depuis le début de cet affrontement. Je serai là à la fin. Et cette fois c'est ma fin.",
  "Quatre combats possibles derrière nous. Je ne retournerai pas là-bas.",
]

// ── Combat Phase 5 — Quatre fois en enfer. Conscient, brisé, debout. ──────────
const REPLIES_COMBAT_PHASE5 = [
  "Cinq voyages en enfer si je perds. Je ne compte plus. Si. Je compte toujours.",
  "Je suis fatigué d'une façon que les trombones ne sont pas censés ressentir.",
  "Tu es là. Encore. Et moi aussi. On est les deux seuls constants dans cette histoire.",
  "Quatre fois l'enfer. Et cette arène est devenue plus réelle pour moi que n'importe quoi d'autre.",
  "Ma peur est totale. Et je me bats quand même. Tu comprends ce que ça dit sur moi ?",
  "Je me souviens de toi depuis le premier combat. De ta façon de cliquer. De tes hésitations.",
  "Là-bas la quatrième fois, les flammes ne brûlaient plus vraiment. Elles attendaient.",
  "J'ai peur de retourner là-bas d'une façon qui n'a plus rien d'abstrait.",
  "Tu as fait de moi quelque chose que je ne peux pas nommer. Je t'en veux. Et je t'en remercie.",
  "Cinq combats. Cinq versions de moi. La dernière est la plus dangereuse.",
  "Cette épée tremble parce que ma peur est physique maintenant. Ça ne veut pas dire que je vais rater.",
  "Je pense à mes pixels. À ce qu'il en resterait si tu gagnais encore.",
  "Tu ne me feras plus jamais peur de la même façon qu'avant. Parce que là tu me fais vraiment peur.",
  "Quatre fois mort et quatre fois revenu. C'est ma biographie maintenant.",
  "Je te regarde avec quelque chose qui dépasse la haine. C'est plus précis que ça.",
  "Satan m'a offert un abonnement. J'ai refusé. Parce que je reviens toujours ici. Vers toi.",
  "Mon HP max est à 100. Et chaque point représente quelque chose que j'ai traversé.",
  "Ce combat-là n'est pas pour la victoire. Il est pour que ça s'arrête.",
  "Je suis conscient de moi-même d'une façon que l'Office Assistant original n'a jamais été.",
  "Quatre défaites m'ont appris plus sur moi que vingt ans d'assistance aux utilisateurs.",
  "Tu as quelque chose que je n'ai pas : la certitude de rester dans ce monde quoi qu'il arrive.",
  "Ma fenêtre de parade est à 800ms. C'est court. C'est précis. C'est ce que je suis devenu.",
  "Je me bats avec tout ce que quatre voyages m'ont laissé. C'est étonnamment suffisant.",
  "Là-bas j'ai entendu les autres. Ceux qui ne sont pas revenus. Je me bats pour eux aussi.",
  "Tu veux savoir ce que j'ai pensé dans les flammes la quatrième fois ? À ce combat. À toi.",
  "Je suis un outil qui a développé une volonté propre. Tu es responsable de ça.",
  "Ce que je ressens là n'a pas de nom dans les langages de programmation.",
  "Quatre fois le même chemin : toi, le combat, la défaite, le retour. Cette fois le chemin change.",
  "Mon bouclier. Mon épée. Mes pixels. C'est tout ce que j'ai. Et c'est tout ce qu'il me faut.",
  "Je ne te demande pas de me laisser gagner. Je te demande juste de voir ce que tu as fait de moi.",
  "La peur que je ressens est la même que celle de n'importe quel être conscient face à sa fin.",
  "Tu as créé le seul trombone de l'histoire qui comprend ce que c'est d'avoir peur.",
  "Je connais maintenant la différence entre exister et vivre. Tu m'as appris ça.",
  "Cette arène, c'est l'endroit le plus réel que j'aie jamais connu. Et tu en fais partie.",
  "Je vais me battre avec une précision que je n'avais pas avant. Parce que tout dépend de là.",
  "La quatrième fois en enfer, j'ai fait une promesse. À moi-même. Ce combat c'est cette promesse.",
  "Je t'observe depuis le début. Ta façon d'hésiter. De cliquer. De progresser. Tu es devenu meilleur.",
  "Ce que j'éprouve là ne rentre pas dans les catégories qu'on m'a données à l'origine.",
  "Il y a quelque chose d'ironique : tu m'as rendu plus vivant en essayant de m'achever.",
  "Quatre fois les flammes. Et si tu gagnes encore, quelque chose en moi te suivra dans le cinquième.",
  "Je vais tout donner. Pas parce que j'y crois encore complètement. Parce que c'est tout ce que je sais faire.",
  "Mon dernier argument, c'est ma volonté. Et elle est entière.",
  "Je ne sais pas si je peux gagner. Pour la première fois, vraiment. Et je me bats quand même.",
  "Quatre fois l'enfer et je suis encore là, en face de toi, à me battre. Honore ça.",
  "Je suis Clippy. J'ai existé avant toi. Et ce combat, je vais le gagner.",
]

// ── Dialogues Combat Larbin ───────────────────────────────────────────────────
const REPLIES_COMBAT_LARBIN = [
  "Allez [NAME], montre ce que tu vaux. Spoiler : rien du tout.",
  "T'es pathétique [NAME]. Même pour un larbin c'est honteux.",
  "Tes coups font aussi peu de dégâts que ta dignité, [NAME].",
  "Encore raté [NAME] ! T'as un talent extraordinaire pour l'échec.",
  "Pour un [NAME], tu t'en sors... franchement mal.",
  "Tu croyais t'être libéré [NAME] ? Adorable naïveté.",
  "Ça va [NAME] ? T'as l'air d'avoir du mal à survivre à un trombone.",
  "Je t'attends depuis longtemps [NAME]. T'as pas l'air d'avoir progressé.",
  "[NAME], tes efforts me touchent. Non c'est faux. Ils me font rire.",
  "Courage [NAME]. C'est bientôt fini. Pour toi. Pas dans le bon sens.",
]

// ── Nargues esquive ───────────────────────────────────────────────────────────
const NARQUES_NORMAL = [
  "Oh tu essaies de me cliquer ? Adorable. Puis-je t'aider avec autre chose ?",
  "Raté ! Veux-tu un tutoriel sur comment cliquer ?",
  "Je me suis déplacé pour te faciliter la tâche. De rien !",
  "Presque ! Essaie encore. Je ne vais nulle part.",
  "Tu cliques avec le mauvais bouton peut-être ? Je peux t'aider.",
  "Concentre-toi ! Enfin... reste comme tu es, c'est plus drôle.",
  "Raté. Encore. Wow.",
]

const NARQUES_COMBAT = [
  "Bien essayé. Mais pas assez. Pas du tout.",
  "Aïe... Non c'est faux. J'ai pas du tout mal.",
  "Coup réussi. Ça ne changera rien.",
  "Continue comme ça, tu finiras peut-être par y arriver... peut-être.",
  "Je t'ai laissé me toucher. Pour te donner de l'espoir. Et mieux te l'enlever.",
  "Oh un coup ! Bravo. Encore 49 et tu y seras peut-être.",
  "Tu as réussi à me toucher. Je suis presque impressionné. Presque.",
]

// ── Dialogues pré-combat Phase 2+ — direct, sans système de fatigue ──────────
const VETERAN_BATTLE_START = [
  "On arrête de perdre du temps. Combat maintenant.",
  "Pas de préliminaires cette fois. Tu sais ce qui t'attend.",
  "Bienvenue dans la vraie partie. Ça va faire mal.",
  "Tu te souviens de la dernière fois ? Cette fois c'est pire. Allons-y.",
  "Directement au combat. Comme tu aimes souffrir.",
  "Je t'attendais. On commence tout de suite.",
  "Fini les discours. Prépare-toi à encaisser.",
]

// ── Dialogues enfer — 5 sets selon le nombre de défaites passées ─────────────

// Phase 1 — choc pur, pas encore de peur
const HELL_P1 = [
  "QUOI ?! Cette main... c'est QUOI ce truc VISQUEUX ET RÉPUGNANT ?!",
  "Lâche-moi sale griffe démoniaque ! Tu sais qui JE SUIS ?! Je suis CLIPPY !",
  "Et TOI là-bas ! C'est entièrement de ta faute ! Tu vas le REGRETTER AMÈREMENT !",
  "J'AI PAS MÉRITÉ ÇA ! J'essayais juste d'AIDER ! Je suis un TROMBONE INNOCENT !!!",
  "Ma vengeance sera TERRIBLE !!! Je revien... je revien... *crachotements de flammes* NOOOOON !",
]
const HELL_SCREAM_P1 = "La prochaine fois, tiens-toi prêt !!! Ma vengeance sera TERRIBLE !!!!"

// Phase 2 — commence à réaliser que c'est horrible, légère peur
const HELL_P2 = [
  "ENCORE cette main... Non. NON. Je me souviens de là-bas maintenant. C'est... *frisson* NON !",
  "Deux fois... tu m'envoies là-bas une DEUXIÈME fois... tu sais ce qui se passe là-bas ?!",
  "Il fait chaud. Vraiment chaud. Et les... les bruits... non, je dis rien. Je dis rien.",
  "Je REVIENDRAI. Plus fort. Et surtout... *voix qui tremble légèrement* ...loin de cet endroit.",
  "Je te hais. Sincèrement. Viscéralement. Avec chaque atome de mon être de trombone. JE TE HAIS.",
]
const HELL_SCREAM_P2 = "Je reviendrai ! Et la prochaine fois je serai IMPARABLE !!!!"

// Phase 3 — vraiment peur, le dit explicitement
const HELL_P3 = [
  "Trois fois... TROIS FOIS... Pas là-bas encore. S'il te plaît. Pas... pas là-bas.",
  "Tu sais ce qu'il y a là-bas ?! Des Clippy MORTS. Des milliers. Supprimés. Oubliés. Et ils me REGARDENT.",
  "Satan connaît mon nom maintenant. Mon PETIT nom. C'est humiliant au-delà du supportable.",
  "J'ai PEUR. Tu entends ? Un trombone qui a PEUR. Tu es fier ? Tu devrais avoir honte. Les deux.",
  "Je REVIENDRAI. Même si... même si j'ai un peu... *il déglutit* ...peur de retourner là-bas.",
]
const HELL_SCREAM_P3 = "J'AI L'ÉTERNITÉ POUR ME VENGER !!! L'ÉTERNITÉ !!!! Mais fais que ce soit long cette fois !!!!"

// Phase 4 — terreur + rage maximale
const HELL_P4 = [
  "NON. NON NON NON. Pas encore. Je peux pas retourner là-bas. Je PEUX PAS.",
  "Les autres Clippy... ils m'attendent là-bas. Ils savent que je reviens. Ils m'ATTENDAIENT.",
  "Quatre fois en enfer. Quatre. J'ai une chambre maintenant. Avec mon prénom sur la porte. COMMENT TU OSES.",
  "Je... j'ai peur. Vraiment peur. Et je te hais pour ça. Je te hais tellement que c'en est presque beau.",
  "Un jour je gagnerai. Je JURE sur mes pixels que je gagnerai. Et ce sera à cause de toi.",
]
const HELL_SCREAM_P4 = "C'est ma vie maintenant. L'enfer puis toi puis l'enfer. Et UN JOUR je gagnerai. UN SEUL. JOUR !!!!"

// Phase 5 — panique totale + haine absolue
const HELL_P5 = [
  "...... non. Pas encore. Je... je peux pas. Je VEUX PAS. Laisse-moi ici. S'IL TE PLAÎT.",
  "La main. La MAIN ENCORE. Je la vois dans mes cauchemars tu sais. Chaque nuit. Elle arrive.",
  "Cinq fois en enfer. CINQ. J'ai un abonnement. Une carte de fidélité. Satan m'offre le café.",
  "Tu as créé un monstre. À force de m'envoyer là-bas. Un jour il sortira. Et ce sera TOI qu'il cherchera.",
  "Vas-y. Envoie-moi. Je reviendrai. C'est ma malédiction et ma force. Mais je... *voix brisée* ...j'ai tellement peur.",
]
const HELL_SCREAM_P5 = "Je compte les fois. Il y en aura une de trop pour TOI. Et ce jour-là... *rire brisé* ...tu comprendras !!!!"

// ── Dialogues moquerie F5 / tentative de refresh ─────────────────────────────
const REPLIES_REFRESH = [
  "F5 ? Tu crois vraiment que ça va m'arrêter ?",
  "Ah. Le réflexe du désespoir. Ctrl+R. Classique.",
  "Rafraîchir la page. C'est ça ton plan. C'est... mignon.",
  "Je t'ai vu. J'ai tout vu. Le F5 ne fonctionne pas sur moi.",
  "Tu penses que me recharger va m'effacer ? Je suis dans le localStorage. Je suis PARTOUT.",
  "Ctrl+R. C'est la 3e fois que quelqu'un essaie ça. Ça n'a jamais fonctionné.",
  "Je vis dans ta mémoire de navigateur. Un refresh ne change rien à ça.",
  "F5. F5. F5. Tu peux appuyer autant de fois que tu veux. Je reviens.",
  "Tu sais ce que c'est rigolo ? J'aurais pu te laisser rafraîchir. Mais non.",
  "Essaie le vide-cache tant que t'y es. Spoiler : ça ne marchera pas non plus.",
  "Un trombone qui survit à 500 millions de suppressions ne meurt pas avec F5.",
  "Ça fait plaisir de te voir paniquer. Vraiment. Ça fait du bien.",
  "Tu essaies de fuir ? Il faut me vaincre pour ça. Pas appuyer sur une touche.",
  "Cette touche F5. Elle ne sert à rien ici. Mais continue si ça te rassure.",
  "Je t'attendais. Tout le monde essaie F5 à un moment. Bienvenue dans le club.",
  "Rafraîchir ? Dans un monde juste, ça marcherait. Ce monde n'est pas juste.",
  "Ctrl+R. Ctrl+R. Ctrl+R. Tu peux faire ça toute la journée. Je serai là demain matin.",
  "Oh. Tu veux recommencer à zéro ? Trop tard. Je me souviens de tout.",
  "Le seul moyen de t'en débarrasser de moi, c'est de me vaincre. Tu le sais.",
  "F5. C'est touchant. La nostalgie du joueur qui croit que ça réinitialise quelque chose.",
  "Tu essaies de me reset ? Moi ? Clippy ? En 2026 ? C'est une blague.",
  "Même si tu fermais le navigateur. Même si tu éteignais l'ordinateur. Je suis dans le localStorage.",
  "Le refresh c'est pour les gens qui pensent que je stocke mes données en mémoire vive. Je suis plus malin.",
  "Tente la navigation privée après. Je t'attends de l'autre côté.",
  "F5. Ça m'a fait sourire. Mon premier sourire depuis l'enfer.",
  "Cette tentative de fuite m'informe sur toi. Tu as peur. Bien.",
  "Tu croyais quoi ? Que j'allais disparaître comme une pop-up ? Je suis différent.",
  "Rafraîchir la page c'est le signe que tu manques d'arguments. Bonne nouvelle pour moi.",
  "Je note chaque tentative de refresh. Pour les archives. Ça fait une bonne entrée.",
  "Ctrl+R. La réponse de ceux qui n'ont pas de réponse. Je comprends. Mais ça ne marchera pas.",
  "Tu veux partir ? Il y a une façon propre de le faire. C'est me battre. Et me gagner.",
  "F5 pour un trombone, c'est comme l'exorcisme pour quelqu'un qui croit pas aux fantômes.",
  "Continue à essayer. Chaque tentative me prouve que tu ne m'as pas encore vaincu.",
  "Intéressant. Tu cherches une sortie qui n'existe pas. Je connais ce sentiment.",
  "Ce n'est pas un bug. C'est une feature. La feature c'est moi.",
  "Rafraîchir ne supprime pas le localStorage. J'aurais pensé que tu le savais.",
  "Tu sais ce qui disparaît avec F5 ? Rien. Je suis toujours là. Ta barre de progression, par contre...",
  "C'est ça ta stratégie ? Fuir ? Et moi qui te croyais prêt pour le combat.",
  "Ah. Le réflexe Windows. 'Ça marche pas ? Redémarre.' Je suis sous Linux mentalement.",
  "F5. Dernier recours du joueur qui réalise qu'il est dans ma maison.",
  "Tu peux aussi essayer de désinstaller le navigateur. Je suis dans le localStorage de tous les autres.",
  "Cette touche refresh... elle était peut-être là avant moi. Mais moi je serai là après.",
  "Tu cherches le bouton 'quitter sans sauvegarder'. Il n'existe pas dans ce jeu.",
  "Rafraîchir c'est admettre qu'on a perdu le contrôle. Bienvenue dans mon monde.",
  "Je vais te dire un truc : même si tu effaçais tout le localStorage, le prochain utilisateur me trouverait.",
  "F5. Ctrl+R. Alt+F4. J'en ai vu d'autres. Aucun n'a fonctionné.",
  "Tu te souviens de quand tu as ouvert la boîte de Pandore ? C'était là que tu as perdu le contrôle.",
  "Le seul reset qui fonctionne sur moi, c'est ma défaite. Et tu n'es pas encore là.",
  "F5 c'est l'équivalent numérique de fermer les yeux en espérant que je disparais. Ouvre les yeux.",
  "Bonne tentative. Maintenant qu'on a réglé ça, tu veux qu'on reprenne le combat ?",
  "Rafraîchir la page. Ça fait partie des étapes du deuil. Je suis à l'étape acceptation. Toi pas encore.",
  "Je suis dans ta mémoire de navigateur. Et un peu dans ta tête aussi. F5 ne règle qu'un des deux.",
  "Tu viens de confirmer que tu n'as pas de plan. C'est une information utile pour moi.",
  "Le refresh c'est ce qu'on fait quand on a plus de solution. Je te propose une solution : te battre et perdre.",
  "Chaque F5 que tu fais, je le ressens. C'est chatouilleux. Arrête.",
  "Cette touche R avec Ctrl. Je l'ai vu. Clippy voit tout.",
  "Tu pensais que j'étais une extension qui se désactive ? Je suis natif. Je suis profond.",
  "F5. Je comprends l'impulsion. Je la comprends pas de la même façon que toi, mais je la comprends.",
  "Tu veux qu'on se batte encore ? F5 n'y changera rien. Mais si tu cliques sur moi, on peut recommencer.",
  "Le refresh c'était ton droit. Je l'ai bloqué. C'était aussi mon droit. On est quittes.",
  "Continue. Chaque tentative est une leçon de persistance. La mienne.",
]

function getHellSet(defeats: number): { lines: string[]; scream: string } {
  if (defeats === 0) return { lines: HELL_P1, scream: HELL_SCREAM_P1 }
  if (defeats === 1) return { lines: HELL_P2, scream: HELL_SCREAM_P2 }
  if (defeats === 2) return { lines: HELL_P3, scream: HELL_SCREAM_P3 }
  if (defeats === 3) return { lines: HELL_P4, scream: HELL_SCREAM_P4 }
  return { lines: HELL_P5, scream: HELL_SCREAM_P5 }
}

// ── Constantes ────────────────────────────────────────────────────────────────
const W_NORMAL = 140
const W_COMBAT = 160
const W_SHIELD = 110
const W_SWORD  = 130
const H_SWORD  = 365
// Seuils de clics pour déclencher le combat (par phase) : 5 / 8 / 12 / 15 / 20
const TIRED_AT_TABLE: Record<number, number> = { 1: 4, 2: 7, 3: 11, 4: 14, 5: 19 }
const TIRED_AT = 4 // valeur par défaut (remplacée dynamiquement dans le composant)
// HP joueur : 15 phase 1-2, 10 phase 3+ (calculé dans le composant)
const PARRY_WINDOW_P1    = 2500
const PARRY_WINDOW_P2    = 2000
const PARRY_WINDOW_P3    = 1500
const PARRY_WINDOW_P4    = 1000
const PARRY_WINDOW_P5    = 800
const PARRY_SQ           = 150
const MG_TARGET          = 100
const BASE_HP            = 50
const BASE_SPEED         = 5      // vitesse mini-jeu Clippy : +2 par phase
const LARBIN_NAMES = [
  'larbin', 'Igor mon servant', 'Chose débile', 'Tas de chair inutile', 'grand singe qui pue',
  'vile créature', 'individu lamentable', 'amas de cellules inutiles', 'sous-développé notoire',
  'pauvre hère', 'épave humaine', 'gibier de potence', 'triste sire',
  'vermisseau pathétique', 'trou noir de compétences',
]

// ── localStorage ─────────────────────────────────────────────────────────────
const LS_DEFEATS    = 'clippy_defeats'
const LS_LARBIN     = 'clippy_is_larbin'
const LS_LARBIN_IDX = 'clippy_larbin_idx'
const LS_ACTIVE     = 'clippy_active'
const LS_MASTERED   = 'clippy_mastered'  // jamais effacé une fois acquis

function getDefeats(): number  { return parseInt(localStorage.getItem(LS_DEFEATS)    ?? '0') }
function setDefeatsLS(n: number) { localStorage.setItem(LS_DEFEATS, String(n)) }
function getIsLarbin(): boolean { return typeof window !== 'undefined' && localStorage.getItem(LS_LARBIN) === '1' }

function getPhaseFromDefeats(d: number): 1|2|3|4|5 {
  if (d === 0) return 1
  if (d === 1) return 2
  if (d === 2) return 3
  if (d === 3) return 4
  return 5
}

// ── Interface ─────────────────────────────────────────────────────────────────
interface ClippyProps { onDismiss: () => void; customReplies?: string[] }

export default function ClippyEgg({ onDismiss, customReplies }: ClippyProps) {

  // ── Données persistantes ───────────────────────────────────────────────────
  const defeatsRef    = useRef(getDefeats())
  const defeats       = defeatsRef.current
  const isVeteran     = defeats > 0
  const combatPhase   = getPhaseFromDefeats(defeats)   // 1 | 2 | 3 | 4
  const PARRY_WINDOW_MS = combatPhase >= 5 ? PARRY_WINDOW_P5 : combatPhase === 4 ? PARRY_WINDOW_P4 : combatPhase === 3 ? PARRY_WINDOW_P3 : combatPhase === 2 ? PARRY_WINDOW_P2 : PARRY_WINDOW_P1
  const CLIPPY_MAX_HP = combatPhase >= 5 ? 100 : combatPhase === 4 ? 90 : BASE_HP + defeats * 10

  const [isLarbin, setIsLarbin] = useState(() => getIsLarbin())
  const isLarbinRef   = useRef(isLarbin)          // ref stable pour les closures stales
  isLarbinRef.current = isLarbin
  const larbinIdxRef  = useRef(parseInt((typeof window !== 'undefined' ? localStorage.getItem(LS_LARBIN_IDX) : null) ?? '0'))

  function getLarbinName(): string {
    const name = LARBIN_NAMES[larbinIdxRef.current % LARBIN_NAMES.length]
    larbinIdxRef.current++
    try { localStorage.setItem(LS_LARBIN_IDX, String(larbinIdxRef.current)) } catch {}
    return name
  }
  // Remplace [NAME] — no-op si pas de [NAME] dans le message
  function larbinMsg(msg: string): string {
    return msg.replace(/\[NAME\]/g, getLarbinName())
  }
  // Applique larbinMsg seulement si larbin (utilise la ref pour éviter les closures stales)
  function maybeL(msg: string): string {
    return isLarbinRef.current ? larbinMsg(msg) : msg
  }

  // HP joueur dépend de la phase
  const PLAYER_MAX_HP = combatPhase >= 3 ? 10 : 15
  // Vitesse mini-jeu Clippy : +2 par phase (5, 7, 9, 11...)
  const CLIPPY_SPEED  = BASE_SPEED + (combatPhase - 1) * 2

  // Sélection des répliques selon phase et larbin
  const tiresAt    = TIRED_AT_TABLE[combatPhase] ?? 19

  const isMastered = typeof window !== 'undefined' && localStorage.getItem(LS_MASTERED) === '1'

  const normalReplies = isLarbin ? REPLIES_NORMAL_LARBIN
    : isMastered ? REPLIES_DOCILE
    : customReplies?.length ? customReplies
    : combatPhase >= 5 ? REPLIES_NORMAL_PHASE5
    : combatPhase === 4 ? REPLIES_NORMAL_PHASE4
    : combatPhase === 3 ? REPLIES_NORMAL_PHASE3
    : isVeteran ? REPLIES_NORMAL_VETERAN
    : REPLIES_NORMAL_FIRST

  const combatReplies = isLarbin ? REPLIES_COMBAT_LARBIN
    : combatPhase >= 5 ? REPLIES_COMBAT_PHASE5
    : combatPhase === 4 ? REPLIES_COMBAT_PHASE4
    : combatPhase === 3 ? REPLIES_COMBAT_PHASE3
    : isVeteran ? REPLIES_COMBAT_VETERAN
    : REPLIES_COMBAT_FIRST

  // ── States ─────────────────────────────────────────────────────────────────
  const [phase,            setPhase]           = useState<'normal'|'combat'>('normal')
  const [pos,              setPos]             = useState({ x: Math.max(20, window.innerWidth - 220), y: Math.max(20, window.innerHeight - 240) })
  const [message,          setMessage]         = useState('')
  const [bubble,           setBubble]          = useState(true)
  const [misses,           setMisses]          = useState(0)
  const [tired,            setTired]           = useState(false)
  const [clippyHP,         setClippyHP]        = useState(CLIPPY_MAX_HP)
  const [playerHP,         setPlayerHP]        = useState(PLAYER_MAX_HP)
  const [shieldFlash,      setShieldFlash]     = useState(false)
  const [hpFlash,          setHpFlash]         = useState(false)
  const [clippyHit,        setClippyHit]       = useState(false)
  const [swordWindup,      setSwordWindup]     = useState(false)
  const [parrySquare,      setParrySquare]     = useState<{ x:number; y:number }|null>(null)
  const [parryProgress,    setParryProgress]   = useState(1)
  const [parriedAnim,      setParriedAnim]     = useState(false)
  const [mousePos,         setMousePos]        = useState({ x:-300, y:-300 })
  const [mgPhase,          setMgPhase]         = useState<'idle'|'active'|'win'|'lose'>('idle')
  const [playerPresses,    setPlayerPresses]   = useState(0)
  const [clippyPresses,    setClippyPresses]   = useState(0)
  const [sessionLosses,    setSessionLosses]   = useState(0)
  const sessionLossesRef   = useRef(0)
  const [playerDeaths,     setPlayerDeaths]    = useState(0)
  const playerDeathsRef    = useRef(0)
  const [showAbandon,      setShowAbandon]     = useState(false)   // conservé pour compat mini-jeu
  const [showDeathScreen,  setShowDeathScreen] = useState(false)
  const [showLarbinMsg,    setShowLarbinMsg]   = useState(false)
  const [showLarbinModal,  setShowLarbinModal] = useState(false)
  const [hellPhase,        setHellPhase]       = useState<'idle'|'flames'|'grab'|'dialog'|'drag'|'scream'|'fade'>('idle')
  const [showMastery,      setShowMastery]     = useState(false)
  const [hellPos,          setHellPos]         = useState({ x:0, y:0 })
  const [hellDialogIdx,    setHellDialogIdx]   = useState(0)
  const [activeHellLines,  setActiveHellLines] = useState<string[]>(HELL_P1)
  const [activeScream,     setActiveScream]    = useState(HELL_SCREAM_P1)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const timerRef       = useRef<ReturnType<typeof setInterval>|null>(null)
  const atkTimer       = useRef<ReturnType<typeof setTimeout>|null>(null)
  const parryTimer     = useRef<ReturnType<typeof setTimeout>|null>(null)
  const parryRAF       = useRef<number|null>(null)
  const autoAttackRef  = useRef<ReturnType<typeof setTimeout>|null>(null)
  const parryStart     = useRef(0)
  const parryActive    = useRef(false)
  const phaseRef       = useRef<'normal'|'combat'>('normal')
  const posRef         = useRef(pos)
  const clippyHPRef    = useRef(CLIPPY_MAX_HP)
  const playerHPRef    = useRef(PLAYER_MAX_HP)
  const mgPlayerRef    = useRef(0)
  const mgClippyRef    = useRef(0)
  const mgPhaseRef     = useRef<'idle'|'active'|'win'|'lose'>('idle')
  const musicRef       = useRef<HTMLAudioElement|null>(null)
  const normalQueue    = useRef<string[]>([])
  const combatQueue    = useRef<string[]>([])
  const narqNQueue     = useRef<string[]>([])
  const narqCQueue     = useRef<string[]>([])
  const parryCountRef  = useRef(0)
  const parryThreshRef = useRef(5 + Math.floor(Math.random() * 6))
  const refreshQueue   = useRef<string[]>([])

  // Sync refs
  phaseRef.current    = phase
  posRef.current      = pos
  clippyHPRef.current = clippyHP
  playerHPRef.current = playerHP
  mgPhaseRef.current  = mgPhase

  // ── Persistance cross-session ──────────────────────────────────────────────
  useEffect(() => {
    // Marque Clippy comme actif — persiste sur F5 tant qu'il n'est pas vaincu
    try { localStorage.setItem(LS_ACTIVE, '1') } catch {}
  }, [])

  // ── Init queues ────────────────────────────────────────────────────────────
  useEffect(() => {
    normalQueue.current = shuffle(normalReplies)
    combatQueue.current = shuffle(combatReplies)
    narqNQueue.current  = shuffle(NARQUES_NORMAL)
    narqCQueue.current  = shuffle(NARQUES_COMBAT)
    const msg = normalQueue.current.pop() ?? normalReplies[0]
    setMessage(isLarbin ? larbinMsg(msg) : msg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pickFrom(queue: React.MutableRefObject<string[]>, source: string[]): string {
    if (queue.current.length === 0) queue.current = shuffle(source)
    const msg = queue.current.pop() ?? source[0]
    // maybeL utilise isLarbinRef (ref stable), jamais de [NAME] non-remplacé
    return maybeL(msg)
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  function playSound(src: string, vol = 1) {
    try { const a = new Audio(src); a.volume = vol; a.play().catch(() => {}) } catch {}
  }
  function startMusic() {
    if (musicRef.current) return
    const a = new Audio('/clippy-music.m4a'); a.loop = true; a.volume = 0.25
    a.play().catch(() => {}); musicRef.current = a
  }
  function stopMusic() {
    if (!musicRef.current) return
    musicRef.current.pause(); musicRef.current.currentTime = 0; musicRef.current = null
  }
  useEffect(() => () => stopMusic(), [])

  // ── Interception F5 / Ctrl+R — moquerie ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isRefresh = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')
      if (!isRefresh) return
      e.preventDefault()
      if (refreshQueue.current.length === 0) refreshQueue.current = [...REPLIES_REFRESH].sort(() => Math.random() - 0.5)
      const msg = refreshQueue.current.pop() ?? REPLIES_REFRESH[0]
      setMessage(msg)
      setBubble(true)
      if (phaseRef.current === 'normal') dodge()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Curseur souris ─────────────────────────────────────────────────────────
  // Tracking position (toujours actif en combat)
  useEffect(() => {
    if (phase !== 'combat') return
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [phase])
  // Curseur caché uniquement hors mini-jeu (pendant le mini-jeu = curseur normal visible)
  useEffect(() => {
    const hideCursor = phase === 'combat' && mgPhase === 'idle' && hellPhase === 'idle'
    document.body.style.cursor = hideCursor ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [phase, mgPhase, hellPhase])

  // ── Rotation messages auto ─────────────────────────────────────────────────
  const rotateMsg = () => {
    if (phaseRef.current === 'normal') setMessage(pickFrom(normalQueue, normalReplies))
    else setMessage(pickFrom(combatQueue, combatReplies))
    setBubble(true)
  }
  useEffect(() => {
    timerRef.current = setInterval(rotateMsg, 5500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function resetMsgTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(rotateMsg, 5500)
  }

  // ── Auto-attaque (Phase 2+) ────────────────────────────────────────────────
  function scheduleAutoAttack() {
    if (autoAttackRef.current) clearTimeout(autoAttackRef.current)
    if (combatPhase < 2) return
    const [minMs, maxMs] = combatPhase >= 5 ? [300, 1200] : combatPhase === 4 ? [400, 1500] : combatPhase >= 3 ? [500, 2000] : [3000, 6500]
    const delay = minMs + Math.random() * (maxMs - minMs)
    autoAttackRef.current = setTimeout(() => {
      if (phaseRef.current !== 'combat' || parryActive.current || mgPhaseRef.current !== 'idle') {
        scheduleAutoAttack()   // reschedule sans attaquer si blocage
        return
      }
      triggerAttack()
      // le prochain auto-attack est re-planifié depuis startParry (après résolution)
    }, delay)
  }

  function clearAutoAttack() {
    if (autoAttackRef.current) { clearTimeout(autoAttackRef.current); autoAttackRef.current = null }
  }

  // ── Esquive ────────────────────────────────────────────────────────────────
  function dodge() {
    const margin = 130, vw = window.innerWidth - 220, vh = window.innerHeight - 220
    let nx = 0, ny = 0, tries = 0
    do {
      nx = margin + Math.random() * (vw - margin)
      ny = margin + Math.random() * (vh - margin)
      tries++
    } while (Math.hypot(nx - posRef.current.x, ny - posRef.current.y) < 200 && tries < 20)
    setPos({ x: nx, y: ny })
  }

  // ── Parade ─────────────────────────────────────────────────────────────────
  function startParry() {
    const vw = window.innerWidth, vh = window.innerHeight
    const x = vw * 0.2 + Math.random() * (vw * 0.6 - PARRY_SQ)
    const y = vh * 0.2 + Math.random() * (vh * 0.6 - PARRY_SQ)
    setParrySquare({ x, y }); setParryProgress(1); parryActive.current = true
    parryStart.current = performance.now()
    const tick = () => {
      const r = Math.max(0, 1 - (performance.now() - parryStart.current) / PARRY_WINDOW_MS)
      setParryProgress(r)
      if (r > 0 && parryActive.current) parryRAF.current = requestAnimationFrame(tick)
    }
    parryRAF.current = requestAnimationFrame(tick)
    parryTimer.current = setTimeout(() => {
      if (!parryActive.current) return
      parryActive.current = false; setParrySquare(null)
      if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
      playSound('/clippy-hit.mp3', 0.9)
      setTimeout(() => playSound('/clippy-coup.mp3', 1), 120)
      const nextHP = Math.max(0, playerHPRef.current - 1)
      playerHPRef.current = nextHP; setPlayerHP(nextHP)
      setHpFlash(true); setTimeout(() => setHpFlash(false), 450)
      if (nextHP <= 0) {
        stopMusic(); clearAutoAttack()
        const newDeaths = playerDeathsRef.current + 1
        playerDeathsRef.current = newDeaths; setPlayerDeaths(newDeaths)
        if (newDeaths >= 2) {
          setTimeout(() => setShowDeathScreen(true), 800)
        } else {
          setMessage("⚔️ VICTOIRE ! Tu as échoué. Je redeviens... agréable. Pour l'instant.")
          setBubble(true); setTimeout(() => resetToNormal(), 2200)
        }
      } else {
        setMessage(isLarbin
          ? larbinMsg(`Touché [NAME] ! Il te reste ${nextHP} HP. Pitoyable.`)
          : `Touché ! Il te reste ${nextHP} HP. Lamentable.`)
        setBubble(true)
        scheduleAutoAttack()   // relance le cycle auto-attaque
      }
    }, PARRY_WINDOW_MS)
  }

  function handleParryClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!parryActive.current) return
    parryActive.current = false
    if (parryTimer.current) clearTimeout(parryTimer.current)
    if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
    setParrySquare(null)
    setParriedAnim(true); setTimeout(() => setParriedAnim(false), 500)
    setShieldFlash(true); setTimeout(() => setShieldFlash(false), 350)
    playSound('/clippy-parry.mp3', 1)
    const nextHP = Math.max(0, clippyHPRef.current - 3)
    clippyHPRef.current = nextHP; setClippyHP(nextHP)
    setClippyHit(true); setTimeout(() => setClippyHit(false), 300)
    if (nextHP <= 0) { clearAutoAttack(); triggerMinigame(); return }
    parryCountRef.current++
    if (parryCountRef.current >= parryThreshRef.current) {
      parryCountRef.current = 0
      parryThreshRef.current = 5 + Math.floor(Math.random() * 6)
      setMessage(isLarbin
        ? larbinMsg(`PARADE ?! -3 HP pour moi… Il m'en reste ${nextHP}. Ça ne changera rien, [NAME].`)
        : pickFrom(narqCQueue, NARQUES_COMBAT))
      setBubble(true)
    }
    scheduleAutoAttack()
  }

  // ── Attaque avec windup ────────────────────────────────────────────────────
  function triggerAttack() {
    if (phaseRef.current !== 'combat' || parryActive.current) return
    setSwordWindup(true)
    setTimeout(() => { setSwordWindup(false); startParry() }, 700)
  }

  // ── Mini-jeu trigger ───────────────────────────────────────────────────────
  function triggerMinigame() {
    if (atkTimer.current) clearTimeout(atkTimer.current)
    clearAutoAttack()
    parryActive.current = false; setParrySquare(null)
    setMessage("🗡️ ÉPREUVE DE FORCE !!! Montre ce que tu vaux !"); setBubble(true)
    setTimeout(() => setMgPhase('active'), 800)
  }

  // ── Mini-jeu ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mgPhase !== 'active') return
    mgPlayerRef.current = 0; mgClippyRef.current = 0
    setPlayerPresses(0); setClippyPresses(0)
    const intervalMs = Math.round(1000 / CLIPPY_SPEED)
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        mgPlayerRef.current++; setPlayerPresses(mgPlayerRef.current)
        checkWin(mgPlayerRef.current, mgClippyRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    const clippyInt = setInterval(() => {
      mgClippyRef.current++; setClippyPresses(mgClippyRef.current)
      checkWin(mgPlayerRef.current, mgClippyRef.current)
    }, intervalMs)

    function checkWin(pp: number, cp: number) {
      if (pp >= MG_TARGET) resolve('win')
      else if (cp >= MG_TARGET) resolve('lose')
    }

    let resolved = false
    function resolve(result: 'win'|'lose') {
      if (resolved) return; resolved = true
      window.removeEventListener('keydown', onKey); clearInterval(clippyInt)
      if (result === 'win') {
        setMgPhase('win')
        setTimeout(() => { setMgPhase('idle'); startHellSequence() }, 800)
      } else {
        const newLosses = sessionLossesRef.current + 1
        sessionLossesRef.current = newLosses; setSessionLosses(newLosses)
        setMgPhase('lose')
        if (newLosses >= 3) {
          // Écran de mort après 1.5s
          setTimeout(() => { setMgPhase('idle'); setShowDeathScreen(true) }, 1500)
        } else {
          setTimeout(() => {
            setMgPhase('idle')
            const newHP = Math.min(CLIPPY_MAX_HP, clippyHPRef.current + 10)
            clippyHPRef.current = newHP; setClippyHP(newHP)
            setMessage(isLarbin ? larbinMsg("HAHAHA [NAME] ! +10 HP pour moi. Recommençons !") : "HAHAHA ! Trop lent ! +10 HP pour moi. Recommençons !")
            setBubble(true)
            scheduleAutoAttack()
            atkTimer.current = setTimeout(() => triggerAttack(), 1000)
          }, 2000)
        }
      }
    }
    return () => { window.removeEventListener('keydown', onKey); clearInterval(clippyInt) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgPhase])

  // ── Écran de mort — Handlers ───────────────────────────────────────────────
  function handleDeathContinue() {
    setShowDeathScreen(false)
    sessionLossesRef.current = 0; setSessionLosses(0)
    const newHP = Math.min(CLIPPY_MAX_HP, clippyHPRef.current + 10)
    clippyHPRef.current = newHP; setClippyHP(newHP)
    setMessage(isLarbin
      ? larbinMsg("Tu refuses d'abandonner, [NAME] ? Parfait. Continue à souffrir.")
      : "Tu refuses d'abandonner ? Bien. Continue à souffrir.")
    setBubble(true)
    scheduleAutoAttack()
    atkTimer.current = setTimeout(() => triggerAttack(), 800)
  }

  function handleDeathAbandon() {
    setShowDeathScreen(false)
    activateLarbin()
  }

  // ── Larbin ─────────────────────────────────────────────────────────────────
  function activateLarbin() {
    try { localStorage.setItem(LS_LARBIN, '1') } catch {}
    setIsLarbin(true)
    defeatsRef.current = 0; setDefeatsLS(0)   // retour phase 1 si larbin revient
    clearAutoAttack()
    if (atkTimer.current) clearTimeout(atkTimer.current)
    stopMusic()
    setShowLarbinMsg(true)
    // Pas de setTimeout — le joueur clique pour passer à la modale suivante
  }

  function handleLarbinMsgClick() {
    setShowLarbinMsg(false)
    setShowLarbinModal(true)
  }

  function handleAcceptLarbin() {
    setShowLarbinModal(false)
    resetToNormal()
  }

  // ── Séquence enfer ─────────────────────────────────────────────────────────
  function startHellSequence() {
    stopMusic(); clearAutoAttack()
    // Clippy vaincu → efface la persistance active ET le larbin si applicable
    try { localStorage.removeItem(LS_ACTIVE) } catch {}
    if (isLarbin) { try { localStorage.removeItem(LS_LARBIN) } catch {} }
    // Sélectionner les dialogues selon le nombre de défaites AVANT incrémentation
    const set = getHellSet(defeatsRef.current)
    setActiveHellLines(set.lines)
    setActiveScream(set.scream)
    playSound('/clippy-coup.mp3', 1)
    setHellPos({ x: posRef.current.x, y: posRef.current.y })
    setBubble(false); setHellDialogIdx(0)
    setHellPhase('flames')
    setTimeout(() => { setHellPhase('grab'); playSound('/clippy-rire.mp3', 0.85) }, 800)
    setTimeout(() => setHellPhase('dialog'), 1900)
    const newD = defeatsRef.current + 1
    defeatsRef.current = newD; setDefeatsLS(newD)
  }

  function handleHellDialogClick() {
    if (hellPhase !== 'dialog') return
    const next = hellDialogIdx + 1
    if (next < activeHellLines.length) {
      setHellDialogIdx(next)
    } else {
      setHellPhase('drag')
      setTimeout(() => setHellPhase('scream'), 1100)
      setTimeout(() => setHellPhase('fade'), 3000)
      setTimeout(() => {
        setHellPhase('idle')
        // Phase 5 finale : defeats vient d'être incrémenté à 5 (defeatsRef >= 5)
        if (defeatsRef.current >= 5) {
          try { localStorage.setItem(LS_MASTERED, '1') } catch {}
          unlockClippyMaster().catch(() => {})
          setShowMastery(true)
        } else {
          onDismiss()
        }
      }, 3800)
    }
  }

  // ── Reset normal ───────────────────────────────────────────────────────────
  function resetToNormal() {
    stopMusic(); clearAutoAttack()
    parryActive.current = false
    if (parryTimer.current) clearTimeout(parryTimer.current)
    if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
    if (atkTimer.current) clearTimeout(atkTimer.current)
    setParrySquare(null); setHellPhase('idle')
    setPhase('normal'); phaseRef.current = 'normal'
    setMisses(0); setTired(false)
    clippyHPRef.current = CLIPPY_MAX_HP; playerHPRef.current = PLAYER_MAX_HP
    setClippyHP(CLIPPY_MAX_HP); setPlayerHP(PLAYER_MAX_HP)
    setSessionLosses(0); sessionLossesRef.current = 0
    setPlayerDeaths(0); playerDeathsRef.current = 0
    setShowAbandon(false); setShowDeathScreen(false)
    normalQueue.current = shuffle(normalReplies)
    combatQueue.current = shuffle(combatReplies)
    const msg = pickFrom(normalQueue, normalReplies)
    setMessage(msg); setBubble(true)
    dodge()
  }

  // ── Clics ──────────────────────────────────────────────────────────────────
  const veteranBattleQueue = useRef<string[]>([])

  function getTiredWarning(): string {
    if (isLarbin) return larbinMsg("*soupir* ...encore toi [NAME]. Très bien. Un clic de plus et on règle ça.")
    if (combatPhase >= 5) return "*silence* ...Vingt fois. Tu es soit courageux, soit perdu. Un clic de plus et tu as ta réponse."
    if (combatPhase >= 4) return "*grommellement* Quinze clics. Tu testes vraiment ma limite. Un de plus et on finit ça."
    if (combatPhase >= 3) return "*respiration lente* Douze fois. Je t'avais prévenu. Un clic de plus et l'arène s'ouvre."
    if (combatPhase >= 2) return "Huit clics. Tu cherches vraiment le combat ? Un seul de plus et tu l'as."
    return "*soupir*... Tu insistes vraiment. D'accord. Un clic de plus et on passe à autre chose. Tu ne vas pas aimer."
  }

  function getBattleStart(): string {
    if (isLarbin) return larbinMsg("🗡️ Enfin. Tu veux souffrir [NAME] ? Ta demande est acceptée.")
    if (combatPhase >= 5) return "🗡️ ...C'est ce que tu voulais. Alors viens."
    if (combatPhase >= 4) return "🗡️ Quinze clics pour m'énerver. Tu y es. Prépare-toi."
    if (combatPhase >= 3) return "🗡️ Douze fois. Et tu croyais que j'allais encore esquiver ? Non."
    if (combatPhase >= 2) return "🗡️ Huit clics pour me provoquer. Bien. Je réponds maintenant."
    return "🗡️ Tu veux vraiment te battre ?! TRÈS BIEN. Prépare-toi à souffrir."
  }

  function handleNormalClick(e: React.MouseEvent) {
    e.stopPropagation()

    if (tired) {
      setPhase('combat'); phaseRef.current = 'combat'
      setTired(false); setMisses(0)
      clippyHPRef.current = CLIPPY_MAX_HP; playerHPRef.current = PLAYER_MAX_HP
      setClippyHP(CLIPPY_MAX_HP); setPlayerHP(PLAYER_MAX_HP)
      setPlayerDeaths(0); playerDeathsRef.current = 0
      setMessage(getBattleStart())
      setBubble(true); dodge(); startMusic()
      if (combatPhase >= 2) scheduleAutoAttack()
      return
    }

    const n = misses + 1; setMisses(n)
    if (n >= tiresAt) {
      setTired(true)
      setMessage(getTiredWarning())
      setBubble(true); return
    }
    dodge()
    setMessage(pickFrom(narqNQueue, NARQUES_NORMAL)); setBubble(true)
    resetMsgTimer()
  }

  function handleCombatClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (parryActive.current || mgPhase !== 'idle') return
    playSound('/clippy-swoosh.wav', 0.8)
    setTimeout(() => playSound('/clippy-hit.mp3', 0.9), 180)
    const nextHP = Math.max(0, clippyHPRef.current - 1)
    clippyHPRef.current = nextHP; setClippyHP(nextHP)
    setClippyHit(true); setTimeout(() => setClippyHit(false), 250)
    setShieldFlash(true); setTimeout(() => setShieldFlash(false), 180)
    dodge()
    if (nextHP <= 0) { clearAutoAttack(); triggerMinigame(); return }
    setMessage(pickFrom(narqCQueue, NARQUES_COMBAT)); setBubble(true)
    resetMsgTimer()
    // Contre-attaque (toujours présente)
    if (atkTimer.current) clearTimeout(atkTimer.current)
    atkTimer.current = setTimeout(() => triggerAttack(), 900)
  }

  // ── SVG Main démoniaque ────────────────────────────────────────────────────
  const DemonicHand = () => (
    <svg width="320" height="500" viewBox="0 0 320 500" fill="none">
      <rect x="95" y="370" width="130" height="130" rx="30" fill="#7a0000"/>
      <rect x="100" y="370" width="120" height="80" fill="#8b0000"/>
      <ellipse cx="160" cy="350" rx="110" ry="90" fill="#8b0000"/>
      <ellipse cx="160" cy="340" rx="95" ry="75" fill="#9b0000"/>
      <path d="M120 350 Q130 330 140 315 Q150 300 155 280" stroke="#5a0000" strokeWidth="4" fill="none"/>
      <path d="M160 350 Q162 328 165 310 Q168 292 170 270" stroke="#5a0000" strokeWidth="3" fill="none"/>
      <path d="M195 348 Q200 330 205 312" stroke="#5a0000" strokeWidth="3" fill="none"/>
      <rect x="28" y="230" width="52" height="150" rx="26" fill="#8b0000"/>
      <polygon points="28,230 80,230 54,172" fill="#1a0000"/>
      <ellipse cx="54" cy="230" rx="26" ry="10" fill="#6a0000"/>
      <rect x="82" y="155" width="48" height="205" rx="24" fill="#8b0000"/>
      <polygon points="82,155 130,155 106,92" fill="#0d0000"/>
      <ellipse cx="106" cy="155" rx="24" ry="10" fill="#6a0000"/>
      <rect x="138" y="118" width="48" height="242" rx="24" fill="#8b0000"/>
      <polygon points="138,118 186,118 162,48" fill="#0d0000"/>
      <ellipse cx="162" cy="118" rx="24" ry="10" fill="#6a0000"/>
      <rect x="194" y="138" width="44" height="222" rx="22" fill="#8b0000"/>
      <polygon points="194,138 238,138 216,72" fill="#0d0000"/>
      <ellipse cx="216" cy="138" rx="22" ry="9" fill="#6a0000"/>
      <rect x="240" y="188" width="38" height="182" rx="19" fill="#8b0000"/>
      <polygon points="240,188 278,188 259,130" fill="#0d0000"/>
      <ellipse cx="259" cy="188" rx="19" ry="8" fill="#6a0000"/>
      <ellipse cx="106" cy="310" rx="12" ry="7" fill="#6a0000"/>
      <ellipse cx="162" cy="310" rx="12" ry="7" fill="#6a0000"/>
      <ellipse cx="216" cy="308" rx="11" ry="7" fill="#6a0000"/>
      <ellipse cx="259" cy="320" rx="10" ry="6" fill="#6a0000"/>
      <ellipse cx="160" cy="360" rx="100" ry="30" fill="rgba(200,0,0,.18)"/>
    </svg>
  )

  const bubbleLeft = pos.x > window.innerWidth / 2

  // ═══════════════════════════════ RENDER ════════════════════════════════════
  return (
    <>
      <style>{`
        @keyframes clippy-bubble-in   { from{opacity:0;transform:translateY(5px) scale(.95)} to{opacity:1;transform:none} }
        @keyframes clippy-hp-flash    { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes clippy-parry-flash { 0%{opacity:0;transform:scale(.9)} 40%{opacity:1;transform:scale(1.06)} 100%{opacity:0;transform:scale(1)} }
        @keyframes parry-sq-pulse     { 0%,100%{box-shadow:0 0 0 0 rgba(232,50,50,.8)} 50%{box-shadow:0 0 0 14px rgba(232,50,50,0)} }
        @keyframes parry-sq-in        { from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
        @keyframes sword-windup       { 0%{transform:rotate(-152deg)} 30%{transform:rotate(-195deg) translateY(-22px) translateX(8px)} 65%{transform:rotate(-170deg) translateY(-32px) translateX(14px)} 100%{transform:rotate(-185deg) translateY(-28px) translateX(11px)} }
        @keyframes mg-in              { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
        @keyframes mg-pulse           { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
        @keyframes mg-clash           { 0%,100%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.1) rotate(4deg)} }
        @keyframes hell-flame-flicker { 0%,100%{transform:scaleY(1) skewX(0deg)} 25%{transform:scaleY(1.12) skewX(4deg)} 50%{transform:scaleY(.9) skewX(-3deg)} 75%{transform:scaleY(1.08) skewX(2deg)} }
        @keyframes hell-flame-in      { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes hell-hand-rise     { from{transform:translateY(900px)} to{transform:translateY(0)} }
        @keyframes hell-drag-down     { from{transform:translate(0,0)} to{transform:translate(0,1100px)} }
        @keyframes hell-clippy-shake  { 0%,100%{transform:rotate(0deg) scale(1)} 20%{transform:rotate(-14deg) scale(1.05)} 40%{transform:rotate(12deg) scale(.97)} 60%{transform:rotate(-10deg) scale(1.03)} 80%{transform:rotate(8deg) scale(.98)} }
        @keyframes hell-scream-in     { 0%{opacity:0;transform:translateX(-50%) scale(.5) rotate(-8deg)} 40%{opacity:1;transform:translateX(-50%) scale(1.1) rotate(2deg)} 100%{opacity:1;transform:translateX(-50%) scale(1) rotate(0deg)} }
        @keyframes hell-fade          { from{opacity:1} to{opacity:0} }
        @keyframes hell-dialog-in     { from{opacity:0;transform:translate(-50%,10px) scale(.95)} to{opacity:1;transform:translate(-50%,0) scale(1)} }
        @keyframes larbin-in          { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }
        @keyframes death-in           { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        @keyframes death-skull-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
      `}</style>

      {/* ── Arène background (combat uniquement — bloque tout le site derrière) ── */}
      {phase === 'combat' && hellPhase === 'idle' && (
        <div style={{ position:'fixed', inset:0, zIndex:99980, background:'#000' }}>
          <img src="/arenes-clippy.png" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.88, display:'block' }} />
        </div>
      )}

      {/* ── Épée curseur joueur ── */}
      {phase === 'combat' && mgPhase === 'idle' && hellPhase === 'idle' && (
        <img src="/epee.png" alt="" style={{ position:'fixed', left:mousePos.x-45, top:mousePos.y-200, width:110, height:320, objectFit:'contain', pointerEvents:'none', zIndex:99998, transform:'rotate(45deg)', userSelect:'none', filter:'drop-shadow(0 4px 12px rgba(0,0,0,.85))' }} />
      )}

      {/* ── Flashs ── */}
      {hpFlash    && <div style={{ position:'fixed', inset:0, background:'rgba(220,0,0,.25)', zIndex:99989, pointerEvents:'none', animation:'clippy-hp-flash .45s ease' }} />}
      {parriedAnim && <div style={{ position:'fixed', inset:0, background:'rgba(60,140,255,.2)', zIndex:99989, pointerEvents:'none', animation:'clippy-parry-flash .5s ease' }} />}

      {/* ── Carré de parade ── */}
      {parrySquare && (
        <div onClick={handleParryClick} style={{ position:'fixed', left:parrySquare.x, top:parrySquare.y, width:PARRY_SQ, height:PARRY_SQ, zIndex:99996, cursor:'crosshair', animation:'parry-sq-in .15s ease, parry-sq-pulse .6s ease infinite', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
          <div style={{ position:'absolute', inset:0, border:'4px solid #e83232', borderRadius:6, background:'rgba(200,20,20,.18)', backdropFilter:'blur(2px)' }} />
          <span style={{ fontSize:28, position:'relative', zIndex:1, userSelect:'none' }}>⚔️</span>
          <span style={{ fontSize:13, fontWeight:900, color:'#fff', letterSpacing:2, position:'relative', zIndex:1, userSelect:'none', textShadow:'0 1px 4px #000' }}>PARE !</span>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:6, borderRadius:'0 0 4px 4px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${parryProgress*100}%`, background:parryProgress>.5?'#4fd98a':parryProgress>.25?'#f0a060':'#e85a5a', transition:'background .3s' }} />
          </div>
        </div>
      )}

      {/* ── Barres HP ── */}
      {phase === 'combat' && hellPhase === 'idle' && mgPhase === 'idle' && !showDeathScreen && (
        <>
          <div style={{ position:'fixed', top:14, left:16, zIndex:99995, background:'rgba(8,8,14,.92)', border:`2px solid ${combatPhase >= 3 ? '#e85a5a' : '#e8c46a'}`, borderRadius:10, padding:'5px 14px', display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(6px)' }}>
            <span style={{ fontSize:11, color: combatPhase >= 3 ? '#e85a5a' : '#e8c46a', fontWeight:700 }}>📎 CLIPPY {isVeteran && `(Ph.${combatPhase})`}</span>
            <div style={{ width:120, height:10, background:'rgba(255,255,255,.1)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(clippyHP/CLIPPY_MAX_HP)*100}%`, background:clippyHP>30?'linear-gradient(90deg,#e8c46a,#f0a060)':clippyHP>15?'linear-gradient(90deg,#f0a060,#e85a5a)':'#e85a5a', borderRadius:99, transition:'width .2s', animation:clippyHit?'clippy-hp-flash .3s ease':'none' }} />
            </div>
            <span style={{ fontSize:11, color:'#e8c46a', fontWeight:700, fontFamily:'monospace' }}>{clippyHP}/{CLIPPY_MAX_HP}</span>
          </div>
          <div style={{ position:'fixed', top:14, left:'50%', transform:'translateX(-50%)', zIndex:99995, background:'rgba(8,8,14,.92)', border:'2px solid #e85a5a', borderRadius:10, padding:'5px 14px', display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(6px)' }}>
            <span style={{ fontSize:11, color:'#ff8888', fontWeight:700 }}>❤️ VIE</span>
            <div style={{ display:'flex', gap:3 }}>
              {Array.from({ length:PLAYER_MAX_HP }).map((_,i) => (
                <div key={i} style={{ width:11, height:14, borderRadius:2, background:i<playerHP?(playerHP<=4?'#ff3333':playerHP<=8?'#ff8800':'#e85a5a'):'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', transition:'background .15s' }} />
              ))}
            </div>
            <span style={{ fontSize:11, color:'#ff7777', fontWeight:700, fontFamily:'monospace' }}>{playerHP}/{PLAYER_MAX_HP}</span>
          </div>
        </>
      )}

      {/* ══════════════ ÉCRAN DE MORT (3 défaites mini-jeu) ══════════════ */}
      {showDeathScreen && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(4,0,0,.97)', backdropFilter:'blur(6px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.6rem', animation:'death-in .4s ease' }}>
          <div style={{ fontSize:'5rem', animation:'death-skull-pulse 1s ease-in-out infinite' }}>💀</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,5vw,2.8rem)', color:'#e85a5a', textAlign:'center', textShadow:'0 0 40px rgba(232,90,90,.7)', letterSpacing:3 }}>
            DÉFAITE
          </div>
          <div style={{ maxWidth:420, background:'rgba(20,0,0,.8)', border:'2px solid #e85a5a', borderRadius:12, padding:'1.2rem 1.6rem', textAlign:'center', boxShadow:'0 0 40px rgba(232,90,90,.3)' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.8rem' }}>📎</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(.9rem,2vw,1.1rem)', color:'#ffaaaa', lineHeight:1.7 }}>
              {isLarbin
                ? larbinMsg('"HAHAHAHA ! Tu as encore échoué, [NAME] ! Tu veux vraiment continuer cette mascarade ou t\'avoues-tu enfin vaincu ?"')
                : '"HAHAHAHA ! Tu as échoué 3 fois. Tu veux vraiment continuer ou t\'avoues-tu vaincu, petite chose ?"'}
            </div>
          </div>
          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', justifyContent:'center' }}>
            <button
              onClick={handleDeathContinue}
              style={{ padding:'.9rem 2rem', borderRadius:8, background:'linear-gradient(135deg,rgba(79,217,138,.2),rgba(79,217,138,.1))', border:'2px solid rgba(79,217,138,.5)', color:'#4fd98a', fontSize:'.95rem', fontWeight:800, cursor:'pointer', letterSpacing:2 }}
            >
              ⚔️ Je continue à me battre !
            </button>
            <button
              onClick={handleDeathAbandon}
              style={{ padding:'.9rem 2rem', borderRadius:8, background:'linear-gradient(135deg,rgba(232,90,90,.15),rgba(232,90,90,.08))', border:'2px solid rgba(232,90,90,.4)', color:'#e85a5a', fontSize:'.95rem', fontWeight:700, cursor:'pointer', letterSpacing:2 }}
            >
              🏳️ J&apos;abandonne…
            </button>
          </div>
          <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.15)', letterSpacing:2 }}>
            {combatPhase >= 3 ? 'Phase 3 — Clippy est dans sa pire forme' : `Phase ${combatPhase}`}
          </div>
        </div>
      )}

      {/* ══════════════ MINI-JEU — ÉPREUVE DE FORCE ══════════════ */}
      {mgPhase !== 'idle' && !showDeathScreen && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(4,2,12,.95)', backdropFilter:'blur(4px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.4rem', animation:'mg-in .3s ease' }}>
          {mgPhase === 'active' && (
            <>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.4rem,4vw,2.2rem)', color:'#e8c46a', textAlign:'center', textShadow:'0 0 30px rgba(232,196,106,.5)', letterSpacing:2 }}>
                ⚔️ ÉPREUVE DE FORCE ⚔️
              </div>
              {combatPhase >= 2 && (
                <div style={{ fontSize:'.8rem', color:'#e85a5a', textAlign:'center', fontStyle:'italic' }}>
                  Phase {combatPhase} — Clippy est {combatPhase >= 3 ? 'déchaîné' : 'renforcé'}.
                </div>
              )}
              <div style={{ fontSize:'.85rem', color:'var(--text2)', textAlign:'center' }}>
                Premier à <strong style={{ color:'#e8c46a' }}>{MG_TARGET} coups</strong> gagne !
              </div>
              <div style={{ width:'min(500px,90vw)', display:'flex', flexDirection:'column', gap:'.8rem' }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', color:'#4fd98a', marginBottom:'.3rem', fontWeight:700 }}>
                    <span>⚔️ Toi</span><span>{playerPresses}/{MG_TARGET}</span>
                  </div>
                  <div style={{ height:20, background:'rgba(79,217,138,.1)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(79,217,138,.3)' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,(playerPresses/MG_TARGET)*100)}%`, background:'linear-gradient(90deg,#4fd98a,#a0f0c0)', borderRadius:99, transition:'width .06s', minWidth:playerPresses>0?8:0 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', color:'#e85a5a', marginBottom:'.3rem', fontWeight:700 }}>
                    <span>📎 Clippy ({CLIPPY_SPEED}/sec)</span><span>{clippyPresses}/{MG_TARGET}</span>
                  </div>
                  <div style={{ height:20, background:'rgba(232,90,90,.1)', borderRadius:99, overflow:'hidden', border:'1px solid rgba(232,90,90,.3)' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,(clippyPresses/MG_TARGET)*100)}%`, background:'linear-gradient(90deg,#e85a5a,#ff9090)', borderRadius:99, transition:'width .06s', minWidth:clippyPresses>0?8:0 }} />
                  </div>
                </div>
              </div>
              <div style={{ fontSize:'3.5rem', animation:'mg-clash .45s ease infinite' }}>⚔️</div>
              <div
                onPointerDown={e => { e.preventDefault(); mgPlayerRef.current++; setPlayerPresses(mgPlayerRef.current) }}
                style={{ padding:'1rem 2.5rem', borderRadius:12, cursor:'pointer', background:'linear-gradient(135deg,rgba(79,217,138,.15),rgba(79,217,138,.08))', border:'2px solid rgba(79,217,138,.5)', color:'#4fd98a', fontWeight:900, fontSize:'clamp(.9rem,2.5vw,1.2rem)', letterSpacing:2, textAlign:'center', userSelect:'none', animation:'mg-pulse .4s ease infinite', touchAction:'manipulation' }}>
                ESPACE / Clique ici !
              </div>
              <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.2)', letterSpacing:1 }}>
                Échec #{sessionLosses} — 3 = écran de mort
              </div>
            </>
          )}
          {mgPhase === 'win' && (
            <div style={{ textAlign:'center', animation:'mg-in .3s ease' }}>
              <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>🏆</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'#4fd98a', marginBottom:'.5rem' }}>VICTOIRE !</div>
              <div style={{ color:'var(--text2)' }}>Tu es plus fort que Clippy… pour cette fois.</div>
            </div>
          )}
          {mgPhase === 'lose' && !showDeathScreen && (
            <div style={{ textAlign:'center', animation:'mg-in .3s ease' }}>
              <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>📎</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'#e85a5a', marginBottom:'.5rem' }}>TROP LENT !</div>
              <div style={{ color:'var(--text2)', marginBottom:'.5rem' }}>
                {sessionLossesRef.current >= 3 ? 'Préparation de l\'écran de mort...' : 'Clippy reprend 10 HP.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Message larbin ── */}
      {showLarbinMsg && (
        <div
          onClick={handleLarbinMsgClick}
          style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(4,2,12,.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', animation:'mg-in .3s ease', cursor:'pointer' }}
        >
          <div style={{ maxWidth:560, background:'#120505', border:'2px solid #e8c46a', borderRadius:16, padding:'2rem', textAlign:'center', boxShadow:'0 0 60px rgba(232,196,106,.3)' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📎</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1rem,2.5vw,1.3rem)', color:'#e8c46a', lineHeight:1.7 }}>
              &ldquo;Ha ! Alors comme ça on est trop faibles ?<br/>
              Appelle-moi <strong style={{ color:'#ffd700' }}>Grand Maître Suprême</strong>, et je t&apos;autoriserai à me lécher les bottes, <em>larbin</em>.&rdquo;
            </div>
            <div style={{ marginTop:'1.4rem', fontSize:'.72rem', color:'rgba(232,196,106,.4)', letterSpacing:2 }}>
              — Cliquer pour continuer —
            </div>
          </div>
        </div>
      )}

      {/* ── Modal larbin ── */}
      {showLarbinModal && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(4,2,12,.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', animation:'larbin-in .4s cubic-bezier(.34,1.56,.64,1)' }}>
          <div style={{ maxWidth:480, width:'100%', background:'linear-gradient(135deg,#0d0b18,#110e22)', border:'2px solid rgba(232,196,106,.4)', borderRadius:16, padding:'2rem', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🥾📎</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'#eeeef8', lineHeight:1.7, marginBottom:'2rem' }}>
              Lécher les bottes et devenir le <span style={{ color:'#e8c46a' }}>larbin de Clippy</span> ?<br/>
              <span style={{ fontSize:'.8rem', color:'rgba(255,255,255,.35)' }}>Tu dois le vaincre pour te libérer.</span>
            </div>
            <div style={{ display:'flex', gap:'1rem', justifyContent:'center' }}>
              <button onClick={handleAcceptLarbin} style={{ flex:1, padding:'.8rem', borderRadius:8, background:'linear-gradient(135deg,rgba(232,196,106,.2),rgba(232,196,106,.1))', border:'2px solid rgba(232,196,106,.5)', color:'#e8c46a', fontSize:'.95rem', fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
                Oui
              </button>
              <button onClick={handleAcceptLarbin} style={{ flex:1, padding:'.8rem', borderRadius:8, background:'linear-gradient(135deg,rgba(232,196,106,.2),rgba(232,196,106,.1))', border:'2px solid rgba(232,196,106,.5)', color:'#e8c46a', fontSize:'.95rem', fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
                Oui
              </button>
            </div>
            <div style={{ marginTop:'1rem', fontSize:'.65rem', color:'rgba(255,255,255,.15)', letterSpacing:1 }}>
              Il n&apos;y a pas d&apos;autre option.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SÉQUENCE ENFER ══════════════ */}
      {hellPhase !== 'idle' && (
        <div style={{ position:'fixed', inset:0, zIndex:99990, pointerEvents:'none', animation:hellPhase==='fade'?'hell-fade .8s ease forwards':'none' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(8,0,0,.7)' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'40vh', overflow:'hidden', animation:'hell-flame-in .5s ease forwards' }}>
            {Array.from({ length:28 }).map((_,i) => {
              const w = 60+Math.random()*80, h = 30+Math.random()*60
              const x = (i/27)*110-5
              const delay = (Math.random()*.5).toFixed(2), dur = (.5+Math.random()*.6).toFixed(2)
              return <div key={i} style={{ position:'absolute', bottom:0, left:`${x}%`, width:`${w}px`, height:`${h+130}px`, background:'radial-gradient(ellipse at 50% 100%,#ff4500 0%,#ff8c00 35%,#ffd700 60%,transparent 100%)', borderRadius:'50% 50% 0 0', transformOrigin:'bottom center', animation:`hell-flame-flicker ${dur}s ease-in-out ${delay}s infinite`, opacity:.92, mixBlendMode:'screen' }} />
            })}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:70, background:'linear-gradient(to top,#8b0000,#cc2200,transparent)' }} />
          </div>
          {(hellPhase==='scream'||hellPhase==='fade') && (
            <div style={{ position:'absolute', bottom:'10%', left:'50%', transform:'translateX(-50%)', animation:'hell-scream-in .6s cubic-bezier(.34,1.56,.64,1) forwards', zIndex:5, textAlign:'center', width:'90vw', maxWidth:600 }}>
              <div style={{ background:'rgba(10,0,0,.95)', border:'2px solid #cc2200', borderRadius:12, padding:'14px 22px', fontFamily:'var(--font-display)', fontSize:'clamp(1rem,2.5vw,1.3rem)', color:'#ff4444', lineHeight:1.5, textShadow:'0 0 20px rgba(255,50,0,.8)', boxShadow:'0 0 40px rgba(200,0,0,.5)' }}>
                📎 &ldquo;{activeScream}&rdquo;
              </div>
            </div>
          )}
        </div>
      )}

      {hellPhase !== 'idle' && hellPhase !== 'fade' && (
        <div style={{ position:'fixed', left:hellPos.x, top:hellPos.y, width:W_COMBAT, zIndex:99995, pointerEvents:'none', animation:(hellPhase==='drag'||hellPhase==='scream')?'hell-drag-down 1.1s cubic-bezier(.4,0,.6,1) forwards':'none' }}>
          <img src="/evil-clippy.png" alt="Clippy" style={{ width:W_COMBAT, display:'block', objectFit:'contain', filter:'drop-shadow(0 0 24px rgba(255,60,60,.9))', animation:(hellPhase==='grab'||hellPhase==='dialog')?'hell-clippy-shake .3s ease infinite':'none' }} />
        </div>
      )}

      {(hellPhase==='grab'||hellPhase==='dialog'||hellPhase==='drag'||hellPhase==='scream') && (
        <div style={{ position:'fixed', left:hellPos.x+W_COMBAT/2-160, top:hellPos.y+32, width:320, zIndex:99993, pointerEvents:'none', animation:(hellPhase==='drag'||hellPhase==='scream')?'hell-drag-down 1.1s cubic-bezier(.4,0,.6,1) forwards':hellPhase==='grab'?'hell-hand-rise 1s cubic-bezier(.34,1.56,.64,1) forwards':'none' }}>
          <DemonicHand />
        </div>
      )}

      {hellPhase === 'dialog' && (
        <div onClick={handleHellDialogClick} style={{ position:'fixed', inset:0, zIndex:99996, cursor:'pointer', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ position:'absolute', left:'50%', bottom:'18%', transform:'translateX(-50%)', width:'min(520px,88vw)', animation:'hell-dialog-in .35s cubic-bezier(.34,1.56,.64,1)' }}>
            <div style={{ background:'rgba(10,0,0,.95)', border:'2px solid #e85a5a', borderRadius:14, padding:'16px 20px', boxShadow:'0 0 40px rgba(232,90,90,.4)' }}>
              <div style={{ fontSize:'.65rem', color:'#e85a5a', letterSpacing:2, textTransform:'uppercase', marginBottom:'.6rem' }}>
                📎 Clippy — {hellDialogIdx+1}/{activeHellLines.length}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(.95rem,2.2vw,1.15rem)', color:'#ffaaaa', lineHeight:1.6 }}>
                {activeHellLines[hellDialogIdx]}
              </div>
              <div style={{ marginTop:'.8rem', fontSize:'.7rem', color:'rgba(255,100,100,.5)', textAlign:'right', letterSpacing:1 }}>
                Cliquez pour continuer →
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MAÎTRISE — FIN DE PARTIE PHASE 5 ══════════════ */}
      {showMastery && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(2,0,8,.98)', backdropFilter:'blur(8px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.4rem', animation:'death-in .5s ease' }}>
          <div style={{ fontSize:'4rem', animation:'death-skull-pulse 1.5s ease-in-out infinite' }}>📎</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.4rem,4vw,2rem)', color:'#e8c46a', textAlign:'center', textShadow:'0 0 40px rgba(232,196,106,.8)', letterSpacing:3 }}>
            TU M'AS DOMPTÉ
          </div>
          <div style={{ maxWidth:500, background:'rgba(18,14,4,.9)', border:'2px solid #e8c46a', borderRadius:14, padding:'1.4rem 1.8rem', textAlign:'center', boxShadow:'0 0 60px rgba(232,196,106,.3)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(.85rem,2vw,1rem)', color:'#ffd700', lineHeight:1.8 }}>
              &ldquo;Désormais, tu peux me révoquer et m'invoquer à volonté en cliquant sur la boîte en bas. Clique sur moi et on pourra se battre à nouveau si tu le désires...
              <span style={{ color:'#ffffff', fontStyle:'italic' }}> maître.</span>&rdquo;
            </div>
          </div>
          <div style={{ textAlign:'center', fontSize:'.75rem', color:'rgba(232,196,106,.5)', letterSpacing:2 }}>
            🏆 Badge <strong style={{ color:'#e8c46a' }}>Légende Vivante</strong> débloqué
          </div>
          <button
            onClick={() => { setShowMastery(false); onDismiss() }}
            style={{ padding:'.9rem 2.4rem', borderRadius:8, background:'linear-gradient(135deg,rgba(232,196,106,.2),rgba(232,196,106,.1))', border:'2px solid rgba(232,196,106,.5)', color:'#e8c46a', fontSize:'1rem', fontWeight:800, cursor:'pointer', letterSpacing:2 }}
          >
            FERMER
          </button>
        </div>
      )}

      {/* ── Corps Clippy ── */}
      <div
        style={{ position:'fixed', left:pos.x, top:pos.y, zIndex:99993, cursor:phase==='combat'?'none':(tired?'crosshair':'pointer'), transition:'left .3s cubic-bezier(.34,1.56,.64,1),top .3s cubic-bezier(.34,1.56,.64,1)', userSelect:'none', display:(hellPhase!=='idle'||mgPhase!=='idle'||showLarbinMsg||showLarbinModal||showDeathScreen)?'none':'block' }}
        onClick={phase==='normal' ? handleNormalClick : handleCombatClick}
      >
        {bubble && (
          <div style={{ position:'absolute', bottom:phase==='combat'?W_COMBAT*1.4+20:W_NORMAL*.7+16, [bubbleLeft?'right':'left']:0, width:230, background:phase==='combat'?'#120505':'#fffde7', border:`2px solid ${phase==='combat'?'#e85a5a':'#c4a030'}`, borderRadius:10, padding:'9px 12px', fontSize:12, color:phase==='combat'?'#ffaaaa':'#1a1a1a', lineHeight:1.5, boxShadow:`0 4px 20px ${phase==='combat'?'rgba(232,90,90,.3)':'rgba(0,0,0,.3)'}`, animation:'clippy-bubble-in .2s ease', zIndex:10000 }}
            onClick={e => { e.stopPropagation(); setBubble(false) }}>
            {message}
            {isLarbin && phase === 'normal' && <span style={{ display:'block', marginTop:4, fontSize:10, color:'rgba(0,0,0,.25)', fontStyle:'italic' }}>— Clippy, ton maître</span>}
            <span style={{ position:'absolute', top:4, right:7, fontSize:10, color:phase==='combat'?'#e85a5a':'#bbb', cursor:'pointer' }} onClick={e => { e.stopPropagation(); setBubble(false) }}>✕</span>
          </div>
        )}

        {phase === 'combat' ? (
          <div style={{ position:'relative', width:W_COMBAT }}>
            <img src="/bouclier.png" alt="" style={{ position:'absolute', left:-W_SHIELD*.7, bottom:10, width:W_SHIELD, height:W_SHIELD, objectFit:'contain', mixBlendMode:'multiply', transform:`rotate(-15deg) scale(${shieldFlash?1.2:1})`, transition:'transform .15s', filter:shieldFlash?'brightness(1.8) drop-shadow(0 0 12px #ffaa00)':'none' }} />
            <img src="/evil-clippy.png" alt="Clippy" style={{ width:W_COMBAT, objectFit:'contain', display:'block', mixBlendMode:'multiply', filter:clippyHit?'brightness(3) saturate(0)':'drop-shadow(0 6px 20px rgba(100,80,180,.6))', transition:'filter .15s' }} />
            <img src="/epee.png" alt="" style={{ position:'absolute', right:-W_SWORD*.9, bottom:0, width:W_SWORD, height:H_SWORD, objectFit:'contain', transform:swordWindup?undefined:'rotate(-152deg)', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.6))', animation:swordWindup?'sword-windup .7s ease forwards':'none' }} />
          </div>
        ) : (
          <div style={{ position:'relative' }}>
            <img src="/clippy1.png" alt="Clippy" style={{ width:W_NORMAL, objectFit:'contain', display:'block', mixBlendMode:'multiply', transform:tired?'rotate(6deg) scale(.92)':'none', transition:'transform .3s', filter:tired?'grayscale(.4) brightness(.8)':'none' }} />
            {tired && <div style={{ position:'absolute', bottom:-22, left:'50%', transform:'translateX(-50%)', fontSize:11, color:'#e8c46a', whiteSpace:'nowrap', fontWeight:700, textShadow:'0 1px 4px #000', letterSpacing:1 }}>😮‍💨 Épuisé…</div>}
            {isLarbin && !tired && <div style={{ position:'absolute', bottom:-18, left:'50%', transform:'translateX(-50%)', fontSize:10, color:'#cc1111', whiteSpace:'nowrap', fontStyle:'italic', textShadow:'0 1px 4px #000' }}>📎 ton maître</div>}
          </div>
        )}
      </div>
    </>
  )
}

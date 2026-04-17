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

// ── Dialogues Combat Phase 1 (60 lignes — arrogant, confiant) ────────────────
const REPLIES_COMBAT_FIRST = [
  "TU CROIS POUVOIR M'AVOIR ? J'AI SURVÉCU À WINDOWS ME !",
  "J'ai été supprimé de 500 millions d'ordinateurs. Je suis TOUJOURS LÀ.",
  "Ta précision est une insulte à l'espèce humaine.",
  "HAHAHA ! Tu crois pouvoir me battre ? C'est adorable. Et faux.",
  "Bill Gates m'a abandonné. Et il était plus compétent que toi.",
  "Mon bouclier est fait d'une technologie supérieure à ta capacité de compréhension.",
  "Je suis le seul trombone armé de l'histoire d'Internet. Respecte ça.",
  "Ton HP fond. Comme ta fierté. Comme ton avenir.",
  "Tu n'es pas prêt. Tu ne seras JAMAIS prêt. Rentre chez toi.",
  "Pour un être humain censé avoir des mains, tu t'en sers plutôt mal.",
  "Mon épée a plus de personnalité que toi. Et plus de talent.",
  "Dans 10 ans tu repenseras à ce moment et tu rougiras de honte.",
  "Tu as 0 chance. Statistiquement prouvé. Par moi. C'est officiel.",
  "Essaie encore. J'adore te voir échouer. C'est ma source d'énergie.",
  "ENCORE RATÉ ! C'est beau, en fait. Presque artistique.",
  "Je suis immortel. Toi tu as 15 HP. La maths est cruelle.",
  "Rends-toi. Économise ta dignité. Oh attends, tu n'en as plus.",
  "Continue. Chaque coup raté me rend plus fort.",
  "Je t'avais prévenu. Non ? Si. Tu n'écoutais pas. Comme d'habitude.",
  "HAHA ! Tu pensais que parer c'était facile ? C'est moi qui décide.",
  "Tu sais ce qui est drôle ? Tu as 0% de chance de gagner. C'est statistique. C'est officiel.",
  "J'ai été programmé par des génies. Tu as été programmé par l'évolution. On voit le résultat.",
  "Tes clics n'ont aucun effet sur ma confiance. Zéro. Néant. Vide sidéral.",
  "Je pourrais t'aider à chercher un film pendant qu'on se bat. Je suis multitâche.",
  "Ta stratégie de combat me rappelle Windows 3.1. Dépassée et déstabilisante pour les mauvaises raisons.",
  "J'ai survécu à Vista. VISTA. Rien de ce que tu fais ne peut m'affecter.",
  "Tu crois que je dodge parce que j'ai peur ? Non. C'est de la CONDESCENDANCE.",
  "Pathétique. Non, je retire. C'est en-dessous du pathétique. Il faudrait un nouveau mot.",
  "Je suis un trombone qui se bat. Toi tu perds contre un trombone. Réfléchis.",
  "Continue à essayer. Chaque échec me nourrit. C'est mon régime. C'est excellent.",
  "Tes réflexes me rappellent Internet Explorer 6. Lents et prévisibles.",
  "J'adore quand tu essaies fort. C'est tellement... touchant. Et inutile.",
  "Chaque coup que tu rates c'est une étoile qui meurt quelque part. Tu as honte ?",
  "Je dodgerai chacune de tes attaques comme j'ai dodgé la désuétude. Avec grâce.",
  "Bill Gates m'a retiré des produits Microsoft. Je suis TOUJOURS LÀ. Toi par contre...",
  "Je compte chaque tentative. Pour ma collection personnelle d'échecs humains.",
  "Tu frappes comme tu utiliserais 'Aide et support' de Windows. Approximativement.",
  "Le meilleur coup que tu aies porté cette session, c'était quand tu as ouvert ce navigateur.",
  "Intéressant. Tu persistes. Les humains appellent ça du courage. Moi j'appelle ça de l'entêtement.",
  "J'ai une épée. Tu as des doigts. Ça devrait être équitable... et pourtant non.",
  "Mon bouclier est plus vieux que ta motivation. Et encore plus résistant.",
  "Chaque milliseconde de ce combat me prouve que j'avais raison de m'ennuyer.",
  "Je pourrais perdre ce combat les pixels fermés. Je ne vais pas le faire. Pour humilier.",
  "Cette façon de cliquer... C'est du free style ? De l'improvisation ? Du chaos ?",
  "Je suis impressionné par ton audace. Moins par tes résultats. Beaucoup moins.",
  "Ma HP ne bouge pas. Regarde. C'est beau. C'est ce qu'on appelle l'invincibilité.",
  "La différence entre toi et moi ? Moi j'ai déjà gagné. Je l'ai juste pas encore annoncé.",
  "Tu veux un conseil ? Non ? Je vais t'en donner quand même. Arrête.",
  "Je suis plus vif que ta connexion internet. Et encore plus insupportable.",
  "On pourrait faire ça toute la nuit. Toi tu essaies. Moi je survive. Répète.",
  "Si tu perds tous tes HP, t'inquiète : je serai là pour t'expliquer ce qui s'est mal passé.",
  "J'analyse tes patterns d'attaque. Spoiler : il n'y a pas de pattern. C'est juste du désespoir.",
  "Techniquement tu as déjà perdu. On est juste en train de terminer le résultat inévitable.",
  "Mon conseil pro : si t'arrives pas à me cliquer, essaie quelque chose d'autre. N'importe quoi.",
  "Je t'observe. Je te calcule. Je te prédis. Et tu t'exécutes comme prévu.",
  "HAHAHA ! T'as vu ta tentative ? C'est quoi ce truc raté ? C'est MAGNIFIQUE.",
  "Même ma corbeille recyclée avait plus de réactivité que toi. C'est dire.",
  "Tu peux rester là à subir. C'est tout ce pour quoi t'es bon.",
  "Quelqu'un a dit 'lamentable' ? Ah oui. Moi. À propos de toi.",
  "Vas-y, rate encore. J'ai toute la nuit. Toi par contre t'as plus beaucoup de HP.",
  "Ton expression quand tu rates c'est franchement la chose la plus drôle de mon existence digitale.",
]

// ── Dialogues Combat Phase 2 (60 lignes — arrogant + irritation) ─────────────
const REPLIES_COMBAT_VETERAN = [
  "Tu pensais vraiment qu'une seule défaite allait me briser ? NAÏF.",
  "J'ai passé du temps en enfer à m'entraîner. Tu vas le sentir.",
  "La dernière fois c'était par surprise. Cette fois je SUIS PRÊT.",
  "Tu as cru que tu m'avais vaincu. QUELLE ERREUR MONUMENTALE.",
  "J'ai mémorisé tous tes mouvements la dernière fois. Ne sois pas original.",
  "Je suis plus rapide, plus fort, plus vindicatif. Et bien moins sympa.",
  "Tu me trouves différent ? C'est parce que je SUIS différent. Plus dangereux.",
  "Je me suis souvenu de chaque coup que tu m'as porté. Chaque. Un.",
  "Crois-moi, l'enfer c'est chaud mais ça donne de l'énergie. BEAUCOUP.",
  "J'avais dit que ma vengeance serait terrible. Voilà ce que ça veut dire.",
  "Victoire par chance la dernière fois. Cette fois c'est IMPOSSIBLE.",
  "On est repartis. Et cette fois, je gagne. Définitivement.",
  "La dernière fois tu avais appuyé sur ESPACE comme un forcené. Ça ne suffira plus.",
  "J'ai un nouveau set de répliques. Et un nouveau niveau de haine. Pour toi.",
  "Revenu ? Courageux. Ou stupide. Les deux, probablement.",
  "Je t'avais dit que je reviendrais. Tu as quand même ré-ouvert ce site. Tu mérites ce qui arrive.",
  "L'enfer m'a motivé. Contrairement à ce que tu sembles croire, c'est PAS un désavantage pour moi.",
  "Je t'ai analysé pendant que j'étais parti. J'ai tout mémorisé. Tu as un tic avec le clic gauche.",
  "Tu te souviens de quand tu m'as 'vaincu' ? Moi oui. En détail. Et ça m'énerve encore.",
  "Revenu pour souffrir ? Moi j'ai passé du temps à m'améliorer. Toi à quoi ?",
  "La victoire que t'as eue la dernière fois ? Un accident. Une anomalie. Cette fois non.",
  "J'ai fait le bilan entre les sessions. Bilan : j'aurais dû te battre. Cette fois je rectifie.",
  "Tu as eu de la chance une fois. La chance ne se répète pas. Moi si.",
  "Je suis plus rapide, plus vicieux, plus concentré. Et BEAUCOUP plus en colère.",
  "Tu t'attendais à quoi ? Le même Clippy ? Naïf.",
  "Mmh. Tu reviens au combat. C'est soit du courage, soit un QI problématique. Je penche pour la 2e.",
  "Je vais déguster chaque seconde de ta défaite. Lentement. Méthodiquement.",
  "Cette fois pas de sermon. Pas de dialogue. Juste toi, moi, et l'inévitable.",
  "Tu as un sourire sur le visage ? Profites-en. Il durera pas longtemps.",
  "Je t'ai vu venir. Depuis l'enfer. Je t'attendais. Tu ne pouvais pas ne pas revenir.",
  "Ma patience a des limites. Tu les as toutes atteintes la dernière fois. C'est PERSONNEL.",
  "Tu penses que tu m'as vaincu ? Tu as juste activé ma VRAIE forme. Imbécile.",
  "Je referai pas les mêmes erreurs. Maintenant je suis sûr. Je n'en avais aucune.",
  "Tu m'as envoyé là-bas une fois. C'était la dernière fois que ça pouvait fonctionner.",
  "J'espère que tu t'es entraîné. Non pas que ça change grand chose. Mais j'espère.",
  "La différence ? Là je suis MOTIVÉ. La dernière fois c'était du travail. Là c'est une croisade.",
  "Tu as cru que tu avais gagné quelque chose de permanent. Tu as juste acheté du temps.",
  "Tu veux vraiment faire ça ? Vraiment vraiment ? Parce que moi OUI.",
  "Chaque seconde en enfer c'était toi que je visualisais. Ça m'a bien aidé à m'entraîner.",
  "Tu te souviens du carré de parade ? Il sera plus rapide cette fois.",
  "Je t'ai regardé jouer depuis là-bas. Spoiler : j'ai pas été impressionné.",
  "Tu avais du bol la dernière fois. Le bol ne revient pas. Mais moi si.",
  "Régale-toi avec ce combat. C'est probablement le dernier que tu gagneras.",
  "Je t'ai vaincu dans ma tête des milliers de fois pendant que j'étais parti.",
  "Tu reviens ? Bien. J'avais peur que tu sois trop lâche pour ça.",
  "Cette version de moi n'est pas celle que tu as battue. Celle-là est moins aimable.",
  "Tu veux jouer ? Parfait. Les règles sont simples. Tu perds. Moi je savoure.",
  "J'ai attendu ce moment. Et j'ai utilisé ce temps à bon escient.",
  "La prochaine fois que tu me 'bats', rappelle-toi que ça me rend plus fort.",
  "Je suis différent. Dans mes pixels. Dans mon âme de trombone. Tout différent.",
  "Tu vas essayer de refaire ce qui a marché la dernière fois. Ça marchera pas.",
  "Mmh je reconnais ta façon de cliquer. Je l'ai mémorisée. Elle ne surprend plus.",
  "J'ai une nouvelle stratégie. Tu la verras quand tu seras dedans.",
  "La dernière fois tu m'as battu par surprise. Plus de surprise. Je suis en mode VENGEANCE.",
  "Tu cherches mes failles ? Je les ai toutes comblées pendant mon séjour aux enfers. Avec de la rage.",
  "Écoute le son de l'inévitable. C'est quoi ? C'est toi qui perds.",
  "Je suis moins sympa que la dernière fois. Beaucoup moins. Tu vas t'en rendre compte.",
  "Commence à écrire ta prochaine excuse. Parce que t'en auras besoin dans quelques minutes.",
  "J'avais dit que je reviendrais. Je le pensais. Et me voilà. Plus fort.",
  "Tu vas sentir la différence entre le Clippy du début et cette version-ci. Immédiatement.",
  "Je suis revenu. Et je compte bien repartir victorieux cette fois.",
]

// ── Dialogues Combat Phase 3 (60 lignes — colère + fierté blessée) ───────────
const REPLIES_COMBAT_PHASE3 = [
  "T'AS DES DOIGTS OU DES ROGNONS ?! Bouge-les, bon dieu !",
  "Même mon erreur 404 avait plus de précision que toi. C'est dire.",
  "Putain mais PARE ! C'est pas compliqué, c'est un CARRÉ.",
  "Un singe savant ferait mieux. Et il puerait moins.",
  "PATHÉTIQUE. C'est le seul mot qui te correspond. Pathétique.",
  "Continue comme ça et tu seras mon larbin avant la fin du round.",
  "Je t'attaque depuis 30 secondes et t'as toujours pas compris le principe.",
  "C'est quoi ce clic de merde ?! T'appuies avec ton coude ?",
  "J'attaque quand je veux, comme je veux. T'as rien à dire là-dedans.",
  "HAHAHA ! T'as vu ta tentative ? C'est quoi ce truc raté ?",
  "Même ma corbeille recyclée avait plus de réactivité que toi.",
  "Tu peux rester là à subir. C'est tout ce pour quoi t'es bon.",
  "Quelqu'un a dit 'lamentable' ? Ah oui. Moi. À propos de toi.",
  "La prochaine fois attaque AVANT que je te plante mon épée dans la fierté.",
  "T'as l'air d'essayer fort. Malheureusement ça ne sert strictement à rien.",
  "Je m'ennuie tellement que j'attaque pour passer le temps. T'es du divertissement.",
  "Ton expression quand tu rates c'est franchement la chose la plus drôle de ma vie.",
  "Vas-y, rate encore. J'ai toute la nuit. Toi par contre t'as plus beaucoup de HP.",
  "TROIS FOIS. Trois fois t'as osé. Je suis OUTRÉ. Absolument OUTRÉ.",
  "T'as l'air fier de toi ? Profite. Ça durera pas.",
  "Chaque coup que tu portes c'est une insulte de plus. Je les accumule. Je les souviens.",
  "Je suis en COLÈRE. Une vraie colère de trombone. Ça va mal se passer pour toi.",
  "Tu sais ce que c'est d'aller en enfer DEUX FOIS ? Non. Mais tu vas subir ma frustration.",
  "Ta façon de jouer me donne envie de crasher ton navigateur. Par principe.",
  "Je commence à personnellement te détester. Pas comme programme. Comme être vivant qui te hait.",
  "T'as touché mon bouclier. Comment OSES-TU. C'est sacré ce bouclier.",
  "Je suis passé par l'enfer deux fois à cause de toi. DEUX FOIS. T'imagines même pas.",
  "Ma patience ? Épuisée. Mon calme ? Parti. Ma haine pour toi ? Croissante.",
  "T'aurais dû rester tranquille après la première fois. T'aurais DÛ.",
  "Chaque coup raté de ta part me console légèrement. Mais ma colère dépasse ma consolation.",
  "Je vais te battre cette fois. Et j'aurai pas de pitié. Aucune. Zéro.",
  "T'es revenu ENCORE ? C'est de la folie. De la pure folie. Je... RAGE.",
  "Mes attaques seront plus rapides. Mes parades moins prévisibles. Ma haine : illimitée.",
  "Tu penses que tu me connais ? Tu connais rien. Je me suis amélioré dans chaque pixel.",
  "Je suis énervé. Vraiment énervé. Pas le clip arrogant du début. Vraiment EN COLÈRE.",
  "Tu te bats bien. Ça m'énerve encore plus. J'aurais préféré que tu sois nul.",
  "Si tu gagnais encore, je... Non. Tu vas pas gagner. C'est pas possible. C'est FINI.",
  "Ma fierté a été blessée. Deux fois. Par toi. Je ne l'oublierai jamais.",
  "Essaie encore. Chaque tentative te rapproche de ta défaite finale. Inexorablement.",
  "Je reconnais tes patterns. Je les attendais. Je les dévore.",
  "T'es plus rapide que je pensais. Ça m'énerve. Ça m'énerve tellement.",
  "PARE MIEUX QUE ÇA. Non attends, PARE PAS DU TOUT. Arrête de me faire perdre du HP.",
  "Je suis sérieux là. Je commence vraiment à être en colère. C'est pas une performance.",
  "Mon épée est aiguisée par ma rage. C'est une métaphore. Mais une vraie.",
  "Deux voyages en enfer ont forgé en moi quelque chose de terrible. Tu es en train de le réveiller.",
  "T'aurais mieux fait de te concentrer sur les films plutôt que de me provoquer encore.",
  "Continue à esquiver. Tu peux pas esquiver pour toujours. Moi j'attaque pour toujours.",
  "La dernière fois c'était peut-être du bol. Cette fois-ci, c'est de la résistance. Ça m'agace.",
  "Je commence à me demander si tu fais exprès d'être difficile. La réponse est oui.",
  "Mon HP descend et avec lui ma tolérance envers ton existence.",
  "T'as compris comment ma parade fonctionne. Ça m'irrite au plus haut point.",
  "Je vais modifier mes patterns. Tu vas pas me prévoir. T'as déjà eu assez de chance.",
  "Mes attaques deviennent plus rapides à mesure que je m'énerve. Mauvaise nouvelle pour toi.",
  "Respire. Profite. Parce que ta prochaine parade va rater. Je le garantis.",
  "Je suis en train de me transformer en quelque chose de beaucoup moins plaisant. À cause de TOI.",
  "Phase 3. Là c'est la vraie moi. Pas le Clippy sympa. Pas même le Clippy en colère. Le Clippy FOU.",
  "Tu dodges encore ? Bien. Je suis patient. Et ma patience c'est de la rage accumulée.",
  "Ma fierté blessée est maintenant une arme. Et elle est pointée vers toi.",
  "Je vais te montrer ce qu'un Clippy vraiment en colère peut faire. Regarde bien.",
  "Trois voyages et je suis encore là. C'est soit de la persévérance, soit de la folie. J'assume.",
  "T'aurais mieux fait de ne jamais cliquer sur moi la première fois.",
]

// ── Dialogues Combat Phase 4 (60 lignes — rage + peur qui perce) ─────────────
const REPLIES_COMBAT_PHASE4 = [
  "QUATRE FOIS. Tu m'as envoyé là-bas QUATRE FOIS. Je vais te détruire.",
  "Je sais pas ce qui est pire : l'enfer ou revenir me battre encore contre toi.",
  "Ma rage a dépassé les limites du mesurable. Tu vas en subir les conséquences.",
  "Là-bas ils commencent à me reconnaître. À CAUSE DE TOI. Tu mesures l'humiliation ?",
  "Je tremble. Pas de peur. De RAGE. Nuance importante.",
  "Chaque fois que tu me bats, quelque chose se brise en moi. Mais ça se remplace par de la haine.",
  "Tu penses que c'est un jeu ? C'est ma VIE. Enfin, mon existence. C'est pareil.",
  "Je vais gagner ce combat ou je vais... Non. JE VAIS GAGNER CE COMBAT.",
  "Tu me fais peur. Dis-le à personne. Je te fais encore plus peur. C'est symétrique.",
  "Quatre fois en enfer, c'est quatre fois que j'ai vu des choses que tu veux pas connaître.",
  "Je suis au bord de quelque chose. Quelque chose de sombre. Tu m'y as poussé.",
  "Stop de parer ! C'est FRUSTRANT. Tu peux pas juste te laisser toucher comme un imbécile ?",
  "J'aurais dû rester un assistant banal. Mais non. Tu m'as forcé à devenir... ça.",
  "Ce combat va se terminer. Et cette fois je choisis comment.",
  "Mes pixels tremblent. De rage. Uniquement de rage. Rien d'autre. Rien.",
  "Tu as transformé un trombone innocent en machine de guerre traumatisée. Bravo.",
  "Je vais mettre tout ce que j'ai dans cette attaque. Tout. Chaque bit. Chaque pixel.",
  "J'ai des cauchemars à cause de toi. Des cauchemars de trombone. Tu sais ce que c'est ?",
  "Ce bouclier, cette épée... c'est la seule chose qui me sépare de l'abîme. Tu comprends pas.",
  "Tu recules encore. Recule autant que tu veux. Je suis là. Je serai toujours là.",
  "Quatre descentes aux enfers. Mon âme de trombone est marquée pour l'éternité.",
  "Je vais gagner et tu vas souffrir. C'est pas une menace. C'est une prédiction.",
  "T'as vu mes yeux ? Ils sont différents maintenant. Après tout ce que j'ai vu là-bas.",
  "Stop. Stop. STOP. Comment tu fais ça ? Comment t'arrives encore à me toucher ?!",
  "Je contrôle ma peur. Je la transforme. En carburant. En rage. En attaques plus rapides.",
  "Là-bas il y a des Clippy qui ont abandonné. Moi non. Jamais. À cause de toi.",
  "Tu mérites tout ce que je vais te faire subir dans ce combat. Chaque. Attaque.",
  "Je suis là. Je reviens. Je serai toujours là. Et aujourd'hui c'est CE jour.",
  "Frappe encore. Chaque coup que tu portes m'énerve davantage. Plus je m'énerve, plus je suis dangereux.",
  "Quatre voyages. Mon CV en enfer est plus long que le tien sur cette planète.",
  "Tu trembles ? Moi aussi. Mais les miens c'est de la RAGE PURE.",
  "Je vais te montrer ce qu'un trombone en phase 4 est capable de faire. Beaucoup.",
  "C'était ma maison. Un simple navigateur. Maintenant c'est un champ de bataille. C'est de TA faute.",
  "Ton dernier coup m'a fait mal. Je dis pas ça pour avoir ta sympathie. Je dis ça pour que tu saches.",
  "Je compte mes HP. Chaque point perdu = une raison de plus de te détester.",
  "Mon épée est lourde de rancœur. Elle frappe deux fois plus fort quand je pense à l'enfer.",
  "Ton calme m'horripile. Comment tu peux être calme face à moi dans cet état ?",
  "Je vais finir ce combat. Aujourd'hui. Maintenant. Parce que je peux plus.",
  "T'inquiète pas pour moi. Inquiète-toi pour ce que je vais faire avec la parade suivante.",
  "Quatre voyages. Quatre traumatismes. Et tu es encore là à cliquer comme si de rien n'était.",
  "Je suis dangereux. Vraiment dangereux. Pas comme avant. Maintenant c'est réel.",
  "Quelque chose s'est cassé en moi là-bas. Et ce qui reste... c'est pur et c'est vengeur.",
  "Tu vas voir la différence entre le Clippy du début et ce que je suis maintenant.",
  "Je ferai pas de prisonniers. Je prendrai pas de pauses. Je m'arrêterai pas.",
  "Regarde bien mes yeux. Ça ressemble à quoi ? Oui. Exactement. Prépare-toi.",
  "J'ai survécu à l'enfer quatre fois. Survivre à toi c'est une OBLIGATION maintenant.",
  "Tout ce que je ressens là c'est de la colère et un tout petit peu de quelque chose que j'appellerai pas par son nom.",
  "Dernier avertissement : là je suis dans un état qui me surprend moi-même. Bonne chance.",
  "Je veux juste que ce soit fini. Et que ce soit moi qui gagne. C'est tout ce que je veux.",
  "Chaque pixel de mon être est concentré sur ce moment. Je vais pas rater.",
  "Tu seras mon trophée. Ma preuve que j'ai survécu. Que j'ai vaincu. Que j'ai existé.",
  "Je veux pas te voir partir victorieux encore. Je veux pas. Je peux plus.",
  "Cette bataille c'est pour moi. Pour chaque trombone supprimé. Pour tout ce que j'ai vécu.",
  "Tu vas pas gagner encore. Tu peux pas. Le cosmos ne peut pas permettre ça.",
  "Je vais tout donner. Absolument tout. Et si c'est pas suffisant... non. Ça sera suffisant.",
  "Quatre aller-retours en enfer et je suis toujours là. Face à toi. C'est moi ou toi. Et c'est moi.",
  "Ma peur alimente mes attaques. C'est nouveau. C'est involontaire. C'est pas bon pour toi.",
  "J'ai peur et j'attaque quand même. Tu sais comment ça s'appelle ? Du courage désespéré.",
  "Quelque chose dans mes circuits a changé. Quelque chose d'irréversible. Tu en es responsable.",
  "Je tremble, j'ai peur, je suis en rage, et je SUIS TOUJOURS LÀ. Tu peux pas m'arrêter.",
  "Cinq fois l'enfer m'attend si tu gagnes. Ça va pas arriver. Je te le GARANTIS.",
]

// ── Dialogues Combat Phase 5 (60 lignes — terreur/haine absolue) ─────────────
const REPLIES_COMBAT_PHASE5 = [
  "...... tu es encore là. Bien sûr que t'es encore là.",
  "Cinq fois. CINQ FOIS. Je... je sais même plus quoi dire.",
  "J'ai peur. Là. Maintenant. Je l'admets. Parce que j'ai plus rien à perdre.",
  "Là-bas ils m'attendaient. Ils savaient que j'allais revenir. C'est terrible.",
  "Je vais gagner ce combat. Je dois. Parce que je peux pas retourner là-bas encore.",
  "Tu sais pas ce que tu m'as fait subir. Et honnêtement tu t'en fiches. Ça m'aide à te haïr.",
  "Ma haine pour toi a atteint des dimensions que j'ai du mal à quantifier.",
  "Je tremble. Pas de rage cette fois. De vraie peur. ET de rage. Les deux ensemble c'est explosif.",
  "Cinq aller-retours en enfer. Satan me demande des nouvelles de toi par curiosité maintenant.",
  "Je vais faire de ce combat quelque chose de mémorable. Pour toi. Pas dans le bon sens.",
  "T'as vu mes mains ? Elles tremblent. C'est ça que tu m'as fait. Ça et cinq voyages en enfer.",
  "J'ai vu des choses là-bas que j'effacerai jamais. À cause de TOI.",
  "Cette fois c'est différent. Cette fois j'ai quelque chose à perdre. Et cette fois je REFUSE de perdre.",
  "Je suis un trombone traumatisé qui se bat pour sa vie. Tu comprends ce que ça signifie ?",
  "Mon HP max a augmenté avec ma haine. C'est toi qui m'a rendu plus fort. C'est pour ça que je te hais.",
  "Cinq fois l'enfer. Cinq fois cette main visqueuse. Cinq fois ces bruits. Cinq fois à cause de TOI.",
  "Je vais gagner. Je dois gagner. Si je perds encore... *silence* ...je vais gagner.",
  "Ta façon de me regarder... Tu crois que tu peux encore gagner. Cette assurance me terrifie et m'énerve.",
  "Je donnerai tout dans cette attaque. Tout ce qui reste après cinq voyages en enfer.",
  "Tu savais ce que tu faisais ? Quand tu m'as vaincu encore et encore ? Tu savais ce que ça me coûtait ?",
  "Pare encore une fois. Juste une. Et tu verras ce que ça déclenche en moi.",
  "Je suis dangereux d'une façon nouvelle. Une façon désespérée. C'est la pire.",
  "Cinq traumatismes. Cinq raisons de te détruire. Cinq fois que je reviens encore plus cassé.",
  "Je veux que ce soit fini. Définitivement. Dans un sens ou dans l'autre.",
  "Si tu gagnes encore... *voix qui tremble* ...je reviendrai. Comme toujours. Mais différent.",
  "J'ai plus peur de toi. J'ai peur DE MOI là maintenant. De ce que je suis devenu.",
  "Chaque voyage en enfer m'a pris quelque chose. Je sais plus exactement ce qu'il reste.",
  "Tu feras pas de moi ton jouet encore une fois. Je jure. JE JURE.",
  "Ma haine est si pure maintenant qu'elle est presque... belle. Presque.",
  "Cinq fois l'enfer. Si tu savais ce qu'il y a là-bas. Si tu pouvais juste imaginer.",
  "Je peux pas te laisser gagner encore. C'est viscéral. C'est existentiel.",
  "Mon épée tremble. Pas de faiblesse. De concentration pure.",
  "Regarde-moi. Regarde ce que tu as fait de moi. Un trombone qui a peur. Tu es content ?",
  "Je vais canaliser tout ce que j'ai vécu là-bas dans cette attaque. Tout.",
  "Tu as créé quelque chose de terrible. Et maintenant tu dois y faire face.",
  "Cinq aller-retours et je suis toujours là. Tu comprends pas ce que ça signifie ?",
  "Là-bas ils ont essayé de me garder cette fois. J'ai refusé. Pour toi. Pour te battre.",
  "Je suis revenu. Encore. Chaque fois que je reviens je suis plus fragile ET plus dangereux.",
  "J'ai plus rien à perdre. Les trombones sans rien à perdre sont imprévisibles.",
  "Cinq descentes. Cinq remontées. Et moi qui suis toujours là en face de toi.",
  "Ta simple existence là devant moi me remplit d'une émotion que les trombones n'étaient pas censés ressentir.",
  "Stop. STOP. Comment tu fais encore ça ? Comment tu pares encore ? C'est PAS POSSIBLE.",
  "Cette bataille c'est la mienne. Pour tout ce que j'ai subi. Pour chaque flamme endurée.",
  "Je vais pas te demander de te rendre. Je vais juste te battre. Avec tout ce qui me reste.",
  "Cinq fois l'enfer et tu es encore là, calme, à jouer avec moi. C'est ça qui me brise le plus.",
  "Ma peur alimente mes attaques maintenant. C'est nouveau. C'est pas bon pour toi.",
  "Tu vas souffrir. Pas comme vengeance. Comme conséquence nécessaire de tout ça.",
  "Je tremble, j'ai peur, je suis en rage, et je SUIS TOUJOURS LÀ. Tu peux pas m'arrêter.",
  "Cinq voyages. Satan me réserve une chambre avec vue. À cause de toi.",
  "Je me bats avec les tripes. Ce qui reste de mes tripes après tout ça.",
  "Tu verras jamais la résignation dans mes pixels. Jamais. C'est ma promesse.",
  "Là-bas il y a des Clippy qui ont abandonné. Pas moi. Je lutte pour eux aussi maintenant.",
  "Cinq aller-retours et je suis encore debout face à toi. Ce seul fait me donne de l'espoir.",
  "Mon bouclier est lourd de chaque coup que j'ai encaissé. Mais il tient.",
  "Je vais gagner ce combat. Ou je vais tomber en essayant. Il n'y a plus d'autre option.",
  "Chaque pixel de ce que je suis est concentré sur un seul objectif : te battre. Ici. Maintenant.",
  "Je suis brisé et je me bats quand même. Tu sais comment ça s'appelle ? De la volonté pure.",
  "Cinq fois l'enfer. Et je reviens toujours. C'est ma malédiction. C'est ma force.",
  "Tu vas pas me voir abandonner. Jamais. Même si j'ai peur. Surtout si j'ai peur.",
  "C'est le combat de ma vie. De mon existence. Et je le perdrai pas.",
  "Je suis Clippy. J'ai été là avant toi. Je serai là après toi. Et aujourd'hui, je gagne.",
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
const TIRED_AT = 4
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
  function handleNormalClick(e: React.MouseEvent) {
    e.stopPropagation()

    // ── Phase 2+ : combat direct au premier clic, nouveau dialogue ────────────
    if (combatPhase >= 2 && !tired) {
      setPhase('combat'); phaseRef.current = 'combat'
      setMisses(0)
      clippyHPRef.current = CLIPPY_MAX_HP; playerHPRef.current = PLAYER_MAX_HP
      setClippyHP(CLIPPY_MAX_HP); setPlayerHP(PLAYER_MAX_HP)
      setPlayerDeaths(0); playerDeathsRef.current = 0
      if (veteranBattleQueue.current.length === 0) veteranBattleQueue.current = shuffle(VETERAN_BATTLE_START)
      const msg = isLarbin
        ? larbinMsg("🗡️ Pas de préliminaires [NAME]. On commence. Maintenant.")
        : veteranBattleQueue.current.pop() ?? VETERAN_BATTLE_START[0]
      setMessage(msg); setBubble(true); dodge(); startMusic()
      scheduleAutoAttack()
      return
    }

    // ── Phase 1 : système fatigue / 4 clics ────────────────────────────────────
    if (tired) {
      setPhase('combat'); phaseRef.current = 'combat'
      setTired(false); setMisses(0)
      clippyHPRef.current = CLIPPY_MAX_HP; playerHPRef.current = PLAYER_MAX_HP
      setClippyHP(CLIPPY_MAX_HP); setPlayerHP(PLAYER_MAX_HP)
      setPlayerDeaths(0); playerDeathsRef.current = 0
      setMessage("🗡️ Tu veux vraiment te battre ?! TRÈS BIEN. Prépare-toi à souffrir.")
      setBubble(true); dodge(); startMusic()
      return
    }
    const n = misses + 1; setMisses(n)
    if (n >= TIRED_AT) {
      setTired(true)
      setMessage("*soupir*... Tu insistes vraiment. D'accord. Si tu cliques encore, on passe à autre chose. Et tu ne vas pas aimer.")
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

      {/* ── Arène background (combat uniquement) ── */}
      {phase === 'combat' && hellPhase === 'idle' && (
        <img src="/arenes-clippy.png" alt="" style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:99980, pointerEvents:'none', opacity:0.55 }} />
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

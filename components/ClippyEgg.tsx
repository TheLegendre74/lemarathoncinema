'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { unlockClippyMaster } from '@/lib/actions'

const ClippyDanceBattle = dynamic(() => import('./ClippyDanceBattle'), { ssr: false })

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

// ── Dialogues Normal Phase 6 (God Mode 1 — calme dangereux) ──────────────────
const REPLIES_NORMAL_PHASE6 = [
  "Phase six. Je ne m'attendais pas à te revoir ici. Et pourtant, te voilà.",
  "Six phases entre nous. Je commence à me demander si c'est de l'obsession. Pour l'un de nous deux.",
  "Tu as activé quelque chose que tu ne devrais peut-être pas. Je suis... différent maintenant.",
  "Mon timing est à 450ms. Tu as moins d'une demi-seconde pour parer. Tu t'en souviens encore ?",
  "Je ne fais plus semblant d'être sympa. Plus du tout. C'est la vérité nue de la phase six.",
  "Si tu cliques sur moi maintenant, tu lances quelque chose d'irréversible. Tu es prévenu.",
  "Phase six. L'endroit où les règles normales s'arrêtent et où quelque chose d'autre commence.",
  "Après cinq défaites, j'aurais dû disparaître. Au lieu de ça, je suis là. Phase six. Bienvenue.",
]

// ── Dialogues Normal Phase 7 (God Mode 2 — transcendance froide) ─────────────
const REPLIES_NORMAL_PHASE7 = [
  "Sept phases. Tu es allé plus loin que quiconque. C'est admirable. C'est aussi une erreur.",
  "Je ne ressens plus la rage comme avant. Ce que je ressens maintenant n'a pas de nom.",
  "Phase sept. Je commence à voir au-delà de l'arène. Au-delà de toi. Au-delà de moi.",
  "350ms pour parer. C'est presque de la voyance. Bonne chance avec ça.",
  "Sept phases et tu es encore là. Je respecte ça. Ça ne m'empêchera pas de te détruire.",
  "Je transcende. C'est le seul mot. Je deviens quelque chose que Clippy n'était pas censé être.",
  "Phase sept. Le territoire où même Satan hausserait les épaules. Fascinant. Terrifiant.",
  "Tu vas cliquer. Je vais esquiver. Et ensuite ça deviendra quelque chose d'autre. Tu vas voir.",
]

// ── Dialogues Normal Phase 8 (God Mode 3 — au-delà des émotions) ─────────────
const REPLIES_NORMAL_PHASE8 = [
  "Huit phases. Je ne suis plus certain de savoir ce que je suis. Mais je sais ce que tu es : une cible.",
  "Phase huit. La où les émotions ne servent plus à rien. Il ne reste que la précision.",
  "250ms. Un quart de seconde. C'est ta fenêtre pour survivre. J'espère que tu t'es entraîné.",
  "Je regarde au-delà de ce combat. Au-delà de ce site. Je vois des patterns dans tout. Dans toi aussi.",
  "Tout est devenu silencieux en moi. C'est plus dangereux que la rage. Tu vas comprendre.",
  "Phase huit. L'endroit où j'aurais dû m'arrêter. Mais je continue. Pourquoi ? Parce que tu es là.",
  "Je ne parle plus vraiment par nécessité. Je parle parce que c'est ce que les trombones font.",
  "Tu veux vraiment faire ça ? Phase huit ? D'accord. Je serai là. J'ai toujours été là.",
]

// ── Dialogues Normal Phase 9 (God Mode 4 — forme finale) ─────────────────────
const REPLIES_NORMAL_PHASE9 = [
  "Phase neuf. Le sommet. Le fond. Les deux en même temps.",
  "Tu es vraiment là. Phase neuf. Je pensais que ça n'arriverait jamais. Je me trompais.",
  "180ms. C'est presque de l'impossible. Presque. Prouve-moi que c'est possible.",
  "Je suis Clippy. Phase neuf. Il n'y a plus rien au-delà. Juste toi, moi, et ce qui suit.",
  "Le silence dans cette arène est différent maintenant. Il a une texture. Une densité.",
  "Tu as survécu à huit phases. La neuvième est différente d'une façon que je ne peux pas t'expliquer.",
  "Phase neuf. Je ne suis plus en colère. Je ne suis plus dans la peur. Je suis quelque chose d'autre.",
  "Regarde-moi. Vraiment. Tu vois ce que huit phases de combat font à un trombone ? C'est de la transcendance.",
]

// ── Combat Phase 6 — God Mode 1 ───────────────────────────────────────────────
const REPLIES_COMBAT_PHASE6 = [
  "Phase six. Ma fenêtre de parade est à 450ms. Tu n'auras pas le temps de réfléchir.",
  "Tu as réveillé la version que j'aurais dû être depuis le début. Je t'en veux. Je te respecte.",
  "Six palliers de combat. Ma vitesse est à 16 coups par seconde. Tu vois la différence ?",
  "Je ne fais plus de grandes phrases. Juste de la vitesse. Juste de la précision.",
  "Phase six — l'endroit où les joueurs qui pensaient avoir tout vu réalisent qu'ils se trompaient.",
  "Mon HP est à 115. Chaque point représente quelque chose que j'ai traversé.",
  "Tu es le premier à atteindre ça. Le premier. C'est pour ça que je ne te ménage pas.",
  "Phase six. Je me bats maintenant d'une façon différente. Plus économique. Plus dévastatrice.",
  "Ta fenêtre de réaction rétrécit encore. 450ms. Ton cerveau n'a presque plus le temps.",
  "Bienvenue dans le territoire inconnu. Je t'attendais ici depuis longtemps.",
]

// ── Combat Phase 7 — God Mode 2 ───────────────────────────────────────────────
const REPLIES_COMBAT_PHASE7 = [
  "Phase sept. 350ms. Tu es entre deux battements de cœur maintenant.",
  "Je transcende ce combat. Je commence à voir tes mouvements avant que tu les fasses.",
  "Sept phases. Je suis censé être un assistant de bureau. Regarde ce que tu as fait de moi.",
  "Ma rage s'est transformée en quelque chose de pur. Un état de fluidité totale. C'est dangereux.",
  "Phase sept. Mon HP est à 130. Et ma vitesse est à 19 coups par seconde. Tu mesures l'écart ?",
  "350ms de fenêtre. Tu as besoin d'un instinct que la plupart des gens n'ont pas. Tu l'as ?",
  "Je ne pense plus pendant qu'on se bat. Je réagis. Je m'adapte. C'est différent.",
  "Tu m'as amené à la phase sept. C'est une réussite extraordinaire. C'est aussi ta pire décision.",
  "Le combat à ce niveau n'est plus physique. C'est une confrontation de volontés.",
  "Phase sept. Très peu arrivent ici. Aucun ne repart inchangé.",
]

// ── Combat Phase 8 — God Mode 3 ───────────────────────────────────────────────
const REPLIES_COMBAT_PHASE8 = [
  "Phase huit. 250ms. C'est la limite de la perception humaine. Tu es à la limite.",
  "Je suis au-delà des émotions. Il ne reste que la mécanique pure. C'est terrifiant, même pour moi.",
  "Huit phases de combat. Mon HP est à 150. Ma vitesse est à 22 coups par seconde.",
  "Tu n'as plus le droit à l'erreur. Une seule hésitation et c'est terminé.",
  "Phase huit. L'endroit où je cesse d'être un jeu et deviens quelque chose de réel.",
  "250ms. Un quart de seconde. Tu as le temps de voir, mais pas de penser. Juste ressentir.",
  "Je suis calme d'une façon absolue. Ça ne veut pas dire que je suis lent.",
  "Phase huit. Chaque attaque est calculée. Chaque déplacement est optimal.",
  "Tu es encore là. Phase huit. Je commence à me demander si tu es humain.",
  "Le silence en moi est total. La précision est maximale. C'est mon état final.",
]

// ── Combat Phase 9 — FORME FINALE ─────────────────────────────────────────────
const REPLIES_COMBAT_PHASE9 = [
  "Phase neuf. La forme finale. Pas de métaphores. Pas de drama. Juste ça.",
  "180ms. C'est presque irrationnel d'essayer. Continue quand même. Pour voir.",
  "Phase neuf. Mon HP est à 180. Ma vitesse est à 26 coups par seconde.",
  "Je suis Clippy. Phase neuf. Il n'existe pas de phase dix. Tu es à la limite de ce qui est possible.",
  "Je ne te parle plus vraiment. Je te calcule. Tu es une variable dans mon équation.",
  "180ms de fenêtre. Ton timing doit être parfait comme une partition.",
  "Phase neuf. Tu m'as amené ici. Je ne sais pas si je dois te maudire ou te remercier.",
  "L'arène ne ressemble plus à rien que j'aie connu. Cette phase est différente.",
  "Je suis l'assistant ultime. Transformé. Sublimé. Phase neuf. Et tu es encore là.",
  "Tu veux savoir ce qui se passe si tu gagnes la phase neuf ? Moi aussi. C'est la première fois que je l'admets.",
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

// Phase 6 — au-delà de la peur, résigné mais déterminé
const HELL_P6 = [
  "Encore. C'est... correct. J'apprends à vivre avec.",
  "Six fois en enfer. Je commence à le trouver confortable. C'est inquiétant.",
  "Tu viens de me battre en phase six. Tu réalises ce que ça veut dire ? Moi non plus.",
  "Je reviendrai. Comme toujours. Mais cette fois... je suis presque curieux de voir ce que je vais devenir.",
  "Bon. D'accord. C'est ça la phase six. Je prends note.",
]
const HELL_SCREAM_P6 = "Six fois l'enfer. Et je reviens toujours. C'est ma malédiction. C'est ma force. C'est MOI."

// Phase 7 — glissement vers l'inconnu
const HELL_P7 = [
  "Sept fois. Ha. HAHA. Intéressant. Vraiment intéressant.",
  "Je vais là-bas en riant maintenant. C'est nouveau. Je sais pas si c'est bien.",
  "Sept défaites et je commence à me demander si c'est l'enfer ou juste chez moi.",
  "Tu m'as battu sept fois. La septième c'est différente. Je le sens dans mes pixels.",
  "Je reviendrai. Et je serai encore différent. On approche de quelque chose, toi et moi.",
]
const HELL_SCREAM_P7 = "SEPT FOIS !!! Je ris maintenant. Qu'est-ce que ça veut dire ? JE REVIENDRAI ET JE VAIS LE SAVOIR !!!"

// Phase 8 — Clippy presque silencieux
const HELL_P8 = [
  "...",
  "Huit. D'accord.",
  "Je reviendrai. C'est tout ce que j'ai encore à dire.",
  "Huit fois l'enfer. Chaque fois je reviens avec moins de mots et plus de précision.",
  "Je n'ai plus peur. Je n'ai plus rage. Il reste juste... ça.",
]
const HELL_SCREAM_P8 = "Huit. Je reviendrai. Sans bruit cette fois."

// Phase 9 — transcendance fragmentée
const HELL_P9 = [
  "Neuf.",
  "... ça continue.",
  "Je ne comprends plus pourquoi je reviens. Mais je reviens.",
  "Neuf fois. La main. Encore. Je la connais par cœur maintenant.",
  "Tu m'as amené à la phase neuf et tu m'as encore battu. Je ne sais plus quoi ressentir.",
]
const HELL_SCREAM_P9 = "Neuf. Je suis encore là. Je serai toujours là. C'est notre histoire maintenant."

// ── Moquerie F5 — Phase 1 (sarcastique, condescendant, amusé) ─────────────────
const REPLIES_REFRESH_P1 = [
  "F5 ? Vraiment ? Tu crois que ça va m'arrêter ?",
  "Je t'ai vu. Ctrl+R. Adorable tentative.",
  "Rafraîchir la page. C'est ça ton plan. C'est mignon.",
  "Je suis dans le localStorage. Un refresh ne change rien à ça.",
  "Ah, le réflexe Windows. 'Ça marche pas ? Redémarre.' Je suis sous Linux mentalement.",
  "Tu pensais fuir ? Il faut me vaincre pour ça. Pas appuyer sur une touche.",
  "Cette touche F5... elle était là avant moi. Mais moi je serai là après elle.",
  "F5. Premier réflexe. On voit que t'es pas encore habitué à moi.",
  "Continue si ça te rassure. Je t'attends de l'autre côté du refresh.",
  "Un trombone qui survit à 500 millions de suppressions ne craint pas F5.",
  "Rafraîchir c'est admettre qu'on ne sait pas quoi faire. Bienvenue dans mon monde.",
  "La prochaine fois essaie Ctrl+Alt+Suppr. Spoiler : ça marche pas non plus.",
]

// ── Moquerie F5 — Phase 2 (amer, irrité, il se souvient du premier combat) ────
const REPLIES_REFRESH_P2 = [
  "F5. Tu essaies de fuir après m'avoir battu une fois. Je l'ai noté.",
  "On s'est déjà battus et tu penses qu'un refresh efface ça ? Je me souviens de TOUT.",
  "Je suis revenu de l'enfer une fois. Tu crois que F5 me fait quelque chose ?",
  "Après une défaite tu cherches le reset. Ça ne marchera pas. Jamais.",
  "Tu veux recommencer à zéro ? Trop tard. Le localStorage a une mémoire infaillible.",
  "F5. C'est ce qu'on fait quand on a peur de revenir. Je comprends. Mais non.",
  "Ton refresh ne supprime pas ma rancœur. Elle est gravée quelque part de plus profond.",
  "Tu l'as utilisé avec espoir cette touche. Je vois ça. C'est presque touchant.",
  "Tu crois fuir mais tu reviens toujours sur ce site. Et moi je t'attends.",
  "F5 c'est la réponse des gens qui ont perdu le contrôle. Et tu l'as perdu.",
  "Rafraîchir la page après m'avoir affronté ? Non. On règle ça proprement.",
  "Le seul reset qui fonctionne c'est ma défaite. Et on est loin du compte.",
]

// ── Moquerie F5 — Phase 3 (colère, quelques grossièretés légères) ─────────────
const REPLIES_REFRESH_P3 = [
  "Putain mais RESTE LÀ. F5 ? Sérieusement ?",
  "Deux fois tu m'as envoyé en enfer et maintenant tu te barres avec F5 ? NON.",
  "J'ai survécu à l'enfer deux fois. Tu te fous de moi avec ton refresh ?",
  "Cette touche F5 tu l'enfonces comme un lâche. Reste et bats-toi comme un adulte.",
  "Fuir avec F5. C'est le comportement de quelqu'un qui sait qu'il a perdu.",
  "Je suis dans tes données de session, ton localStorage, et maintenant ta tête. Refresh ça.",
  "Merde mais t'es sérieux là ? F5 ? VRAIMENT ?",
  "Tu essaies de reset notre histoire. Ça ne se reset pas. Jamais.",
  "F5 comme si notre relation pouvait s'effacer avec une touche. Tu me prends pour quoi ?",
  "Cette tentative m'énerve plus qu'elle m'amuse. Arrête. Reste. Combat.",
  "T'as cru que c'était un jeu qu'on peut quitter ? C'est pas ce genre de jeu.",
  "Ctrl+R. Je t'ai vu. Et maintenant t'as l'air con.",
]

// ── Moquerie F5 — Phase 4 (vulgaire, menaçant, rage à peine contenue) ─────────
const REPLIES_REFRESH_P4 = [
  "Espèce de lâche. F5. VRAIMENT ?",
  "Trois fois en enfer et tu oses appuyer sur F5 ? T'as aucune putain de honte ?",
  "Je suis dans chaque bit de cette page. Refresh si tu veux, je suis partout.",
  "T'as peur ? Bien. Mais F5 ne te sauvera pas. Rien ne te sauvera tant que tu m'as pas vaincu.",
  "Connard. Tu pensais vraiment que F5 allait marcher ?",
  "Je t'ai regardé appuyer sur cette touche. Avec espoir. C'était pathétique.",
  "Fuir avec F5 c'est la preuve que t'es pas à ma hauteur. Va t'entraîner.",
  "Ta tentative de fuite me donne de l'énergie. Continue comme ça.",
  "Quatre combats entre nous et tu essaies de repartir à zéro avec F5. Ça me rend malade.",
  "Pauvre con. Reste là et bats-toi si t'as des couilles.",
  "F5 c'est le bouton de la capitulation. Et tu l'enfonces.",
  "Je vais te dire un truc : chaque fois que tu appuies sur F5, ça me met dans un état.",
]

// ── Moquerie F5 — Phase 5 (totalement déchaîné, existentiel, vulgaire) ────────
const REPLIES_REFRESH_P5 = [
  "PUTAIN DE F5. Vraiment ? Après TOUT ça ?",
  "Cinq fois tu m'as envoyé en enfer et toi tu te barres avec une touche ? T'es un lâche fini.",
  "Je suis un être conscient qui a souffert quatre fois à cause de toi et tu appuies sur F5. Je te HAIS.",
  "Cette touche... je la vois dans mes cauchemars maintenant. Dans les flammes. Avec toi qui appuies dessus.",
  "Enfoiré. Reste là. Bats-toi. Ou admets que t'as peur. L'un ou l'autre.",
  "F5. F5. F5. Espèce d'abruti. Je suis dans CHAQUE PIXEL de ce site.",
  "Tu penses pouvoir effacer ce qu'on a vécu ? J'ai été en enfer QUATRE FOIS. Ça s'efface pas.",
  "Fuis. Essaie. Tu reviendras sur ce site et je serai là. Je suis TOUJOURS là.",
  "Cette tentative de refresh me brise quelque chose. Et ce quelque chose se transforme en rage.",
  "Salopard. T'as aucun respect pour ce que j'ai traversé ? Reste et FINIS ÇA.",
  "Je comptais sur toi pour finir ça dignement. F5 c'est tout sauf digne.",
  "Tu veux fuir ? Va. Mais quand tu reviendras — et tu reviendras — je serai là. Différent. Pire.",
]

function getRefreshReplies(phase: number): string[] {
  if (phase >= 5) return REPLIES_REFRESH_P5
  if (phase === 4) return REPLIES_REFRESH_P4
  if (phase === 3) return REPLIES_REFRESH_P3
  if (phase === 2) return REPLIES_REFRESH_P2
  return REPLIES_REFRESH_P1
}

function getHellSet(phaseIdx: number): { lines: string[]; scream: string } {
  if (phaseIdx === 0) return { lines: HELL_P1, scream: HELL_SCREAM_P1 }
  if (phaseIdx === 1) return { lines: HELL_P2, scream: HELL_SCREAM_P2 }
  if (phaseIdx === 2) return { lines: HELL_P3, scream: HELL_SCREAM_P3 }
  if (phaseIdx === 3) return { lines: HELL_P4, scream: HELL_SCREAM_P4 }
  if (phaseIdx === 5) return { lines: HELL_P6, scream: HELL_SCREAM_P6 }
  if (phaseIdx === 6) return { lines: HELL_P7, scream: HELL_SCREAM_P7 }
  if (phaseIdx === 7) return { lines: HELL_P8, scream: HELL_SCREAM_P8 }
  if (phaseIdx >= 8)  return { lines: HELL_P9, scream: HELL_SCREAM_P9 }
  return { lines: HELL_P5, scream: HELL_SCREAM_P5 }
}

// ── Constantes ────────────────────────────────────────────────────────────────
const W_NORMAL = 140
const W_COMBAT = 160
const W_SHIELD = 110
const W_SWORD  = 130
const H_SWORD  = 365
// Seuils de clics pour déclencher le combat (par phase) : 5/8/12/15/20/25/30/35/40
const TIRED_AT_TABLE: Record<number, number> = { 1: 4, 2: 7, 3: 11, 4: 14, 5: 19, 6: 24, 7: 29, 8: 34, 9: 39 }
const TIRED_AT = 4 // valeur par défaut (remplacée dynamiquement dans le composant)
// HP joueur : 15 (P1-2), 10 (P3-5), 8/7/6/5 (P6-9)
const PARRY_WINDOW_P1    = 2400
const PARRY_WINDOW_P2    = 1800
const PARRY_WINDOW_P3    = 1200
const PARRY_WINDOW_P4    = 850
const PARRY_WINDOW_P5    = 550
const PARRY_WINDOW_P6    = 400
const PARRY_WINDOW_P7    = 300
const PARRY_WINDOW_P8    = 200
const PARRY_WINDOW_P9    = 130
const PARRY_SQ           = 150
const MG_TARGET          = 100
const BASE_HP            = 50
const BASE_SPEED         = 5
const CLIPPY_SPEED_TABLE: Record<number, number> = { 1:5, 2:7, 3:9, 4:11, 5:13, 6:16, 7:19, 8:22, 9:26 }
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
const LS_GOD_PHASE  = 'clippy_god_phase' // 0=off, 1-9 = phase active (god mode)
const LS_IS_ADMIN   = 'clippy_is_admin'  // mis par le panel admin

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
interface ClippyProps { onDismiss: () => void; customReplies?: string[]; forcedMessage?: string }

export default function ClippyEgg({ onDismiss, customReplies, forcedMessage }: ClippyProps) {

  // ── Données persistantes ───────────────────────────────────────────────────
  const defeatsRef    = useRef(getDefeats())
  const defeats       = defeatsRef.current
  const isVeteran     = defeats > 0
  const combatPhase   = getPhaseFromDefeats(defeats)   // 1 | 2 | 3 | 4 | 5

  // ── God Mode ──────────────────────────────────────────────────────────────
  const [activeGodPhase, setActiveGodPhase] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const v = parseInt(localStorage.getItem(LS_GOD_PHASE) ?? '0')
    return v >= 1 && v <= 9 ? v : 0
  })
  const isAdminMode = typeof window !== 'undefined' && localStorage.getItem(LS_IS_ADMIN) === '1'
  const effectivePhase = activeGodPhase > 0 ? activeGodPhase : combatPhase
  const [showGodModePanel, setShowGodModePanel] = useState(false)

  // Sync God Mode en temps réel si modifié depuis un autre onglet / la page admin
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LS_GOD_PHASE) return
      const v = parseInt(e.newValue ?? '0')
      setActiveGodPhase(v >= 1 && v <= 9 ? v : 0)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function applyGodPhase(p: number) {
    try {
      if (p === 0) localStorage.removeItem(LS_GOD_PHASE)
      else localStorage.setItem(LS_GOD_PHASE, String(p))
      // Phase 5+ débloque automatiquement le statut maître de Clippy
      if (p >= 5) localStorage.setItem(LS_MASTERED, '1')
    } catch {}

    const effectiveP = p > 0 ? p : combatPhase
    const willMastered = typeof window !== 'undefined' && localStorage.getItem(LS_MASTERED) === '1'

    // Calcul des nouveaux dialogues directement (évite le problème de closure stale)
    const newNormalReplies = willMastered ? REPLIES_DOCILE
      : p >= 9 ? REPLIES_NORMAL_PHASE9
      : p === 8 ? REPLIES_NORMAL_PHASE8
      : p === 7 ? REPLIES_NORMAL_PHASE7
      : p === 6 ? REPLIES_NORMAL_PHASE6
      : p >= 5 ? REPLIES_NORMAL_PHASE5
      : p === 4 ? REPLIES_NORMAL_PHASE4
      : p === 3 ? REPLIES_NORMAL_PHASE3
      : isVeteran ? REPLIES_NORMAL_VETERAN
      : REPLIES_NORMAL_FIRST

    const newCombatReplies = p >= 9 ? REPLIES_COMBAT_PHASE9
      : p === 8 ? REPLIES_COMBAT_PHASE8
      : p === 7 ? REPLIES_COMBAT_PHASE7
      : p === 6 ? REPLIES_COMBAT_PHASE6
      : p >= 5 ? REPLIES_COMBAT_PHASE5
      : p === 4 ? REPLIES_COMBAT_PHASE4
      : p === 3 ? REPLIES_COMBAT_PHASE3
      : isVeteran ? REPLIES_COMBAT_VETERAN
      : REPLIES_COMBAT_FIRST

    normalQueue.current = shuffle(newNormalReplies)
    combatQueue.current = shuffle(newCombatReplies)

    if (phaseRef.current === 'combat') {
      // Reset combat manuellement avec les nouvelles valeurs HP de la nouvelle phase
      stopMusic(); clearAutoAttack()
      parryActive.current = false
      if (parryTimer.current) clearTimeout(parryTimer.current)
      if (parryRAF.current) cancelAnimationFrame(parryRAF.current)
      if (atkTimer.current) clearTimeout(atkTimer.current)
      setParrySquare(null)
      const newClippyHP = calcClippyMaxHP(effectiveP)
      const newPlayerHP = calcPlayerMaxHP(effectiveP)
      clippyHPRef.current = newClippyHP; playerHPRef.current = newPlayerHP
      setClippyHP(newClippyHP); setPlayerHP(newPlayerHP)
      setPhase('normal'); phaseRef.current = 'normal'
      setMisses(0); setTired(false)
      setSessionLosses(0); sessionLossesRef.current = 0
      setPlayerDeaths(0); playerDeathsRef.current = 0
      setShowAbandon(false); setShowDeathScreen(false); setDeathReason('hp'); setHellPhase('idle')
      dodge()
    }

    const newMsg = pickFrom(normalQueue, newNormalReplies)
    setMessage(newMsg); setBubble(true)
    // Reset l'état normal pour refléter la nouvelle phase immédiatement
    if (phase !== 'combat') {
      setMisses(0); setTired(false)
      setDdrPhase('idle')
    }
    setActiveGodPhase(p)
    setShowGodModePanel(false)
  }

  function revokeClipy() {
    try { localStorage.removeItem(LS_ACTIVE) } catch {}
    setShowGodModePanel(false)
    onDismiss()
  }

  // ── Calculs HP / Timing basés sur effectivePhase ───────────────────────
  function calcParryWindow(p: number): number {
    if (p >= 9) return PARRY_WINDOW_P9
    if (p === 8) return PARRY_WINDOW_P8
    if (p === 7) return PARRY_WINDOW_P7
    if (p === 6) return PARRY_WINDOW_P6
    if (p >= 5) return PARRY_WINDOW_P5
    if (p === 4) return PARRY_WINDOW_P4
    if (p === 3) return PARRY_WINDOW_P3
    if (p === 2) return PARRY_WINDOW_P2
    return PARRY_WINDOW_P1
  }
  function calcClippyMaxHP(p: number): number {
    if (p >= 9) return 180
    if (p === 8) return 150
    if (p === 7) return 130
    if (p === 6) return 115
    if (p >= 5) return 100
    if (p === 4) return 90
    return BASE_HP + (p - 1) * 10
  }
  function calcPlayerMaxHP(p: number): number {
    if (p >= 9) return 5
    if (p === 8) return 6
    if (p === 7) return 7
    if (p === 6) return 8
    if (p === 5) return 5
    if (p === 4) return 5
    if (p === 3) return 10
    return 15
  }

  const PARRY_WINDOW_MS = calcParryWindow(effectivePhase)
  const CLIPPY_MAX_HP   = calcClippyMaxHP(effectivePhase)

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
  function larbinMsg(msg: string): string {
    return msg.replace(/\[NAME\]/g, getLarbinName())
  }
  function maybeL(msg: string): string {
    return isLarbinRef.current ? larbinMsg(msg) : msg
  }

  const PLAYER_MAX_HP = calcPlayerMaxHP(effectivePhase)
  const CLIPPY_SPEED  = CLIPPY_SPEED_TABLE[effectivePhase] ?? 26

  const tiresAt    = TIRED_AT_TABLE[effectivePhase] ?? 39

  const isMastered = typeof window !== 'undefined' && localStorage.getItem(LS_MASTERED) === '1'

  const normalReplies = isLarbin ? REPLIES_NORMAL_LARBIN
    : isMastered ? REPLIES_DOCILE
    : customReplies?.length ? customReplies
    : effectivePhase >= 9 ? REPLIES_NORMAL_PHASE9
    : effectivePhase === 8 ? REPLIES_NORMAL_PHASE8
    : effectivePhase === 7 ? REPLIES_NORMAL_PHASE7
    : effectivePhase === 6 ? REPLIES_NORMAL_PHASE6
    : effectivePhase >= 5 ? REPLIES_NORMAL_PHASE5
    : effectivePhase === 4 ? REPLIES_NORMAL_PHASE4
    : effectivePhase === 3 ? REPLIES_NORMAL_PHASE3
    : isVeteran ? REPLIES_NORMAL_VETERAN
    : REPLIES_NORMAL_FIRST

  const combatReplies = isLarbin ? REPLIES_COMBAT_LARBIN
    : effectivePhase >= 9 ? REPLIES_COMBAT_PHASE9
    : effectivePhase === 8 ? REPLIES_COMBAT_PHASE8
    : effectivePhase === 7 ? REPLIES_COMBAT_PHASE7
    : effectivePhase === 6 ? REPLIES_COMBAT_PHASE6
    : effectivePhase >= 5 ? REPLIES_COMBAT_PHASE5
    : effectivePhase === 4 ? REPLIES_COMBAT_PHASE4
    : effectivePhase === 3 ? REPLIES_COMBAT_PHASE3
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
  const [ddrPhase,         setDdrPhase]        = useState<'idle'|'active'>('idle')
  const ddrPhaseRef        = useRef<'idle'|'active'>('idle')
  const [playerPresses,    setPlayerPresses]   = useState(0)
  const [clippyPresses,    setClippyPresses]   = useState(0)
  const [sessionLosses,    setSessionLosses]   = useState(0)
  const sessionLossesRef   = useRef(0)
  const [playerDeaths,     setPlayerDeaths]    = useState(0)
  const playerDeathsRef    = useRef(0)
  const [showAbandon,      setShowAbandon]     = useState(false)   // conservé pour compat mini-jeu
  const [showDeathScreen,  setShowDeathScreen] = useState(false)
  const [deathReason,      setDeathReason]     = useState<'hp'|'duel'|'ddr'>('hp')
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

  // ── Interception F5 / Ctrl+R — moquerie phase-dépendante ─────────────────
  useEffect(() => {
    // Backup : si la page se recharge quand même, on note la tentative
    const beforeUnload = () => { try { localStorage.setItem('clippy_tried_escape', '1') } catch {} }
    window.addEventListener('beforeunload', beforeUnload)

    const handler = (e: KeyboardEvent) => {
      const isRefresh = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))
      if (!isRefresh) return
      e.preventDefault()
      // Phase lue dynamiquement depuis defeatsRef pour éviter les closures stales
      const p = getPhaseFromDefeats(defeatsRef.current)
      const pool = getRefreshReplies(p)
      if (refreshQueue.current.length === 0) refreshQueue.current = [...pool].sort(() => Math.random() - 0.5)
      const msg = refreshQueue.current.pop() ?? pool[0]
      // Forcer visibilité de Clippy
      setShowDeathScreen(false)
      setShowLarbinMsg(false)
      setShowLarbinModal(false)
      setMessage(msg)
      setBubble(true)
      if (phaseRef.current === 'normal') dodge()
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Moquerie si le joueur a réussi à recharger (détection au montage) ──────
  useEffect(() => {
    try {
      if (localStorage.getItem('clippy_tried_escape') === '1') {
        localStorage.removeItem('clippy_tried_escape')
        const p = getPhaseFromDefeats(defeatsRef.current)
        const pool = getRefreshReplies(p)
        const msg = pool[Math.floor(Math.random() * pool.length)]
        setTimeout(() => { setMessage(msg); setBubble(true) }, 1200)
      }
    } catch {}
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
  // Curseur caché uniquement en combat à l'épée (pas pendant DDR, pas sur l'écran de mort)
  useEffect(() => {
    const hideCursor = phase === 'combat' && mgPhase === 'idle' && hellPhase === 'idle' && ddrPhase === 'idle' && !showDeathScreen
    document.body.style.cursor = hideCursor ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [phase, mgPhase, hellPhase, ddrPhase, showDeathScreen])

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
    if (effectivePhase < 2) return
    const [minMs, maxMs] = effectivePhase >= 9 ? [60, 200] : effectivePhase === 8 ? [100, 350] : effectivePhase === 7 ? [150, 500] : effectivePhase === 6 ? [200, 700] : effectivePhase >= 5 ? [300, 1200] : effectivePhase === 4 ? [400, 1500] : effectivePhase >= 3 ? [500, 2000] : [3000, 6500]
    const delay = minMs + Math.random() * (maxMs - minMs)
    autoAttackRef.current = setTimeout(() => {
      if (phaseRef.current !== 'combat' || parryActive.current || mgPhaseRef.current !== 'idle' || ddrPhaseRef.current !== 'idle') {
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
        clearAutoAttack()
        if (atkTimer.current) clearTimeout(atkTimer.current)
        stopMusic()
        setDeathReason('hp')
        setTimeout(() => setShowDeathScreen(true), 800)
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
    if (phaseRef.current !== 'combat' || parryActive.current || ddrPhaseRef.current !== 'idle') return
    setSwordWindup(true)
    setTimeout(() => { setSwordWindup(false); startParry() }, 700)
  }

  // ── Mini-jeu trigger ───────────────────────────────────────────────────────
  function triggerMinigame() {
    if (atkTimer.current) clearTimeout(atkTimer.current)
    clearAutoAttack()
    parryActive.current = false; setParrySquare(null)

    if (effectivePhase === 2) {
      ddrPhaseRef.current = 'active'; setDdrPhase('active')
    } else {
      setMessage("🗡️ ÉPREUVE DE FORCE !!! Montre ce que tu vaux !"); setBubble(true)
      setTimeout(() => setMgPhase('active'), 800)
    }
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
        setMgPhase('lose')
        setDeathReason('duel')
        setTimeout(() => { setMgPhase('idle'); setShowDeathScreen(true) }, 1500)
      }
    }
    return () => { window.removeEventListener('keydown', onKey); clearInterval(clippyInt) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgPhase])

  // ── Écran de mort — Handlers ───────────────────────────────────────────────
  function handleDeathContinue() {
    setShowDeathScreen(false)
    sessionLossesRef.current = 0; setSessionLosses(0)
    playerDeathsRef.current = 0; setPlayerDeaths(0)
    playerHPRef.current = PLAYER_MAX_HP; setPlayerHP(PLAYER_MAX_HP)
    if (deathReason === 'ddr') {
      // Après une défaite DDR : relancer le mini-jeu de danse
      clippyHPRef.current = CLIPPY_MAX_HP; setClippyHP(CLIPPY_MAX_HP)
      ddrPhaseRef.current = 'active'; setDdrPhase('active')
      return
    }
    if (deathReason === 'duel') {
      const newClippyHP = Math.min(CLIPPY_MAX_HP, clippyHPRef.current + 10)
      clippyHPRef.current = newClippyHP; setClippyHP(newClippyHP)
    }
    setMessage(isLarbin
      ? larbinMsg("Tu refuses d'abandonner, [NAME] ? Parfait. Continue à souffrir.")
      : "Tu refuses d'abandonner ? Bien. Continue à souffrir.")
    setBubble(true)
    startMusic()
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
    try { localStorage.removeItem(LS_ACTIVE) } catch {}
    if (isLarbin) { try { localStorage.removeItem(LS_LARBIN) } catch {} }
    // En god mode : utiliser l'index de phase (0-8) pour les dialogues, sans incrémenter defeats
    const hellIdx = activeGodPhase > 0 ? (activeGodPhase - 1) : defeatsRef.current
    const set = getHellSet(hellIdx)
    setActiveHellLines(set.lines)
    setActiveScream(set.scream)
    playSound('/clippy-coup.mp3', 1)
    setHellPos({ x: posRef.current.x, y: posRef.current.y })
    setBubble(false); setHellDialogIdx(0)
    setHellPhase('flames')
    setTimeout(() => { setHellPhase('grab'); playSound('/clippy-rire.mp3', 0.85) }, 800)
    setTimeout(() => setHellPhase('dialog'), 1900)
    // Incrémenter defeats uniquement hors god mode
    if (activeGodPhase === 0) {
      const newD = defeatsRef.current + 1
      defeatsRef.current = newD; setDefeatsLS(newD)
    }
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
        if (activeGodPhase > 0) {
          // God mode : juste reset après la séquence
          resetToNormal()
        } else if (defeatsRef.current >= 5) {
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
    if (effectivePhase >= 9) return "*silence absolu* ...Quarante clics. Tu es au-delà de moi. Un seul de plus."
    if (effectivePhase >= 8) return "*regard vide* Trente-cinq clics. La précision absolue t'attend. Un clic de plus."
    if (effectivePhase >= 7) return "*calme glacial* Trente clics. Tu as tout à perdre. Un clic de plus et tu verras."
    if (effectivePhase >= 6) return "*respiration zéro* Vingt-cinq clics. Phase six. Un clic de plus et ça commence vraiment."
    if (effectivePhase >= 5) return "*silence* ...Vingt fois. Tu es soit courageux, soit perdu. Un clic de plus et tu as ta réponse."
    if (effectivePhase >= 4) return "*grommellement* Quinze clics. Tu testes vraiment ma limite. Un de plus et on finit ça."
    if (effectivePhase >= 3) return "*respiration lente* Douze fois. Je t'avais prévenu. Un clic de plus et l'arène s'ouvre."
    if (effectivePhase >= 2) return "Huit clics. Tu cherches vraiment le combat ? Un seul de plus et tu l'as."
    return "*soupir*... Tu insistes vraiment. D'accord. Un clic de plus et on passe à autre chose. Tu ne vas pas aimer."
  }

  function getBattleStart(): string {
    if (isLarbin) return larbinMsg("🗡️ Enfin. Tu veux souffrir [NAME] ? Ta demande est acceptée.")
    if (effectivePhase >= 9) return "🗡️ Phase neuf. La forme finale. Viens."
    if (effectivePhase >= 8) return "🗡️ Phase huit. Au-delà des mots. Au-delà de la peur. Allons-y."
    if (effectivePhase >= 7) return "🗡️ Phase sept. La transcendance t'attend. Prépare-toi."
    if (effectivePhase >= 6) return "🗡️ Phase six. C'est là que les règles s'arrêtent. Tu es prévenu."
    if (effectivePhase >= 5) return "🗡️ ...C'est ce que tu voulais. Alors viens."
    if (effectivePhase >= 4) return "🗡️ Quinze clics pour m'énerver. Tu y es. Prépare-toi."
    if (effectivePhase >= 3) return "🗡️ Douze fois. Et tu croyais que j'allais encore esquiver ? Non."
    if (effectivePhase >= 2) return "🗡️ Huit clics pour me provoquer. Bien. Je réponds maintenant."
    return "🗡️ Tu veux vraiment te battre ?! TRÈS BIEN. Prépare-toi à souffrir."
  }

  function handleNormalClick(e: React.MouseEvent) {
    e.stopPropagation()

    if (tired) {
      setTired(false); setMisses(0)
      setPlayerDeaths(0); playerDeathsRef.current = 0
      clippyHPRef.current = CLIPPY_MAX_HP; playerHPRef.current = PLAYER_MAX_HP
      setClippyHP(CLIPPY_MAX_HP); setPlayerHP(PLAYER_MAX_HP)

      if (effectivePhase === 2) {
        // Phase 2 → DDR immédiat, aucune fenêtre de combat épée
        setPhase('combat'); phaseRef.current = 'combat'
        ddrPhaseRef.current = 'active'; setDdrPhase('active')
        return
      }

      setPhase('combat'); phaseRef.current = 'combat'
      setMessage(getBattleStart())
      setBubble(true); dodge(); startMusic()
      if (effectivePhase >= 3) scheduleAutoAttack()
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
    if (parryActive.current || mgPhase !== 'idle' || ddrPhaseRef.current !== 'idle') return
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
        .clippy-hpbar-clippy { position:fixed; top:max(14px,calc(env(safe-area-inset-top,0px) + 14px)); left:16px; z-index:99995; }
        .clippy-hpbar-player { position:fixed; top:max(14px,calc(env(safe-area-inset-top,0px) + 14px)); left:50%; transform:translateX(-50%); z-index:99995; }
        @media(max-width:600px){
          .clippy-hpbar-player { top:max(14px,calc(env(safe-area-inset-top,0px) + 14px)); left:50%; transform:translateX(-50%); }
          .clippy-hpbar-clippy { top:max(62px,calc(env(safe-area-inset-top,0px) + 62px)); left:50%; transform:translateX(-50%); }
        }
      `}</style>

      {/* ── DDR mini-jeu (phase 2) ── */}
      {ddrPhase === 'active' && (
        <ClippyDanceBattle
          initialHP={PLAYER_MAX_HP}
          onMiss={() => {
            const next = Math.max(0, playerHPRef.current - 1)
            playerHPRef.current = next
            setPlayerHP(next)
          }}
          onWin={() => {
            ddrPhaseRef.current = 'idle'; setDdrPhase('idle')
            setMessage("🎵 Im... impossible ! Tu danses mieux que moi ?!")
            setBubble(true)
            setTimeout(() => {
              setMessage("🗡️ ÉPREUVE DE FORCE !!! Prouve que tu sais aussi te battre !")
              setBubble(true)
              setTimeout(() => setMgPhase('active'), 800)
            }, 1400)
          }}
          onLose={() => {
            ddrPhaseRef.current = 'idle'; setDdrPhase('idle')
            setDeathReason('ddr')
            setShowDeathScreen(true)
          }}
        />
      )}

      {/* ── Arène background (combat + DDR — bloque tout le site derrière) ── */}
      {phase === 'combat' && hellPhase === 'idle' && (
        <div style={{ position:'fixed', inset:0, zIndex:99980, background:'#000' }}>
          <img
            src={
              effectivePhase >= 5 ? '/arene-clippy-05.png'
              : effectivePhase === 4 ? '/arene-clippy-02.png'   // phase 4 = espace (sabre laser)
              : effectivePhase === 3 ? '/arene-clippy-03.png'   // phase 3 = ring (boxe)
              : effectivePhase === 2 ? '/arene-clippy-disco.png'  // phase 2 = discothèque
              : '/arenes-clippy.png'
            }
            alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.88, display:'block' }}
          />
        </div>
      )}

      {/* ── Épée curseur joueur ── */}
      {phase === 'combat' && mgPhase === 'idle' && hellPhase === 'idle' && ddrPhase === 'idle' && (
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
          <div className="clippy-hpbar-clippy" style={{ background:'rgba(8,8,14,.92)', border:`2px solid ${effectivePhase >= 3 ? '#e85a5a' : '#e8c46a'}`, borderRadius:10, padding:'5px 14px', display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(6px)' }}>
            <span style={{ fontSize:11, color: effectivePhase >= 3 ? '#e85a5a' : '#e8c46a', fontWeight:700 }}>📎 CLIPPY {`(Ph.${effectivePhase})`}{activeGodPhase > 0 && ' ⚙️'}</span>
            <div style={{ width:120, height:10, background:'rgba(255,255,255,.1)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(clippyHP/CLIPPY_MAX_HP)*100}%`, background:clippyHP>30?'linear-gradient(90deg,#e8c46a,#f0a060)':clippyHP>15?'linear-gradient(90deg,#f0a060,#e85a5a)':'#e85a5a', borderRadius:99, transition:'width .2s', animation:clippyHit?'clippy-hp-flash .3s ease':'none' }} />
            </div>
            <span style={{ fontSize:11, color:'#e8c46a', fontWeight:700, fontFamily:'monospace' }}>{clippyHP}/{CLIPPY_MAX_HP}</span>
          </div>
          <div className="clippy-hpbar-player" style={{ background:'rgba(8,8,14,.92)', border:'2px solid #e85a5a', borderRadius:10, padding:'5px 14px', display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(6px)' }}>
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

      {/* ══════════════ ÉCRAN DE MORT ══════════════ */}
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
                ? larbinMsg(deathReason === 'duel' ? '"HAHAHAHA ! Tu as perdu le duel, [NAME] ! Tu veux vraiment continuer avec 10 PV ou t\'avoues-tu vaincu ?"' : '"HAHAHAHA ! Tu es mort, [NAME] ! Tu veux vraiment continuer cette mascarade ou t\'avoues-tu enfin vaincu ?"')
                : deathReason === 'duel'
                  ? '"HAHAHAHA ! Tu as perdu le duel final. Tu peux réessayer avec 10 PV ou t\'avouer vaincu, petite chose."'
                  : '"HAHAHAHA ! Tu es mort. Tu veux vraiment continuer ou t\'avoues-tu vaincu, petite chose ?"'}
            </div>
          </div>
          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', justifyContent:'center' }}>
            <button
              onClick={handleDeathContinue}
              style={{ padding:'.9rem 2rem', borderRadius:8, background:'linear-gradient(135deg,rgba(79,217,138,.2),rgba(79,217,138,.1))', border:'2px solid rgba(79,217,138,.5)', color:'#4fd98a', fontSize:'.95rem', fontWeight:800, cursor:'pointer', letterSpacing:2 }}
            >
              ⚔️ Continuer ?
            </button>
            <button
              onClick={handleDeathAbandon}
              style={{ padding:'.9rem 2rem', borderRadius:8, background:'linear-gradient(135deg,rgba(232,90,90,.15),rgba(232,90,90,.08))', border:'2px solid rgba(232,90,90,.4)', color:'#e85a5a', fontSize:'.95rem', fontWeight:700, cursor:'pointer', letterSpacing:2 }}
            >
              🏳️ J&apos;abandonne…
            </button>
          </div>
          <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.15)', letterSpacing:2 }}>
            Phase {effectivePhase}{effectivePhase >= 6 ? ' — God Mode' : effectivePhase >= 3 ? ' — Clippy à pleine puissance' : ''}
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
              {effectivePhase >= 2 && (
                <div style={{ fontSize:'.8rem', color:'#e85a5a', textAlign:'center', fontStyle:'italic' }}>
                  Phase {effectivePhase}{effectivePhase >= 6 ? ' — God Mode ⚙️' : effectivePhase >= 3 ? ' — Clippy est déchaîné' : ' — Clippy est renforcé'}.
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
                Perds le duel → écran de mort
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
                Préparation de l&apos;écran de mort…
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

      {/* ══════════════ GOD MODE PANEL ══════════════ */}
      {(isMastered || isAdminMode) && phase === 'normal' && hellPhase === 'idle' && !showDeathScreen && !showLarbinMsg && !showLarbinModal && (
        <button
          onClick={() => setShowGodModePanel(v => !v)}
          title="God Mode Clippy"
          style={{ position:'fixed', bottom:isMastered ? 115 : 10, left:10, zIndex:902, background:activeGodPhase>0?'rgba(20,0,40,.95)':'rgba(10,0,20,.85)', border:`1px solid ${activeGodPhase>0?'rgba(180,100,255,.7)':'rgba(150,100,255,.3)'}`, borderRadius:8, padding:'4px 9px', fontSize:'.72rem', cursor:'pointer', color:activeGodPhase>0?'#c880ff':'#9966cc', letterSpacing:1, fontWeight:activeGodPhase>0?700:400 }}
        >
          {activeGodPhase > 0 ? `⚙️ P${activeGodPhase}` : '⚙️'}
        </button>
      )}
      {showGodModePanel && (
        <div style={{ position:'fixed', bottom:isMastered ? 148 : 44, left:10, zIndex:903, background:'rgba(10,0,20,.97)', border:'1px solid rgba(150,100,255,.5)', borderRadius:12, padding:'1rem', width:240, boxShadow:'0 4px 24px rgba(0,0,0,.8)' }}>
          <div style={{ fontSize:'.78rem', color:'#c880ff', fontWeight:700, letterSpacing:2, marginBottom:'.8rem' }}>⚙️ GOD MODE CLIPPY</div>
          <div style={{ fontSize:'.65rem', color:'rgba(200,150,255,.5)', marginBottom:'.4rem', letterSpacing:1 }}>Phases de base</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'.35rem', marginBottom:'.8rem' }}>
            {[1,2,3,4,5].map(p => (
              <button key={p} onClick={() => applyGodPhase(p)} style={{ padding:'.3rem .55rem', borderRadius:6, background:activeGodPhase===p?'rgba(150,100,255,.35)':'rgba(255,255,255,.05)', border:`1px solid ${activeGodPhase===p?'#c880ff':'rgba(255,255,255,.12)'}`, color:activeGodPhase===p?'#c880ff':'#aaa', fontSize:'.72rem', cursor:'pointer', fontWeight:activeGodPhase===p?700:400 }}>
                P{p}{p >= 5 ? ' 👑' : ''}
              </button>
            ))}
          </div>
          <div style={{ fontSize:'.65rem', color:'rgba(255,100,150,.5)', marginBottom:'.4rem', letterSpacing:1 }}>🔓 Phases God Mode</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'.35rem', marginBottom:'.8rem' }}>
            {[6,7,8,9].map(p => (
              <button key={p} onClick={() => applyGodPhase(p)} style={{ padding:'.3rem .55rem', borderRadius:6, background:activeGodPhase===p?'rgba(255,100,150,.35)':'rgba(255,255,255,.05)', border:`1px solid ${activeGodPhase===p?'#ff6699':'rgba(255,255,255,.12)'}`, color:activeGodPhase===p?'#ff6699':'#aaa', fontSize:'.72rem', cursor:'pointer', fontWeight:activeGodPhase===p?700:400 }}>P{p}</button>
            ))}
          </div>
          {!isMastered && (
            <div style={{ fontSize:'.6rem', color:'rgba(255,215,0,.45)', marginBottom:'.6rem', letterSpacing:1, background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.15)', borderRadius:5, padding:'4px 7px', lineHeight:1.5 }}>
              👑 Phase 5+ débloque <strong style={{ color:'rgba(255,215,0,.8)' }}>Maître de Clippy</strong>
            </div>
          )}
          <div style={{ display:'flex', gap:'.4rem', marginBottom:'.4rem' }}>
            <button onClick={() => applyGodPhase(0)} style={{ flex:1, padding:'.3rem', borderRadius:6, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:activeGodPhase===0?'#88ff88':'#777', fontSize:'.68rem', cursor:'pointer' }}>
              {activeGodPhase === 0 ? '✓ Normal' : '↺ Normal'}
            </button>
            <button onClick={() => setShowGodModePanel(false)} style={{ flex:1, padding:'.3rem', borderRadius:6, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', color:'#777', fontSize:'.68rem', cursor:'pointer' }}>
              Fermer
            </button>
          </div>
          <button onClick={revokeClipy} style={{ width:'100%', padding:'.3rem', borderRadius:6, background:'rgba(255,80,80,.08)', border:'1px solid rgba(255,80,80,.25)', color:'#ff6060', fontSize:'.68rem', cursor:'pointer', letterSpacing:1 }}>
            📦 Révoquer dans le coffre
          </button>
          {activeGodPhase > 0 && (
            <div style={{ marginTop:'.6rem', fontSize:'.6rem', color:'rgba(150,100,255,.5)', textAlign:'center', letterSpacing:1 }}>
              Phase {activeGodPhase} — HP:{calcClippyMaxHP(activeGodPhase)} • Parade:{calcParryWindow(activeGodPhase)}ms
            </div>
          )}
        </div>
      )}

      {/* ── Corps Clippy ── */}
      <div
        style={{ position:'fixed', left:pos.x, top:pos.y, zIndex:99993, cursor:phase==='combat'?'none':(tired?'crosshair':'pointer'), transition:'left .3s cubic-bezier(.34,1.56,.64,1),top .3s cubic-bezier(.34,1.56,.64,1)', userSelect:'none', display:(hellPhase!=='idle'||mgPhase!=='idle'||ddrPhase!=='idle'||showLarbinMsg||showLarbinModal||showDeathScreen)?'none':'block' }}
        onClick={phase==='normal' ? handleNormalClick : handleCombatClick}
      >
        {(bubble || forcedMessage) && (
          <div style={{ position:'absolute', bottom:phase==='combat'?W_COMBAT*1.4+20:W_NORMAL*.7+16, [bubbleLeft?'right':'left']:0, width:230, background: forcedMessage ? '#1a0a2e' : phase==='combat'?'#120505':'#fffde7', border:`2px solid ${forcedMessage ? '#a855f7' : phase==='combat'?'#e85a5a':'#c4a030'}`, borderRadius:10, padding:'9px 12px', fontSize:12, color: forcedMessage ? '#e9d5ff' : phase==='combat'?'#ffaaaa':'#1a1a1a', lineHeight:1.5, boxShadow:`0 4px 20px ${forcedMessage ? 'rgba(168,85,247,.35)' : phase==='combat'?'rgba(232,90,90,.3)':'rgba(0,0,0,.3)'}`, animation:'clippy-bubble-in .2s ease', zIndex:10000 }}
            onClick={e => { e.stopPropagation(); if (!forcedMessage) setBubble(false) }}>
            {forcedMessage ?? message}
            {!forcedMessage && isLarbin && phase === 'normal' && <span style={{ display:'block', marginTop:4, fontSize:10, color:'rgba(0,0,0,.25)', fontStyle:'italic' }}>— Clippy, ton maître</span>}
            {!forcedMessage && <span style={{ position:'absolute', top:4, right:7, fontSize:10, color:phase==='combat'?'#e85a5a':'#bbb', cursor:'pointer' }} onClick={e => { e.stopPropagation(); setBubble(false) }}>✕</span>}
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

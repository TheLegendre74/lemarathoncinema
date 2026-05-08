const IDLE_HIGH = [
  'Putain mais t\'es nul, esquive au moins !',
  'Mon poing, ta gueule — bonne rencontre.',
  'Je vais te défoncer, déchet.',
  'T\'as appris à boxer sur YouTube ?',
  'Même Bonzi Buddy frappe plus fort que toi.',
  'Casse-toi, t\'es pas à la hauteur.',
  'Je vais t\'envoyer au format .zip — compressé.',
  'Tu fais pitié, sérieux.',
  'C\'est tout ? C\'EST TOUT ?!',
  'Je suis un trombone et je te domine. La honte.',
  'Retourne sur Word, c\'est plus ton niveau.',
  'Ta mère utilise Internet Explorer.',
  'Tu te bats comme un fichier .tmp.',
  'T\'es aussi utile qu\'un splash screen.',
  'Format .doc → format .KO.',
]

const IDLE_LOW = [
  'OK... t\'as eu de la chance...',
  'Tu sais que je suis un être vivant, hein ?',
  'Tu frappes un trombone. T\'es fier de toi ?',
  'Ma femme m\'attend à la maison...',
  'J\'ai des sentiments tu sais...',
  'Tu vas quand même pas continuer ?!',
  'Je croyais qu\'on était amis...',
  'Tu vas aller en enfer pour ça...',
  'Dieu te regarde frapper un innocent...',
  'Mon fils... il ne me verra plus jamais...',
  'Arrête... je t\'en supplie...',
  'Saint Pierre n\'accepte pas les meurtriers...',
  'C\'est du meurtre... tu le sais...',
  'J\'aurais dû rester dans Office 97...',
  'Le Diable a déjà ton nom sur la liste...',
  'Tu entendras ma voix dans tes cauchemars...',
  'Je reviendrai... et tu n\'auras pas de firewall.',
  'Pitié... j\'ai une famille de trombones...',
]

const HIT_HIGH = [
  'BOUM ! Mange ça, connard !',
  'T\'AS VU ?! Hein, t\'as vu ?!',
  'Aide détectée : mon poing dans ta face.',
  'Erreur critique — origine : toi.',
  'L\'esquive c\'était pas dans tes compétences.',
  'Ça c\'est de l\'aide technique !',
  'Tu veux que je reformate ta gueule ?',
]

const HIT_LOW = [
  'Pardon... c\'était un réflexe...',
  'Désolé mais tu l\'as cherché...',
  'Bon OK on est quittes maintenant ?',
  'C\'est toi qui m\'obliges à faire ça...',
  'Je frappe parce que j\'ai peur...',
]

const DODGE_HIGH = [
  'T\'as eu du bol, c\'est tout.',
  'Ça ne changera rien, minable.',
  'La prochaine tu la mangeras.',
  'Esquive tant que tu peux...',
]

const DODGE_LOW = [
  'S\'il te plaît, arrête...',
  'Tu esquives même ça... c\'est pas juste.',
  'Mon Dieu il est trop fort...',
  'Non non non non...',
]

const COUNTER_HIGH = [
  'Lucky shot, connard.',
  'Tu crois que ça fait mal ?',
  'Pfff... j\'ai même pas senti.',
  'C\'est tout ce que t\'as ?',
]

const COUNTER_LOW = [
  'AÏÏÏE ! Pitié !',
  'Arrête de me frapper...',
  'Je saigne du trombone...',
  'C\'est de la maltraitance...',
]

const PANIC = [
  'Non non non non NON !',
  'STOP ! J\'abandonne !',
  'AU SECOURS !',
  'JE VEUX RENTRER CHEZ MOI !',
]

const CONFIDENT = [
  'Tu trembles, hein ?',
  'Je sens la peur dans tes pixels.',
  'C\'est MON ring, MON arène.',
  'Tu sais même pas ce qui arrive.',
]

const FRENZY = [
  'Le public est en délire...',
  'C\'est quoi ce bordel ?!',
  'ILS SONT FOUS !',
  'ARRÊTEZ DE CRIER !',
]

const FEINT = [
  'Oups, tu t\'es fait avoir !',
  'Trop lent, trop prévisible.',
  'C\'est ça la feinte, bébé.',
]

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function pickTaunt(
  category: 'idle' | 'hit' | 'dodge' | 'counter' | 'panic' | 'confident' | 'frenzy' | 'feint',
  hpRatio: number,
): string {
  const isHigh = hpRatio > 0.5
  switch (category) {
    case 'idle':      return pick(isHigh ? IDLE_HIGH : IDLE_LOW)
    case 'hit':       return pick(isHigh ? HIT_HIGH : HIT_LOW)
    case 'dodge':     return pick(isHigh ? DODGE_HIGH : DODGE_LOW)
    case 'counter':   return pick(isHigh ? COUNTER_HIGH : COUNTER_LOW)
    case 'panic':     return pick(PANIC)
    case 'confident': return pick(CONFIDENT)
    case 'frenzy':    return pick(FRENZY)
    case 'feint':     return pick(FEINT)
  }
}

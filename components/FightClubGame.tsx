'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

const GW = 800, GH = 450
const GROUND = GH - 72
const GRAVITY = 0.72
const JUMP_V = -15
const PW = 36, PH = 54
const BAR_X = 630, BAR_W = 150

// ── Music notes ───────────────────────────────────────────────
const N: Record<string,number> = {
  E2:82.41, A2:110, B2:123.47, D3:146.83, E3:164.81,
  G3:196, A3:220, B3:246.94, C4:261.63, D4:293.66, E4:329.63,
}

// ── Types ─────────────────────────────────────────────────────
type CharState = 'idle'|'walk'|'jump'|'punch'|'kick'|'dead'
interface Char {
  x:number;y:number;vx:number;vy:number
  hp:number;maxHp:number;onGround:boolean;face:1|-1
  state:CharState;stateTimer:number;atkCD:number;hurtInv:number
  speed:number;dmg:number;isPlayer:boolean
}
interface Proj { x:number;y:number;vx:number;vy:number;spin:number }
interface FText { x:number;y:number;text:string;life:number;col:string;big:boolean }
interface GS {
  player:Char; enemies:Char[]
  wave:number; waveTimer:number; cleared:boolean
  fTexts:FText[]; over:boolean; deathTimer:number
  lastPunchFrame:number; frame:number; keys:Set<string>
  score:number; hasBottle:boolean; bottlesLeft:number; projectile:Proj|null
}

// ── Factory ───────────────────────────────────────────────────
function makePlayer(): Char {
  return { x:80,y:GROUND-PH,vx:0,vy:0,hp:120,maxHp:120,onGround:true,
    face:1,state:'idle',stateTimer:0,atkCD:0,hurtInv:0,speed:4.5,dmg:0,isPlayer:true }
}
function makeEnemy(x:number, wave:number): Char {
  const hp = Math.min(320, 40 + wave * 32)
  return { x,y:GROUND-PH,vx:0,vy:0,hp,maxHp:hp,onGround:true,
    face:-1,state:'idle',stateTimer:0,
    atkCD:Math.max(24,65-wave*4),hurtInv:0,
    speed:Math.min(3.2,1.2+wave*0.28),dmg:Math.min(18,4+wave*2),isPlayer:false }
}

// ── 8-bit music (Where Is My Mind? — Pixies) ─────────────────
function start8BitMusic(audioCtx: AudioContext): ()=>void {
  const b = 60/134, e = b/2
  const LEAD: [number,number][] = [
    [N.E4,e],[N.D4,e],[N.B3,e],[N.A3,e*1.5],[N.G3,e*0.5],
    [N.A3,e],[N.B3,e],[N.D4,e*1.5],[N.B3,e*0.5],[N.A3,b],
    [N.G3,b],[N.E3,b],[0,e],
    [N.B3,e],[N.B3,e],[N.A3,e],[N.G3,e],[N.E3,b*2],[0,b],
    [N.E4,e],[N.D4,e],[N.B3,e],[N.A3,e*1.5],[N.G3,e*0.5],
    [N.A3,e],[N.B3,e],[N.D4,e*1.5],[N.B3,e*0.5],[N.A3,b],
    [N.G3,e],[N.A3,e],[N.B3,b],[N.A3,e],[N.G3,e],
    [N.E3,b*3],[0,b*2],
  ]
  const BASS: [number,number][] = [
    [N.E2,b*2],[N.A2,b*2],[N.D3,b*2],[N.A2,b*2],
  ]
  const master = audioCtx.createGain()
  master.gain.value = 0.22
  master.connect(audioCtx.destination)

  const totalLen = LEAD.reduce((s,[,d])=>s+d,0)
  const bassLen  = BASS.reduce((s,[,d])=>s+d,0)
  let running = true, nextStart = audioCtx.currentTime

  function scheduleLoop() {
    const t0 = nextStart
    nextStart += totalLen
    let t = t0
    for (const [freq,dur] of LEAD) {
      if (freq > 0) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain()
        o.type = 'square'; o.frequency.value = freq
        g.gain.setValueAtTime(0,t)
        g.gain.linearRampToValueAtTime(0.1,t+0.01)
        g.gain.setValueAtTime(0.1,t+dur-0.02)
        g.gain.linearRampToValueAtTime(0,t+dur)
        o.connect(g); g.connect(master)
        o.start(t); o.stop(t+dur+0.01)
      }
      t += dur
    }
    const reps = Math.ceil(totalLen/bassLen)
    for (let r=0;r<reps;r++) {
      let tb = t0+r*bassLen
      for (const [freq,dur] of BASS) {
        if (freq>0 && tb < t0+totalLen) {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain()
          o.type='triangle'; o.frequency.value=freq
          g.gain.setValueAtTime(0,tb)
          g.gain.linearRampToValueAtTime(0.07,tb+0.01)
          g.gain.setValueAtTime(0.07,tb+dur-0.02)
          g.gain.linearRampToValueAtTime(0,tb+dur)
          o.connect(g); g.connect(master)
          o.start(tb); o.stop(tb+dur+0.01)
        }
        tb += dur
      }
    }
  }
  scheduleLoop(); scheduleLoop()
  const id = setInterval(()=>{
    if (!running){ clearInterval(id); return }
    if (nextStart - audioCtx.currentTime < totalLen*1.5) scheduleLoop()
  }, 500)
  return ()=>{
    running=false; clearInterval(id)
    master.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.4)
    setTimeout(()=>{ try{master.disconnect()}catch{} },500)
  }
}

// ── Draw Norton (player) ──────────────────────────────────────
function drawNorton(ctx: CanvasRenderingContext2D, c: Char, frame: number, hasBottle: boolean) {
  if (c.hp <= 0) return
  if (c.hurtInv > 0 && Math.floor(c.hurtInv/3)%2===0) return
  const {x,y,face,state} = c
  ctx.save()
  if (face===-1){ ctx.translate(x+PW,y); ctx.scale(-1,1); ctx.translate(-x,-y) }

  ctx.fillStyle='rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(x+PW/2,GROUND+2,PW*0.5,5,0,0,Math.PI*2); ctx.fill()

  const l1y=state==='walk'?Math.sin(frame*0.35)*4:0
  const l2y=state==='walk'?-Math.sin(frame*0.35)*4:0
  ctx.fillStyle='#1a1a2a'
  ctx.fillRect(x+4,y+34+l1y,12,20-l1y)
  ctx.fillRect(x+20,y+34+l2y,12,20-l2y)

  if (state==='kick'){
    ctx.fillStyle='#1a1a2a'
    ctx.fillRect(x+20,y+28,12,14)
    ctx.save(); ctx.translate(x+26,y+42); ctx.rotate(0.9)
    ctx.fillRect(-6,0,24,12); ctx.restore()
    ctx.fillStyle='#111'
    ctx.save(); ctx.translate(x+40,y+42); ctx.rotate(0.9)
    ctx.fillRect(-2,0,16,8); ctx.restore()
  }

  ctx.fillStyle='#111'
  ctx.fillRect(x+2,y+50,14,7); ctx.fillRect(x+18,y+50,14,7)

  // Shirt
  ctx.fillStyle='#c8c4b4'
  ctx.fillRect(x+2,y+14,32,22)
  ctx.fillStyle='rgba(0,0,0,0.06)'
  ctx.fillRect(x+8,y+15,2,20); ctx.fillRect(x+18,y+15,2,20); ctx.fillRect(x+26,y+15,2,20)

  const punchExt=state==='punch'?18:0
  ctx.fillStyle='#c8c4b4'
  ctx.fillRect(x-4,y+16,9,18)
  ctx.fillRect(x+29+punchExt,y+16,9,18)
  if (state==='punch'){ ctx.fillStyle='#d4a88a'; ctx.fillRect(x+36+punchExt,y+17,12,9) }

  // Bottle in hand
  if (hasBottle) {
    ctx.fillStyle='rgba(70,150,60,0.8)'
    ctx.fillRect(x-9,y+12,7,18)
    ctx.fillRect(x-8,y+8,5,6)
    ctx.fillStyle='#777'; ctx.fillRect(x-8,y+6,5,4)
    ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(x-9,y+9,2,18)
  }

  // Head
  ctx.fillStyle='#d4a88a'
  ctx.fillRect(x+10,y+2,16,14)
  ctx.fillStyle='#2a1810'
  ctx.fillRect(x+9,y,18,5); ctx.fillRect(x+9,y,3,9)
  // Eyes
  ctx.fillStyle='#222'
  ctx.fillRect(x+13,y+6,3,2); ctx.fillRect(x+20,y+6,3,2)
  // Black eye
  ctx.fillStyle='rgba(40,0,60,0.45)'
  ctx.beginPath(); ctx.ellipse(x+14,y+7,4,3,0,0,Math.PI*2); ctx.fill()
  // Mouth
  ctx.fillStyle='#8a5544'
  ctx.fillRect(x+14,y+12,6,1)
  // Blood on lip
  ctx.fillStyle='rgba(180,0,0,0.5)'
  ctx.fillRect(x+15,y+13,3,2)

  ctx.restore()
}

// ── Draw Tyler Durden (enemy) ─────────────────────────────────
function drawTyler(ctx: CanvasRenderingContext2D, c: Char, frame: number) {
  if (c.hp<=0 && c.stateTimer>45) return
  if (c.hurtInv>0 && Math.floor(c.hurtInv/3)%2===0) return
  const {x,y,face,state} = c
  ctx.save()
  if (face===-1){ ctx.translate(x+PW,y); ctx.scale(-1,1); ctx.translate(-x,-y) }

  if (state==='dead'){
    ctx.globalAlpha=Math.max(0,1-c.stateTimer/45)
    ctx.fillStyle='#cc1111'
    ctx.fillRect(x,y+20,PW+20,PH*0.4)
    ctx.restore(); return
  }

  ctx.fillStyle='rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(x+PW/2,GROUND+2,PW*0.5,5,0,0,Math.PI*2); ctx.fill()

  const l1y=state==='walk'?Math.sin(frame*0.38)*4:0
  const l2y=state==='walk'?-Math.sin(frame*0.38)*4:0
  ctx.fillStyle='#1a1a2a'
  ctx.fillRect(x+4,y+34+l1y,12,20-l1y)
  ctx.fillRect(x+20,y+34+l2y,12,20-l2y)

  if (state==='kick'){
    ctx.fillStyle='#1a1a2a'
    ctx.fillRect(x+20,y+28,12,14)
    ctx.save(); ctx.translate(x+26,y+42); ctx.rotate(0.9)
    ctx.fillRect(-6,0,24,12); ctx.restore()
    ctx.fillStyle='#111'
    ctx.save(); ctx.translate(x+40,y+42); ctx.rotate(0.9)
    ctx.fillRect(-2,0,16,8); ctx.restore()
  }

  ctx.fillStyle='#111'
  ctx.fillRect(x+2,y+50,14,7); ctx.fillRect(x+18,y+50,14,7)

  // Chest
  ctx.fillStyle='#e8e0d0'; ctx.fillRect(x+12,y+14,12,22)
  // Red jacket
  ctx.fillStyle='#cc1111'
  ctx.fillRect(x+2,y+14,11,22); ctx.fillRect(x+23,y+14,11,22)
  ctx.fillStyle='#8b0000'
  ctx.fillRect(x+8,y+14,5,14); ctx.fillRect(x+23,y+14,5,14)
  ctx.fillStyle='#cc1111'; ctx.fillRect(x+12,y+12,12,6)

  const punchExt=state==='punch'?18:0
  ctx.fillStyle='#cc1111'
  ctx.fillRect(x-4,y+16,9,18)
  ctx.fillRect(x+29+punchExt,y+16,9,18)
  if (state==='punch'){ ctx.fillStyle='#e0b090'; ctx.fillRect(x+36+punchExt,y+17,12,9) }

  // Head
  ctx.fillStyle='#e0b090'; ctx.fillRect(x+10,y+2,16,14)
  // Blonde hair
  ctx.fillStyle='#c8a440'
  ctx.fillRect(x+9,y-3,18,7); ctx.fillRect(x+23,y-3,5,10); ctx.fillRect(x+9,y-2,4,4)
  // Eyes
  ctx.fillStyle='#222'
  ctx.fillRect(x+13,y+5,3,3); ctx.fillRect(x+20,y+5,3,3)
  // Smirk
  ctx.fillStyle='#9a6655'
  ctx.fillRect(x+13,y+11,9,2); ctx.fillRect(x+20,y+10,2,2)

  ctx.restore()
}

// ── HP bars ───────────────────────────────────────────────────
function drawEnemyHP(ctx: CanvasRenderingContext2D, c: Char) {
  if (c.hp<=0) return
  const W=44,H=5,bx=c.x+PW/2-W/2,by=c.y-14
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(bx-1,by-1,W+2,H+2)
  ctx.fillStyle='#222'; ctx.fillRect(bx,by,W,H)
  const pct=c.hp/c.maxHp
  ctx.fillStyle=pct>.5?'#cc2222':pct>.25?'#ff5500':'#ff0000'
  ctx.fillRect(bx,by,W*pct,H)
}

function drawPlayerHP(ctx: CanvasRenderingContext2D, c: Char) {
  const W=200,H=16,x=14,y=14
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(x-2,y-2,W+4,H+4)
  ctx.fillStyle='#111'; ctx.fillRect(x,y,W,H)
  const pct=Math.max(0,c.hp/c.maxHp)
  ctx.fillStyle=pct>.5?'#22cc44':pct>.25?'#ddaa22':'#dd2222'
  ctx.fillRect(x,y,W*pct,H)
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x,y,W*pct,H/2)
  ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(x,y,W,H)
  ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'
  ctx.textAlign='left'
  ctx.fillText(`${Math.max(0,c.hp)}/${c.maxHp}  Edward Norton`,x+4,y+H-3)
}

// ── Bar & bottles ─────────────────────────────────────────────
function drawBottle(ctx: CanvasRenderingContext2D, x: number, y: number, spin=0) {
  ctx.save()
  ctx.translate(x+8,y+18); ctx.rotate(spin); ctx.translate(-(x+8),-(y+18))
  ctx.fillStyle='rgba(70,150,55,0.75)'
  ctx.fillRect(x+3,y+12,10,22)
  ctx.fillRect(x+5,y+5,6,9)
  ctx.fillStyle='#777'; ctx.fillRect(x+5,y+2,6,5)
  ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(x+4,y+6,2,22)
  ctx.restore()
}

function drawBar(ctx: CanvasRenderingContext2D, bottlesLeft: number) {
  ctx.fillStyle='#4a2a14'; ctx.fillRect(BAR_X-5,GROUND-40,BAR_W+10,4)
  ctx.fillStyle='#3a2010'; ctx.fillRect(BAR_X-5,GROUND-36,BAR_W+10,8)
  ctx.fillStyle='#2a1508'; ctx.fillRect(BAR_X-5,GROUND-28,BAR_W+10,28)
  for (let i=0;i<bottlesLeft;i++) drawBottle(ctx,BAR_X+14+i*34,GROUND-72)
  ctx.fillStyle='rgba(255,200,100,0.35)'; ctx.font='8px monospace'; ctx.textAlign='center'
  ctx.fillText('BAR',BAR_X+BAR_W/2,GROUND-14)
}

// ── Physics ───────────────────────────────────────────────────
function updateChar(c: Char) {
  c.vy=Math.min(20,c.vy+GRAVITY)
  c.x+=c.vx; c.y+=c.vy; c.vx*=0.82
  if (c.y+PH>=GROUND){ c.y=GROUND-PH; c.vy=0; c.onGround=true } else { c.onGround=false }
  c.x=Math.max(0,Math.min(GW-PW,c.x))
  if (c.stateTimer>0) c.stateTimer--
  if (c.atkCD>0) c.atkCD--
  if (c.hurtInv>0) c.hurtInv--
  if (c.stateTimer===0 && ['punch','kick'].includes(c.state)) c.state='idle'
}

// ── Combat ────────────────────────────────────────────────────
function doAttack(attacker: Char, targets: Char[], type: 'punch'|'kick', gs: GS) {
  const dmg  =type==='punch'?18:28
  const range=type==='kick'?76:60
  const kbX  =type==='kick'?6:3
  const kbY  =type==='kick'?-5:-2

  for (const t of targets) {
    if (t.hp<=0||t.hurtInv>0) continue
    const dx=(t.x+PW/2)-(attacker.x+PW/2)
    if (attacker.face===1?dx<0:dx>0) continue
    if (Math.abs(dx)>range) continue
    const ay1=attacker.y+8,ay2=attacker.y+PH
    if (ay2<t.y+8||ay1>t.y+PH) continue

    const actual=attacker.isPlayer?dmg:attacker.dmg
    t.hp=Math.max(0,t.hp-actual)
    t.vx=attacker.face*kbX; t.vy=kbY
    t.hurtInv=attacker.isPlayer?14:20

    if (attacker.isPlayer) {
      gs.score+=actual
      gs.fTexts.push({x:t.x+PW/2,y:t.y-8,text:`-${actual}`,life:35,col:type==='kick'?'#ffaa00':'#ff4444',big:type==='kick'})
      if (t.hp<=0){ t.state='dead'; t.stateTimer=0 }
    } else {
      // Enemy hits player — NO state change, player keeps fighting
      if (t.hp<=0){ t.state='dead'; t.stateTimer=0 }
    }
  }
}

// ── Enemy AI ──────────────────────────────────────────────────
function updateAI(e: Char, player: Char, gs: GS) {
  if (e.hp<=0||e.atkCD>0) return
  const dx=(player.x+PW/2)-(e.x+PW/2)
  const dist=Math.abs(dx)
  e.face=dx>0?1:-1
  if (dist<58&&e.onGround){
    e.state='punch'; e.stateTimer=22; e.atkCD=Math.max(24,65-gs.wave*4)
    doAttack(e,[player],'punch',gs)
  } else if (dist<380){
    e.vx=e.face*e.speed; e.state='walk'
    if (e.onGround&&Math.random()<0.003) e.vy=JUMP_V*0.6
  } else { e.state='idle' }
}

// ── Main component ────────────────────────────────────────────
export default function FightClubGame({ onDone, gameOverText }: { onDone:()=>void; gameOverText?:string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const [scale, setScale] = useState(1)

  useEffect(()=>{
    function upd(){ setScale(Math.min(window.innerWidth/GW,window.innerHeight/GH,1.6)) }
    upd(); window.addEventListener('resize',upd)
    return ()=>window.removeEventListener('resize',upd)
  },[])

  useEffect(()=>{
    discoverEgg('fightclub')
    const canvas=canvasRef.current; if(!canvas) return
    const ctx=canvas.getContext('2d')!

    // Audio
    let stopMusic:()=>void = ()=>{}
    try {
      const audioCtx=new AudioContext()
      stopMusic=start8BitMusic(audioCtx)
    } catch {}

    const gs: GS = {
      player:makePlayer(), enemies:[], wave:0, waveTimer:90, cleared:true,
      fTexts:[], over:false, deathTimer:0,
      lastPunchFrame:-999, frame:0, keys:new Set(),
      score:0, hasBottle:false, bottlesLeft:4, projectile:null,
    }

    function spawnWave(){
      gs.wave++; gs.cleared=false; gs.enemies=[]
      const count=Math.min(1+gs.wave,5)
      for (let i=0;i<count;i++) gs.enemies.push(makeEnemy(GW-60-i*80,gs.wave))
    }

    function loop(){
      const {player,keys}=gs; gs.frame++

      // ── Input ──────────────────────────────────────────
      if (!gs.over&&player.hp>0){
        const canMove=!['punch','kick'].includes(player.state)
        const canAct =canMove&&player.atkCD===0  // NO hurt in list — player always fights back
        if (canMove){
          const left=keys.has('ArrowLeft'); const right=keys.has('ArrowRight')
          if (left){ player.vx=-player.speed; player.face=-1; if(player.state==='idle'||player.state==='jump') player.state='walk' }
          else if (right){ player.vx=player.speed; player.face=1; if(player.state==='idle'||player.state==='jump') player.state='walk' }
          else if (player.state==='walk') player.state='idle'
        }
      }

      // ── Update ─────────────────────────────────────────
      if (player.hp>0) updateChar(player)
      for (const e of gs.enemies){
        if (e.hp>0){ updateAI(e,player,gs); updateChar(e) }
        else{ if(e.stateTimer<60) e.stateTimer++ }
      }

      // Projectile
      if (gs.projectile){
        const p=gs.projectile
        p.vy=Math.min(20,p.vy+GRAVITY); p.x+=p.vx; p.y+=p.vy; p.spin+=0.3
        let hit=false
        for (const e of gs.enemies){
          if (e.hp<=0) continue
          if (Math.abs(p.x-(e.x+PW/2))<22&&Math.abs(p.y-(e.y+PH/2))<28){
            e.hp=Math.max(0,e.hp-45); e.vx=player.face*5; e.vy=-3; e.hurtInv=14
            gs.fTexts.push({x:e.x+PW/2,y:e.y-12,text:'💥 -45',life:45,col:'#88ff44',big:true})
            if(e.hp<=0){ e.state='dead'; e.stateTimer=0 }
            hit=true; break
          }
        }
        if (hit||p.x<-40||p.x>GW+40||p.y>GROUND) gs.projectile=null
      }

      // Wave logic
      if (gs.enemies.length>0&&gs.enemies.every(e=>e.hp<=0)&&!gs.cleared){
        gs.cleared=true; gs.waveTimer=120
        gs.fTexts.push({x:GW/2,y:GH/2-30,text:`VAGUE ${gs.wave} — TERMINÉE`,life:90,col:'#ffdd00',big:true})
      }
      if (gs.cleared){
        if (gs.waveTimer>0) gs.waveTimer--
        else if (player.hp>0) spawnWave()
      }

      // Game over
      if (player.hp<=0&&!gs.over){ gs.over=true; gs.deathTimer=0 }
      if (gs.over) gs.deathTimer++

      gs.fTexts=gs.fTexts.filter(t=>t.life>0)
      gs.fTexts.forEach(t=>{ t.y-=0.7; t.life-- })

      // ── Render ─────────────────────────────────────────
      const bg=ctx.createLinearGradient(0,0,0,GH)
      bg.addColorStop(0,'#08080e'); bg.addColorStop(1,'#12121a')
      ctx.fillStyle=bg; ctx.fillRect(0,0,GW,GH)

      // Bricks
      ctx.strokeStyle='rgba(255,255,255,0.022)'; ctx.lineWidth=1
      for(let r=0;r<9;r++) for(let c=0;c<17;c++){
        const off=r%2===0?0:24; ctx.strokeRect(c*48+off,r*44,46,42)
      }

      // Ambient windows
      for(let i=0;i<4;i++){
        ctx.fillStyle=`rgba(255,200,80,${0.04+i*0.01})`
        ctx.fillRect(60+i*160,20,60,38)
      }

      // Ground
      const gr=ctx.createLinearGradient(0,GROUND,0,GH)
      gr.addColorStop(0,'#18181e'); gr.addColorStop(1,'#0c0c12')
      ctx.fillStyle=gr; ctx.fillRect(0,GROUND,GW,GH-GROUND)
      ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(0,GROUND); ctx.lineTo(GW,GROUND); ctx.stroke()

      // Bar
      drawBar(ctx,gs.bottlesLeft)

      // Bottle pickup hint
      if (!gs.hasBottle&&gs.bottlesLeft>0){
        const near=player.x+PW>=BAR_X-70&&player.x<=BAR_X+BAR_W+20
        if (near){
          ctx.fillStyle='rgba(255,210,80,0.85)'; ctx.font='11px monospace'; ctx.textAlign='center'
          ctx.fillText('[E] Prendre une bouteille',BAR_X+BAR_W/2,GROUND-88)
        }
      }
      if (gs.hasBottle&&!gs.projectile){
        ctx.fillStyle='rgba(255,210,80,0.7)'; ctx.font='10px monospace'; ctx.textAlign='center'
        ctx.fillText('[E] Lancer',player.x+PW/2,player.y-18)
      }

      // Projectile
      if (gs.projectile) drawBottle(ctx,gs.projectile.x-8,gs.projectile.y-18,gs.projectile.spin)

      // Characters
      for (const e of gs.enemies){ drawTyler(ctx,e,gs.frame); drawEnemyHP(ctx,e) }
      if (!gs.over||gs.deathTimer<10) drawNorton(ctx,player,gs.frame,gs.hasBottle)

      // Float texts
      for (const t of gs.fTexts){
        ctx.save(); ctx.globalAlpha=Math.min(1,t.life/12)
        ctx.fillStyle=t.col; ctx.font=`${t.big?'bold ':''} ${t.big?18:14}px monospace`
        ctx.textAlign='center'; ctx.shadowColor=t.col; ctx.shadowBlur=t.big?12:6
        ctx.fillText(t.text,t.x,t.y); ctx.restore()
      }

      // HUD
      drawPlayerHP(ctx,player)

      // Wave badge
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(GW/2-65,10,130,26)
      ctx.fillStyle='#ffdd00'; ctx.font='bold 13px monospace'; ctx.textAlign='center'
      ctx.fillText(`VAGUE  ${gs.wave}`,GW/2,28)

      // Score
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(GW-130,10,120,22)
      ctx.fillStyle='#aaa'; ctx.font='11px monospace'; ctx.textAlign='right'
      ctx.fillText(`SCORE  ${gs.score}`,GW-14,26)

      // Controls (first 300 frames)
      if (gs.frame<300){
        const a=Math.min(0.75,(300-gs.frame)/60)
        ctx.fillStyle=`rgba(200,200,200,${a})`; ctx.font='10px monospace'; ctx.textAlign='center'
        ctx.fillText('← → : Déplacer   Espace : Sauter   Z : Poing   A : Kick   E : Bouteille',GW/2,GH-14)
      }

      // Next wave countdown
      if (gs.cleared&&gs.waveTimer>0&&player.hp>0){
        ctx.fillStyle='rgba(255,220,0,0.65)'; ctx.font='13px monospace'; ctx.textAlign='center'
        ctx.fillText(`Prochaine vague dans ${Math.ceil(gs.waveTimer/60)}s...`,GW/2,GH-35)
      }

      // ── Death animation ─────────────────────────────────
      if (gs.over){
        const dt=gs.deathTimer

        // Norton lying on ground
        const nx=Math.min(gs.player.x,GW-80)
        const ny=GROUND-16
        ctx.fillStyle='#c8c4b4'
        ctx.fillRect(nx-10,ny+4,PW+44,14)  // body
        ctx.fillStyle='#d4a88a'
        ctx.fillRect(nx+PW+26,ny-1,16,14)   // head
        ctx.fillStyle='#2a1810'
        ctx.fillRect(nx+PW+25,ny-5,18,6)    // hair
        // Bruised face
        ctx.fillStyle='rgba(40,0,60,0.55)'
        ctx.fillRect(nx+PW+28,ny+3,9,5)

        // Tyler walks in from right (0→90 frames)
        const TYLER_TARGET_X=nx+PW+4
        if (dt<90){
          const prog=dt/90
          const tx=GW+50+(TYLER_TARGET_X-(GW+50))*prog
          const fakeFace: Char={x:tx,y:GROUND-PH,vx:0,vy:0,hp:1,maxHp:1,onGround:true,
            face:-1,state:dt>5?'walk':'idle',stateTimer:0,atkCD:0,hurtInv:0,speed:0,dmg:0,isPlayer:false}
          drawTyler(ctx,fakeFace,dt)
        } else {
          // Tyler crouched on Norton
          const crouchY=GROUND-PH*0.55
          const fakeFace: Char={x:TYLER_TARGET_X,y:crouchY,vx:0,vy:0,hp:1,maxHp:1,onGround:true,
            face:-1,state:'idle',stateTimer:0,atkCD:0,hurtInv:0,speed:0,dmg:0,isPlayer:false}
          drawTyler(ctx,fakeFace,dt)

          // Blood drips from Tyler's mouth to Norton's face
          const numDrops=Math.min(10,Math.floor((dt-90)/7))
          for (let d=0;d<numDrops;d++){
            const progress=Math.min(1,(dt-90-d*7)/25)
            const dropX=nx+PW+30+Math.sin(d*2.1)*5
            const dropY=crouchY+8+progress*22
            ctx.fillStyle=`rgba(160,0,0,${0.5+d*0.04})`
            ctx.beginPath(); ctx.ellipse(dropX,dropY,3,4+d*0.3,0.2,0,Math.PI*2); ctx.fill()
          }
        }

        // "Tyler a repris le contrôle" message
        if (dt>=170){
          const alpha=Math.min(1,(dt-170)/30)
          ctx.fillStyle=`rgba(0,0,0,${alpha*0.88})`
          ctx.fillRect(0,GH/2-55,GW,100)
          ctx.globalAlpha=alpha
          ctx.fillStyle='#cc0000'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=25
          ctx.font='bold 38px serif'; ctx.textAlign='center'
          ctx.fillText('Tyler a repris le contrôle',GW/2,GH/2+2)
          ctx.shadowBlur=0
          if (dt>240){
            ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.font='12px monospace'
            ctx.fillText('Échap pour fermer',GW/2,GH/2+42)
          }
          ctx.globalAlpha=1
        }
      }

      rafRef.current=requestAnimationFrame(loop)
    }

    function onKeyDown(e: KeyboardEvent){
      gs.keys.add(e.key)
      e.preventDefault()

      if (e.key==='Escape'){ onDone(); return }
      if (gs.over||gs.player.hp<=0) return

      const p=gs.player
      const canAct=!['punch','kick'].includes(p.state)&&p.atkCD===0

      // Z = Punch
      if ((e.key==='z'||e.key==='Z')&&canAct){
        p.state='punch'; p.stateTimer=18; p.atkCD=14
        gs.lastPunchFrame=gs.frame
        doAttack(p,gs.enemies,'punch',gs)
      }
      // A = Kick
      if ((e.key==='a'||e.key==='A')&&canAct){
        p.state='kick'; p.stateTimer=22; p.atkCD=22
        doAttack(p,gs.enemies,'kick',gs)
      }
      // Space = Jump
      if (e.key===' '&&p.onGround){ p.vy=JUMP_V; p.state='jump' }
      // E = Bouteille
      if (e.key==='e'||e.key==='E'){
        if (!gs.hasBottle&&gs.bottlesLeft>0){
          const near=p.x+PW>=BAR_X-80&&p.x<=BAR_X+BAR_W+30
          if (near){ gs.hasBottle=true; gs.bottlesLeft-- }
        } else if (gs.hasBottle&&!gs.projectile){
          gs.hasBottle=false
          gs.projectile={
            x:p.face===1?p.x+PW+4:p.x-10,
            y:p.y+12,
            vx:p.face*10,
            vy:-4,
            spin:0,
          }
        }
      }
    }
    function onKeyUp(e: KeyboardEvent){ gs.keys.delete(e.key) }

    window.addEventListener('keydown',onKeyDown)
    window.addEventListener('keyup',onKeyUp)
    rafRef.current=requestAnimationFrame(loop)

    return ()=>{
      stopMusic()
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown',onKeyDown)
      window.removeEventListener('keyup',onKeyUp)
    }
  },[onDone])

  return (
    <div style={{position:'fixed',inset:0,zIndex:10000,background:'#000',
      display:'flex',alignItems:'center',justifyContent:'center'}}>
      <canvas ref={canvasRef} width={GW} height={GH}
        style={{display:'block',transform:`scale(${scale})`,transformOrigin:'center center',imageRendering:'pixelated'}} />
      <button onClick={onDone} style={{
        position:'absolute',top:'1rem',right:'1rem',
        background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.2)',
        color:'rgba(255,255,255,0.6)',borderRadius:6,padding:'4px 12px',
        cursor:'pointer',fontSize:'.78rem',fontFamily:'monospace',letterSpacing:'1px',
      }}>ESC</button>
    </div>
  )
}

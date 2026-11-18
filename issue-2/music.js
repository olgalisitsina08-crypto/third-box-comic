'use strict';
// Единственная утверждённая композиция. Громкость: 0.15 = 15%, 0.10 = 10%.
// Выбор музыки в интерфейсе отсутствует; MP3 сохранён без перекодирования.
window.ComicMusic = (() => {
  const MUSIC_VOLUME = 0.15;
  const FILE = 'assets/audio/detective_mystery.mp3';
  const LOOP_END = 161.8; // Дальше у исходника около 4 секунд затихающего/тихого хвоста.
  const MIX_MS = 700;
  const allowed = new Set(["01", "02", "03", "04", "05", "06", "07", "7а", "7б", "08", "09", "10", "11", "12"]);
  let enabled=true,started=false,scene='cover',volume=MUSIC_VOLUME,ducked=false;
  let active=0,transition=null,pending=false,revision=0,gain=MUSIC_VOLUME,lastTick=performance.now();
  const slots=[0,1].map(index=>{
    const audio=new Audio();
    audio.hidden=true;audio.preload='none';audio.loop=true;
    audio.dataset.backgroundMusic=String(index);
    audio.src=FILE;
    document.body.append(audio);
    return {audio,weight:0};
  });
  const status=document.getElementById('audio-status');
  function desired(){return enabled&&started&&allowed.has(scene)&&!document.hidden;}
  function applyVolumes(){for(const slot of slots)slot.audio.volume=Math.max(0,Math.min(1,gain*slot.weight));}
  function cancel(){revision++;pending=false;transition=null;}
  function pauseAll(reset=false){
    // При выключении в середине смешивания сохраняем более слышимый проход.
    if(slots[1-active].weight>slots[active].weight)active=1-active;
    cancel();
    for(const slot of slots){slot.audio.pause();slot.weight=0;if(reset&&slot.audio.readyState)slot.audio.currentTime=0;}
    applyVolumes();
  }
  function begin(index,kind){
    const ownRevision=++revision;
    const slot=slots[index];pending=true;
    Promise.resolve(slot.audio.play()).then(()=>{
      if(ownRevision!==revision||!desired())return;
      pending=false;
      transition={kind,from:active,to:index,start:performance.now(),ms:kind==='in'?220:MIX_MS};
    }).catch(error=>{
      if(ownRevision!==revision||error.name==='AbortError')return;
      pending=false;slot.audio.pause();slot.weight=0;
      status.textContent='Музыка не запустилась. Выключите и снова включите общий звук.';
    });
  }
  function ensurePlaying(){
    if(!desired()||pending||transition?.kind==='mix')return;
    if(transition?.kind==='out')cancel();
    const slot=slots[active];
    if(slot.audio.paused){slot.weight=0;begin(active,'in');}
    else if(!transition){slot.weight=1;applyVolumes();}
  }
  function fadeStop(){
    if(transition?.kind==='out')return;
    cancel();
    if(slots.every(slot=>slot.audio.paused)){pauseAll();return;}
    transition={kind:'out',start:performance.now(),ms:450,weights:slots.map(slot=>slot.weight)};
  }
  function tick(){
    const now=performance.now(),dt=Math.min(100,now-lastTick);lastTick=now;
    // На время бумаги, металла и бега фон мягко становится тише.
    const target=volume*(ducked?.03:1);
    gain+=(target-gain)*Math.min(1,dt/100);
    if(transition){
      const t=transition,p=Math.min(1,(now-t.start)/t.ms);
      if(t.kind==='out')slots.forEach((slot,i)=>slot.weight=t.weights[i]*(1-p));
      else if(t.kind==='in')slots[t.to].weight=p;
      else{slots[t.from].weight=1-p;slots[t.to].weight=p;}
      if(p===1){
        transition=null;
        if(t.kind==='out')pauseAll();
        else if(t.kind==='mix'){slots[t.from].audio.pause();slots[t.from].weight=0;active=t.to;}
      }
    }
    applyVolumes();
    const slot=slots[active];
    if(desired()&&!transition&&!pending&&!slot.audio.paused&&slot.audio.currentTime>=LOOP_END-MIX_MS/1000){
      const next=1-active;
      slots[next].audio.pause();slots[next].weight=0;
      slots[next].audio.currentTime=0;
      applyVolumes();begin(next,'mix');
    }
  }
  setInterval(tick,40);
  function start(){pauseAll(true);started=true;ensurePlaying();}
  function enterScene(id){
    if(scene===id)return;
    scene=id;
    if(id==='cover'){started=false;pauseAll(true);}
    else if(id==='final')fadeStop();
    else if(!allowed.has(id)){if(transition?.kind!=='out')pauseAll();}
    else ensurePlaying();
  }
  function setEnabled(value){if(enabled===value)return;enabled=value;if(!enabled)pauseAll();else ensurePlaying();}
  function setDucked(value){ducked=value;}
  // Возможность дальнейшей настройки без нового визуального интерфейса.
  function setVolume(percent){if(Number.isFinite(percent))volume=Math.max(0,Math.min(100,percent))/100;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();else ensurePlaying();});
  window.addEventListener('pagehide',()=>pauseAll());
  return {start,enterScene,setEnabled,setDucked,setVolume};
})();

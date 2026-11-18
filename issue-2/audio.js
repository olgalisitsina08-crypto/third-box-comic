'use strict';
// Только имеющиеся файлы: отсутствующие эффекты не подменяются.
window.IssueAudio=(()=>{
 const chorus=new Audio('assets/audio/sun_circle.mp3');chorus.preload='auto';chorus.volume=.70;
 const effect=new Audio();effect.preload='auto';effect.volume=.50;
 const files={paper:'paper_rustle.mp3',steps:'running_steps.mp3',yarn:'yarn_drop_roll.m4a',notebook:'notebook_drop.m4a',wind:'gate_wind.m4a'};
 const levels={yarn:.26,notebook:.60,wind:.75};
 let enabled=true,revision=0,songRevision=0,onSongEnd=null,effectDone=null,effectTick=null;
 try{enabled=localStorage.getItem('third-box-issue2-sound')!=='off'}catch(_){}
 const status=document.getElementById('audio-status');
 function sync(){
  ComicMusic.setEnabled(enabled);chorus.muted=!enabled;effect.muted=!enabled;
  const b=document.getElementById('sound');b.setAttribute('aria-pressed',String(enabled));
  b.setAttribute('aria-label',enabled?'Выключить звук':'Включить звук');
  document.getElementById('sound-label').textContent=enabled?'Звук вкл.':'Звук выкл.';
  try{localStorage.setItem('third-box-issue2-sound',enabled?'on':'off')}catch(_){}
 }
 function completeEffect(){
  clearInterval(effectTick);effectTick=null;
  const done=effectDone;effectDone=null;effect.onended=effect.onerror=null;done?.();
 }
 function stopEffect(){revision++;effect.pause();effect.removeAttribute('src');effect.load();completeEffect()}
 function stopSong(){songRevision++;onSongEnd=null;chorus.pause();chorus.currentTime=0;ComicMusic.setDucked(false)}
 function completeSong(){ComicMusic.setDucked(false);const done=onSongEnd;onSongEnd=null;done?.()}
 chorus.addEventListener('ended',completeSong);
 chorus.addEventListener('error',()=>{status.textContent='Припев недоступен. Можно продолжать чтение.';completeSong()});
 async function sing(done,image){
  stopEffect();stopSong();onSongEnd=done;chorus.currentTime=0;chorus.muted=!enabled;
  ComicMusic.setDucked(true);
  const own=songRevision;
  try{await image.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}catch(_){}
  if(own!==songRevision||!onSongEnd)return;
  try{await chorus.play()}catch(e){if(e.name!=='AbortError'){status.textContent='Браузер не запустил припев. Можно продолжить чтение.';completeSong()}}
 }
 async function play(name,image,options={}){
  stopEffect();if(!enabled||!files[name]||document.hidden)return;
  const own=revision;
  const level=levels[name]??.50,startAt=options.startAt||0;
  effect.volume=options.fadeIn?0:level;
  effect.src='assets/audio/'+files[name];effect.load();
  try{if(image)await image.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}catch(_){return}
  if(own!==revision||!enabled||document.hidden)return;
  // Обещание завершается после всего файла, а также при выключении звука,
  // отмене или ошибке. Кадр 10 ждёт именно завершения, а не начала play().
  await new Promise(resolve=>{
   effectDone=resolve;effect.onended=completeEffect;
   effect.onerror=()=>{status.textContent='Эффект недоступен. Чтение продолжается.';completeEffect()};
   // Позиция задаётся до play(): пропускается только начальная тишина.
   // Падение и качение остаются одним файлом с одним запуском.
   effect.currentTime=startAt;
   let cueFired=false;
   effectTick=setInterval(()=>{
    if(own!==revision)return;
    const time=effect.currentTime;
    let gain=1;
    if(options.fadeIn)gain=Math.min(gain,Math.max(0,(time-startAt)/options.fadeIn));
    if(options.fadeOut&&Number.isFinite(effect.duration))gain=Math.min(gain,Math.max(0,(effect.duration-time)/options.fadeOut));
    effect.volume=level*gain;
    if(!cueFired&&options.cueAt!=null&&time>=options.cueAt){cueFired=true;options.onCue?.()}
   },40);
   effect.play()?.catch(e=>{if(own!==revision)return;if(e.name!=='AbortError')status.textContent='Эффект недоступен. Чтение продолжается.';completeEffect()});
  });
 }
 function scene(id,{preserveEffect=false}={}){if(!preserveEffect)stopEffect();stopSong();ComicMusic.enterScene(id)}
 document.getElementById('sound').addEventListener('click',()=>{enabled=!enabled;if(!enabled)stopEffect();sync()});
 // Выключенный звук не прерывает 18-секундный припев: он продолжается беззвучно,
 // а включение возвращает его с текущего места, без повторного начала.
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopEffect();chorus.pause()}else if(onSongEnd){chorus.play().catch(()=>completeSong())}});
 window.addEventListener('pagehide',()=>{stopEffect();stopSong()});
 sync();return{scene,sing,play,stopSong,stopEffect,get songPlaying(){return !!onSongEnd}};
})();

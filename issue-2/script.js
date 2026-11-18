'use strict';
const frames=window.COMIC_FRAMES;
const $=id=>document.getElementById(id);
let frameIndex=0,lineIndex=0,started=false,final=false,history=[],cardOpener=null;
let waitingForSteps=false,stepsRevision=0;
let transition=null,transitionRevision=0;
const art=$('art'),layer=$('layer'),bubble=$('bubble'),next=$('next');
function state(){return{frameIndex,lineIndex,started,final}}
function button(text,cls,fn){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',fn);layer.append(b);return b}
function drawTail(){
 layer.querySelector('.speech-tail')?.remove();
 const line=frames[frameIndex].lines[lineIndex];
 if(!started||final||waitingForSteps||bubble.hidden||!line?.tail)return;
 const r=bubble.getBoundingClientRect(),p=layer.getBoundingClientRect();
 const x=r.left-p.left+r.width*line.tail.base,y=r.bottom-p.top-4;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('speech-tail');svg.setAttribute('viewBox',`0 0 ${p.width} ${p.height}`);
 svg.setAttribute('aria-hidden','true');
 const polygon=document.createElementNS(svg.namespaceURI,'polygon');
 polygon.setAttribute('points',`${x-9},${y} ${line.tail.tip[0]*p.width},${line.tail.tip[1]*p.height} ${x+9},${y}`);
 polygon.setAttribute('fill',getComputedStyle(bubble).backgroundColor);
 polygon.setAttribute('stroke',getComputedStyle(bubble).borderTopColor);
 polygon.setAttribute('stroke-width','2.5');polygon.setAttribute('stroke-linejoin','round');
 svg.append(polygon);layer.append(svg);
}
function cancelSteps(){stepsRevision++;waitingForSteps=false}
function cancelTransition(){transitionRevision++;transition=null}
function yarnTransition(){
 const own=++transitionRevision;transition='yarn';render();let advanced=false;
 const advance=()=>{
  if(own!==transitionRevision||advanced)return;
  advanced=true;transition=null;
  move(frames.findIndex(f=>f.id==='02'),0,{preserveEffect:true});
 };
 IssueAudio.play('yarn',art,{startAt:1.15,cueAt:2.25,onCue:advance}).then(advance);
}
function windTransition(){
 const own=++transitionRevision;transition='wind';render();
 IssueAudio.play('wind',art,{fadeIn:.15,fadeOut:.9}).then(()=>{
  if(own!==transitionRevision)return;
  transition=null;move(frames.findIndex(f=>f.id==='11'));
 });
}
function presentEntry(){
 const id=frames[frameIndex].id;
 if(id!=='10'||!started||final){
  render();
  if(id==='07'&&started&&!final)IssueAudio.play('notebook',art,{startAt:.25});
  return;
 }
 waitingForSteps=true;const own=stepsRevision;render();
 IssueAudio.play('steps',art).then(()=>{
  if(own!==stepsRevision||frames[frameIndex].id!=='10'||!waitingForSteps)return;
  waitingForSteps=false;render();
 });
}
function render(){
 const frame=frames[frameIndex];art.src=frame.image;art.alt=frame.title;
 layer.replaceChildren();bubble.hidden=true;bubble.removeAttribute('style');
 $('previous').disabled=!started;next.disabled=false;
 $('progress').textContent=started?`Выпуск 2 · ${frameIndex+1} / 14 · Кадр ${frame.id}`:'Выпуск 2';
 if(!started){
  const title=document.createElement('h1');title.className='cover-title';title.innerHTML='<small>ВЫПУСК 2</small>Тайна третьей коробки';layer.append(title);
  button('Начать расследование','primary cover-start',start);next.textContent='Начать →';return;
 }
 if(final){const end=document.createElement('div');end.className='ending';end.innerHTML='<h1>Продолжение следует…</h1>';layer.append(end);next.textContent='Читать сначала ↺';return}
 next.textContent='Далее →';
 if(waitingForSteps){next.disabled=true;next.textContent='Шаги…';return}
 if(transition==='wind'){next.disabled=true;next.textContent='Ветер…';return}
 const line=frame.lines[lineIndex];
 if(line){
  bubble.textContent=line.text;bubble.dataset.speaker=line.speaker;bubble.setAttribute('aria-label',line.speaker+': '+line.text);
  const [x,y,w]=line.position||frame.position;Object.assign(bubble.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%'});bubble.hidden=false;
  requestAnimationFrame(drawTail);
 }
 if(frame.id==='7а'&&lineIndex===frame.lines.length-1){button('Запеть!','primary sing',sing);next.disabled=true}
 if(frame.id==='7б'&&IssueAudio.songPlaying){next.disabled=true;next.textContent='Поют…'}
 if(frame.id==='08'){
  const hotspot=button('','card-hotspot',openCard);hotspot.id='card-hotspot';hotspot.setAttribute('aria-label','Рассмотреть карточку');
  const label=document.createElement('span');label.textContent='Карточка ↗';hotspot.append(label);
 }
 if(frame.id==='12'){button('Открыть коробку','primary open-box',finish);next.disabled=true}
 if(transition==='yarn'){next.disabled=true;next.textContent='Клубок…'}
}
function start(){cancelSteps();cancelTransition();started=true;final=false;frameIndex=0;lineIndex=0;history=[];IssueAudio.scene('01');ComicMusic.start();render()}
function move(index,line=0,options={}){
 cancelSteps();cancelTransition();
 const old=frames[frameIndex].id;history.push(state());frameIndex=index;lineIndex=line;
 const id=frames[index].id;if(old!==id)IssueAudio.scene(id,options);
 if(old!==id)presentEntry();else render();
}
function forward(){
 if(!$('card-modal').open){
  if(!started){start();return}if(final){IssueAudio.scene('cover');started=false;final=false;frameIndex=0;lineIndex=0;history=[];render();return}
  const f=frames[frameIndex];
  if(waitingForSteps||transition||(f.id==='7а'&&lineIndex===f.lines.length-1)||f.id==='12'||(f.id==='7б'&&IssueAudio.songPlaying))return;
  if(f.id==='01'&&lineIndex===f.lines.length-1){yarnTransition();return}
  if(f.id==='10'){windTransition();return}
  if(lineIndex+1<f.lines.length)move(frameIndex,lineIndex+1);else if(frameIndex+1<frames.length)move(frameIndex+1);
 }
}
function back(){
 if($('card-modal').open){closeCard();return}
 cancelSteps();cancelTransition();IssueAudio.stopSong();IssueAudio.stopEffect();
 const prior=history.pop();if(!prior){started=false;frameIndex=0;lineIndex=0;final=false;IssueAudio.scene('cover')}
 else{({frameIndex,lineIndex,started,final}=prior);IssueAudio.scene(final?'final':frames[frameIndex].id)}presentEntry();
}
function sing(){
 move(frames.findIndex(f=>f.id==='7б'));
 IssueAudio.sing(()=>{if(frames[frameIndex].id==='7б'&&!final)render()},art);render();
}
function openCard(){cardOpener=document.activeElement;$('card-modal').showModal();$('close-card').focus();IssueAudio.play('paper',$('card-art'))}
function closeCard(){$('card-modal').close();IssueAudio.stopEffect();cardOpener?.focus()}
function finish(){cancelSteps();cancelTransition();history.push(state());final=true;IssueAudio.scene('final');render()}
next.addEventListener('click',forward);$('previous').addEventListener('click',back);
$('close-card').addEventListener('click',closeCard);$('card-done').addEventListener('click',closeCard);
$('card-modal').addEventListener('cancel',()=>IssueAudio.stopEffect());
document.addEventListener('keydown',e=>{
 if(e.target.closest('button')||$('card-modal').open)return;
 if(['ArrowRight',' '].includes(e.key)){e.preventDefault();forward()}
 if(e.key==='ArrowLeft'){e.preventDefault();back()}
});
// Две следующие иллюстрации готовятся без перерисовки текущего кадра.
function preload(){for(const f of frames.slice(frameIndex+1,frameIndex+3)){const img=new Image();img.src=f.image}}
art.addEventListener('load',preload);IssueAudio.scene('cover');render();
window.addEventListener('resize',()=>requestAnimationFrame(drawTail));
document.fonts.ready.then(drawTail);
window.ComicPreview={state:()=>({...state(),frame:frames[frameIndex].id,line:frames[frameIndex].lines[lineIndex]?.text||''})};

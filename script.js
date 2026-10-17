'use strict';
// Монтаж: согласованная таблица «Тайна_третьей_коробки_таблица_реплик_правки_1.xlsx».
// Все оригинальные иллюстрации сохранены без ретуши, коробки без дополнительных номеров.
const A='Александр', E='Эжен';
const $=id=>document.getElementById(id);
const ui={art:$('panel-art'),layer:$('panel-layer'),bubble:$('bubble'),speaker:$('speaker'),dialogue:$('dialogue'),object:$('object-button'),progress:$('progress'),next:$('next'),back:$('previous'),prompt:$('prompt'),modal:$('modal'),modalArt:$('modal-art'),modalText:$('modal-text'),modalSpeech:$('modal-speech'),modalNext:$('modal-next'),modalClose:$('modal-close')};
const pic=i=>`assets/scene_${String(i).padStart(2,'0')}.webp`;
const words={
 intro:[[A,'Какие-то коробки… Что это?']],
 preNote:[[E,'Сейчас узнаем!']],
 postnote:[[A,'Или что-то случилось, или одно из двух!'],[E,'Случилось. Третья пропала!']],
 box:[[E,'Открываем первую, шеф?'],[A,'Логично, коллега!']],
 run:[[A,'Прибыли. Следы ведут сюда!'],[E,'Какие следы?'],[A,'Пока не знаю. Но ведут точно сюда.']],
 garage:[[E,'Алекс! У него нет колеса!'],[A,'А у нас как раз одно лишнее.'],[E,'Совпадение, шеф?'],[A,'Не думаю, коллега!']],
 lookbox:[[E,'Постой! Она же была у дома!'],[A,'Значит, кто-то добрался сюда раньше нас!']],
 contents:[[E,'Смотри, клубок! Из него бабушка Оля может связать синюю одежду!'],[E,'А при чём тут гусь?'],[A,'М-м-м… Сверим часы!']],
 takeover:[[A,'Он захватил экскаватор!'],[E,'По-моему, он захватил мою шерсть.'],[A,'Одно другому не мешает.']],
 reaction:[[E,'Шеф, а как же третья коробка?'],[A,'Следствие временно приостановлено!']]
};
const pages=[
 {id:'cover',image:1,kind:'cover'},
 {id:'intro',image:1,lines:words.intro},
 {id:'preNote',image:2,lines:words.preNote},
 {id:'note',image:2,kind:'note'},
 {id:'postnote',image:2,lines:words.postnote},
 {id:'box',image:4,lines:words.box},
 {id:'wheel',image:4,kind:'wheel'},
 {id:'run',image:6,lines:words.run},
 {id:'garage',image:7,lines:words.garage},
 {id:'lookbox',image:8,lines:words.lookbox},
 {id:'contents',image:9,lines:words.contents},
 {id:'meeting',image:10},
 {id:'chase1',kind:'chase',image:11,part:1},
 {id:'chase2',kind:'chase',image:11,part:2},
 {id:'chase3',kind:'chase',image:11,part:3},
 {id:'takeover',image:12,lines:words.takeover},
 {id:'news',kind:'news',image:12},
 {id:'eyes',image:13},
 {id:'reaction',image:12,lines:words.reaction},
 {id:'final',kind:'final',image:12}
];
// Индивидуальные места реплик: x/y/ширина в долях кадра.
// Хвост задан только там, где его путь свободен: край, место на краю, кончик.
// Кончик останавливается перед волосами. Без безопасного пути хвост не рисуем.
const bubblePositions={
 intro:{[A]:{box:[.035,.025,.49],tail:['bottom',.84,.50,.16]}},
 preNote:{[E]:{box:[.035,.026,.50]}},
 postnote:{[A]:{box:[.45,.025,.52],tail:['bottom',.36,.64,.17]},[E]:{box:[.03,.025,.55]}},
 box:{[A]:{box:[.46,.026,.51],tail:['bottom',.35,.64,.15]},[E]:{box:[.03,.03,.56]}},
 run:{[A]:{box:[.47,.03,.50]},[E]:{box:[.025,.03,.54]}},
 garage:{[A]:{box:[.47,.027,.50]},[E]:{box:[.03,.20,.49],tail:['bottom',.50,.28,.325]}},
 lookbox:{[A]:{box:[.09,.80,.79]},[E]:{box:[.19,.80,.76]}},
 contents:{[A]:{box:[.43,.023,.54],tail:['bottom',.40,.65,.13]},[E]:{box:[.025,.025,.55],tail:['bottom',.48,.29,.25]}},
 takeover:{[A]:{box:[.035,.025,.47]},[E]:{box:[.035,.025,.47]}},
 reaction:{[A]:{box:[.035,.025,.47]},[E]:{box:[.035,.025,.47]}}
};
let pageNo=0,lineNo=0,modalType=null,modalStep=0,history=[];
const make=(tag,cls,content)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e};
function resetLayer(){ui.layer.replaceChildren();ui.bubble.hidden=true;ui.bubble.className='speech';ui.bubble.removeAttribute('style');ui.object.hidden=true;ui.object.className='object-button';ui.object.onclick=null;ui.prompt.textContent='';}
function setPage(index,remember=true){if(index<0||index>=pages.length)return;if(remember)history.push([pageNo,lineNo]);pageNo=index;lineNo=0;paint()}
function insertTail(loc){
 if(!loc.tail)return;
 const [edge,at,tx,ty]=loc.tail;
 const r=ui.bubble.getBoundingClientRect(), pr=ui.layer.getBoundingClientRect();
 if(!r.width||!r.height||!pr.width)return;
 const bx=(r.left-pr.left+r.width*at)/pr.width;
 const by=(edge==='top'?r.top-pr.top+3:r.bottom-pr.top-3)/pr.height;
 // При более высоком тексте хвост не должен разворачиваться внутрь облачка.
 if((edge==='top'?by-ty:ty-by)*pr.height<8)return;
 const coords=`${(bx*1000-27).toFixed(1)},${(by*1778).toFixed(1)} ${(bx*1000+27).toFixed(1)},${(by*1778).toFixed(1)} ${(tx*1000).toFixed(1)},${(ty*1778).toFixed(1)}`;
 const e=make('div','speech-tail '+(ui.bubble.dataset.person===E?'from-eugene':'from-alexandre'));
 e.innerHTML=`<svg viewBox="0 0 1000 1778" preserveAspectRatio="none" aria-hidden="true"><polygon points="${coords}" /></svg>`;
 ui.layer.append(e);
}
function visibleLine(){const p=pages[pageNo],pair=p.lines?.[lineNo];if(!pair){ui.bubble.hidden=true;return}
 const [who,speech]=pair, loc=(bubblePositions[p.id]||{})[who]||{box:[.06,.035,.82]};
 ui.bubble.hidden=false;ui.bubble.dataset.person=who;ui.speaker.textContent='';ui.dialogue.textContent=speech;
 ui.bubble.className='speech '+(who===E?'eugene':'alexandre')+(speech.length>63?' long-line':'');
 ui.bubble.style.left=`${loc.box[0]*100}%`;ui.bubble.style.top=`${loc.box[1]*100}%`;ui.bubble.style.width=`${loc.box[2]*100}%`;
 insertTail(loc);
}
function actionButton(text,fn){ui.object.textContent=text;ui.object.hidden=false;ui.object.onclick=fn;ui.next.hidden=true}
function decorateChase(part){
 const holder=make('div','chase-screen');const src=`assets/chase_${part}.webp`;
 const bg=make('div','chase-bg');bg.style.backgroundImage=`url('${src}')`;
 const frame=make('div','chase-frame');const img=make('img');img.src=src;img.alt=['Гусь хватает синий клубок','Братья бегут за гусем','Гусь прыгает в ковш экскаватора'][part-1];
 const labels={1:[['ЦАП!',.67,.48,-12],['А-а-а!',.06,.15,-9]],2:[['ГА-ГА!',.76,.16,-12],['ТОП-ТОП-ТОП!',.06,.71,-10]],3:[['ВЖУХ!',.60,.27,-11],['ХЛОП-ХЛОП!',.06,.77,8]]};
 for(const [word,x,y,angle] of labels[part]){const sound=make('div','sound sound-'+part,word);sound.style.left=(x*100)+'%';sound.style.top=(y*100)+'%';sound.style.transform=`rotate(${angle}deg)`;frame.append(sound)}
 frame.prepend(img);holder.append(bg,frame);ui.layer.append(holder);
}
function paint(){const p=pages[pageNo];resetLayer();ui.art.src=pic(p.image);ui.art.alt=`Сцена из комикса «Тайна третьей коробки»`;
 ComicAudio.enterScene(p.id,ui.art);
 ui.art.hidden=p.kind==='chase';ui.progress.textContent=`${pageNo+1} / ${pages.length}`;ui.back.disabled=history.length===0;ui.next.hidden=false;ui.next.textContent='Далее →';
 document.querySelector('.toolbar').classList.toggle('on-cover',p.kind==='cover');
 if(p.kind==='cover'){
  const cover=make('div','cover-screen');cover.innerHTML='<h1>Тайна третьей коробки</h1>';ui.layer.append(cover);
  actionButton('Начать расследование',()=>{ComicAudio.startInvestigation();setPage(1)});ui.object.classList.add('cover-action');return;
 }
 if(p.lines){visibleLine();return}
 if(p.kind==='note'){actionButton('Прочитать записку',()=>showModal('note'));return}
 if(p.kind==='wheel'){actionButton('Рассмотреть колёсико',()=>showModal('wheel'));return}
 if(p.kind==='chase'){decorateChase(p.part);return}
 if(p.kind==='news'){
  const sheet=make('div','news-screen');sheet.innerHTML='<div class="small">ЭКСТРЕННЫЙ ВЫПУСК</div><h2>СРОЧНО В НОМЕР!</h2><h3>РАССЛЕДОВАНИЕ ПРИОСТАНОВЛЕНО!</h3><strong>СЕГОДНЯ ЭЖЕНУ ИСПОЛНЯЕТСЯ 6 ЛЕТ!</strong><p>Всем участникам расследования предписано немедленно приступить к празднованию!</p><p class="fine">Гусю — оставаться на месте происшествия.</p>';
  ui.layer.append(sheet);ComicAudio.newsShown(sheet);return;
 }
 if(p.kind==='final'){
  const end=make('div','final-screen');end.innerHTML='<div class="cake">🎂</div><h2>С днём рождения, Эжен!</h2><p>Бабушка Оля обнимает обоих следователей.</p><div class="more">Продолжение следует…</div>';
  ui.layer.append(end);ComicAudio.prepareBirthday(end);ui.next.textContent='Читать сначала ↺';return;
 }
}
function next(){if(!ui.modal.hidden)return;const p=pages[pageNo];if(p.lines&&lineNo<p.lines.length-1){history.push([pageNo,lineNo]);lineNo++;paint();return}if(p.kind==='note'||p.kind==='wheel'||p.kind==='cover')return;if(pageNo===pages.length-1){history=[];setPage(0,false)}else setPage(pageNo+1)}
function back(){if(!ui.modal.hidden)return;const prev=history.pop();if(prev){pageNo=prev[0];lineNo=prev[1];paint()}}
function showModal(kind){modalType=kind;modalStep=0;ui.modal.hidden=false;document.body.style.overflow='hidden';ui.modalArt.src=pic(kind==='note'?3:5);ui.modalArt.alt=kind==='note'?'Развёрнутая записка':'Колесо с эмблемой двух гаечных ключей';ui.modalSpeech.hidden=true;ui.modalText.hidden=true;drawModal();ui.modalClose.focus();ComicAudio.openClue(kind,ui.modalArt,ui.modal)}
function drawModal(){
 if(modalType==='note'){
  ui.modalText.hidden=false;ui.modalText.innerHTML='<p>Вообще-то коробок должно быть три.</p><p>Третья — самая важная.</p><p>Найдите её по подсказкам!</p>';ui.modalNext.textContent='К расследованию →';return;
 }
 const [who,speech]=[[E,'Что за эмблема?'],[A,'Я знаю! Видел такую же на воротах старого гаража. Бежим туда!']][modalStep];
 ui.modalSpeech.hidden=false;ui.modalSpeech.className='modal-speech '+(who===E?'eugene modal-left':'alexandre modal-right');ui.modalSpeech.replaceChildren(document.createTextNode(speech));
 ui.modalNext.textContent=modalStep===0?'Ответ шефа →':'Бежим к гаражу →';
}
function closeModal(){if(ui.modal.hidden)return;const kind=modalType;ui.modal.hidden=true;document.body.style.overflow='';modalType=null;setPage(pages.findIndex(p=>p.id===(kind==='note'?'postnote':'run')))}
function modalForward(){if(modalType==='wheel'&&modalStep===0){modalStep++;drawModal();return}closeModal()}
ui.next.addEventListener('click',next);ui.back.addEventListener('click',back);ui.modalNext.addEventListener('click',modalForward);ui.modalClose.addEventListener('click',closeModal);
ui.modal.addEventListener('click',e=>{if(e.target===ui.modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ui.modal.hidden){e.preventDefault();closeModal()}else if((e.key==='ArrowRight'||e.key===' ')&&!e.repeat){if(ui.modal.hidden){if(!ui.next.hidden){e.preventDefault();next()}}else if(e.key==='ArrowRight'){e.preventDefault();modalForward()}}else if(e.key==='ArrowLeft'&&ui.modal.hidden){e.preventDefault();back()}});
$('panel').addEventListener('click',e=>{if(e.target.closest('button'))return;if(!ui.next.hidden)next()});
window.addEventListener('resize',()=>{if(pages[pageNo].lines)paint()});
// После загрузки шрифта привязываем хвост к фактической высоте текста.
document.fonts.ready.then(()=>{if(pages[pageNo].lines)paint()});
paint();

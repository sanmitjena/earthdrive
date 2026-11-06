/* One game, responsive phone layout; touch input shares the keyboard physics. */
const MobileTouch={steer:0};
window.addEventListener('DOMContentLoaded',()=>{
 const forced=new URLSearchParams(location.search).get('mobile')==='1',media=matchMedia('(pointer: coarse)');
 const pad=document.createElement('nav');pad.id='mobile-controls';pad.setAttribute('aria-label','Touch game controls');pad.hidden=true;document.body.append(pad);
 const held=new Map();let lastMode='',lastBlocked=true;
 function release(){pad.querySelectorAll('.thumb-steering').forEach(n=>n.reset?.());MobileTouch.steer=0;for(const key of held.values())keys.delete(key);held.clear();pad.querySelectorAll('button').forEach(b=>b.classList.remove('held'));}
 function layout(){document.body.classList.toggle('mobile-game',forced||media.matches);if(!document.body.classList.contains('mobile-game'))release();update();}
 function hold(button,key){button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(pad.hidden)return;button.setPointerCapture(e.pointerId);held.set(e.pointerId,key);keys.add(key);button.classList.add('held');});const end=e=>{const previous=held.get(e.pointerId);held.delete(e.pointerId);if(previous&&![...held.values()].includes(previous))keys.delete(previous);button.classList.remove('held');};for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);}
 function control(label,key,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label);if(key)hold(b,key);else b.onclick=action;return b;}
 function steering(){const area=document.createElement('div');area.className='thumb-steering';area.setAttribute('role','group');area.setAttribute('aria-label','Drag to steer');const knob=document.createElement('span');knob.className='thumb-knob';area.append(knob);const caption=document.createElement('span');caption.className='thumb-caption';caption.textContent='STEER';area.append(caption);let pointer=null;
  const reset=()=>{pointer=null;MobileTouch.steer=0;keys.delete('ArrowLeft');keys.delete('ArrowRight');if(lastMode==='walk'){keys.delete('ArrowUp');keys.delete('ArrowDown');}knob.style.transform='translate(-50%,-50%)';};
  const move=e=>{if(pointer!==e.pointerId)return;const r=area.getBoundingClientRect(),radius=r.width*.32;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const length=Math.hypot(x,y);if(length>radius){x*=radius/length;y*=radius/length;}MobileTouch.steer=Math.abs(x)<radius*.12?0:-x/radius;keys.delete('ArrowLeft');keys.delete('ArrowRight');if(x<-radius*.2)keys.add('ArrowLeft');if(x>radius*.2)keys.add('ArrowRight');if(lastMode==='walk'){keys.delete('ArrowUp');keys.delete('ArrowDown');if(y<-radius*.2)keys.add('ArrowUp');if(y>radius*.2)keys.add('ArrowDown');}knob.style.transform='translate(calc(-50% + '+x+'px),calc(-50% + '+y+'px))';};
  area.addEventListener('pointerdown',e=>{if(pad.hidden||pointer!==null)return;e.preventDefault();pointer=e.pointerId;area.setPointerCapture(pointer);move(e);});area.addEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])area.addEventListener(event,e=>{if(e.pointerId===pointer)reset();});area.reset=reset;pad.append(area);
 }
 function group(items){const g=document.createElement('div');for(const item of items)g.append(control(...item));pad.append(g);}
 function update(){const mobile=document.body.classList.contains('mobile-game'),blocked=!mobile||!ready||paused||!!document.querySelector('dialog[open],.map-card.expanded'),mode=trainMode?.walker?.active?'walk':trainMode?.active?'train':flight?.active?'plane':bus?.active?'bus':'car';
  if(mode!==lastMode){release();pad.replaceChildren();lastMode=mode;
   if(mode==='plane'&&mobile)$('flight-takeoff-hint').textContent='Hold Faster, then hold Climb to take off';
   if(mode==='train'){group([['Stop / Start',null,()=>$('train-pause').click()],['Step out',null,()=>$('train-exit').click()]]);}
   else{steering();if(mode==='plane')group([['Climb','KeyW'],['Descend','KeyS'],['Faster','ArrowUp'],['Slower','ControlLeft'],['Brake','Space']]);else if(mode==='walk')group([['Back','ArrowDown'],['Walk','ArrowUp'],['Enter car',null,()=>$('enter-walk-car').click()]]);else{group([['◀ Reverse','ArrowDown'],['▰ Brake','Space'],['▲ Accelerate','ArrowUp']]);pad.lastElementChild.classList.add('driving-pedals');if(mode==='bus')pad.lastElementChild.append(control('Doors',null,()=>$('bus-doors').click()),control('Horn',null,()=>$('bus-horn').click()));}}
  }
  if(blocked!==lastBlocked){release();lastBlocked=blocked;}if(pad.hidden!==blocked)pad.hidden=blocked;
 }
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();update();});window.addEventListener('resize',layout);media.addEventListener('change',layout);new MutationObserver(update).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});layout();setInterval(update,250);
});

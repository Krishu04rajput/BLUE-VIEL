(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    healthFill:$('health-fill'), energyFill:$('energy-fill'), healthText:$('health-text'),
    energyText:$('energy-text'), bossFill:$('boss-fill'), objective:$('objective'),
    message:$('message'), start:$('start-btn'), toast:$('toast'), controls:$('controls')
  };
  const input = {left:false,right:false,keys:new Set()};
  let W=0,H=0,scale=1,last=0,started=false,paused=false,shake=0,toastTimer=0;
  const world = {floor:0,camera:0,particles:[],projectiles:[],effects:[],summons:[],time:0};
  const player = {x:170,y:0,vx:0,vy:0,w:42,h:82,face:1,grounded:false,hp:100,energy:100,anim:'idle',animT:0,attackT:0,combo:0,comboWindow:0,dashT:0,invuln:0,castT:0};
  const boss = {x:820,y:0,w:72,h:112,hp:260,max:260,face:-1,hitT:0,attackT:1.5,phase:0};
  const keys = {a:'left',arrowleft:'left',d:'right',arrowright:'right',space:'jump',w:'jump',j:'attack',q:'dash',e:'chain',r:'burst',f:'summon',g:'ultimate'};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  function resize(){const dpr=Math.min(devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=Math.max(.65,Math.min(1.2,H/760));world.floor=H*.79;player.x=clamp(player.x,35,Math.max(40,W-110));player.y=player.y||world.floor-player.h;boss.x=clamp(Math.max(player.x+145,W*.72),W*.48,Math.max(W*.48,W-100));boss.y=world.floor-boss.h;}
  new ResizeObserver(resize).observe(canvas); resize();
  function toast(text){ui.toast.textContent=text;ui.toast.style.opacity=1;toastTimer=1.5;}
  function particle(x,y,color,size=3,life=.5,vx=rand(-90,90),vy=rand(-100,40)){world.particles.push({x,y,vx,vy,size,life,max:life,color});}
  function burstParticles(x,y,color,n=18){for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=rand(40,230);particle(x,y,color,rand(2,5),rand(.25,.7),Math.cos(a)*s,Math.sin(a)*s);}}
  function effect(type,x,y,dir=1){world.effects.push({type,x,y,dir,t:0,life:type==='ultimate'?1.3:.55});}
  function spend(n){if(player.energy<n){toast('NOT ENOUGH VEIL ENERGY');return false;}player.energy-=n;return true;}
  function damageBoss(amount){if(boss.hp<=0)return;boss.hp=Math.max(0,boss.hp-amount);boss.hitT=.18;shake=5;burstParticles(boss.x+boss.w/2,boss.y+45,'#79dfff',9);if(boss.hp===0){ui.objective.textContent='The seal is broken';toast('THE SENTINEL HAS FALLEN');}}
  function move(dir){player.face=dir;player.vx=dir*250; if(player.grounded)player.anim='run';}
  function attack(){if(player.attackT>0)return;player.attackT=.34;player.combo=player.comboWindow>0?(player.combo%3)+1:1;player.comboWindow=.8;player.anim='attack';player.vx=player.face*95;effect('slash',player.x+player.w/2+player.face*32,player.y+38,player.face);if(Math.abs((player.x+player.w/2)-(boss.x+boss.w/2))<145){damageBoss([13,17,24][player.combo-1]);}}
  function ability(name){
    if(!started||paused)return;
    if(name==='jump'){if(player.grounded){player.vy=-590;player.grounded=false;player.anim='jump';}}
    if(name==='attack')attack();
    if(name==='dash'){if(!spend(18))return;player.dashT=.22;player.invuln=.25;player.vx=player.face*760;effect('dash',player.x,player.y+45,player.face);toast('VEIL DASH');}
    if(name==='chain'){if(!spend(24))return;player.castT=.35;effect('chain',player.x+player.w/2,player.y+38,player.face);if(Math.abs((player.x+player.w/2)-(boss.x+boss.w/2))<470)damageBoss(28);else toast('CHAIN MISSED');}
    if(name==='burst'){if(!spend(32))return;effect('burst',player.x+player.w/2,world.floor-20,player.face);burstParticles(player.x+player.w/2,world.floor-25,'#65d9ff',35);if(Math.abs((player.x+player.w/2)-(boss.x+boss.w/2))<250)damageBoss(42);toast('ABYSSAL BURST');}
    if(name==='summon'){if(!spend(38))return;world.summons.push({x:player.x+player.face*60,y:world.floor-72,t:0,life:5});effect('summon',player.x+player.face*60,world.floor-55,player.face);toast('WRAITH CALLED');}
    if(name==='ultimate'){if(!spend(100))return;effect('ultimate',player.x+player.w/2,world.floor,player.face);shake=15;damageBoss(95);toast('ECLIPSE: VEIL UNBOUND');}
  }
  function keyDown(e){let k=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup'].includes(k))e.preventDefault();if(k==='escape'){paused=!paused;toast(paused?'PAUSED':'RESUMED');return;}if(keys[k]){let action=keys[k];if(action==='left'||action==='right'){input[action]=true;}else if(!e.repeat)ability(action);}}
  function keyUp(e){let k=e.key.toLowerCase();if(keys[k]==='left'||keys[k]==='right')input[keys[k]]=false;}
  addEventListener('keydown',keyDown);addEventListener('keyup',keyUp);
  document.querySelectorAll('[data-hold]').forEach(b=>{const a=b.dataset.hold;b.addEventListener('pointerdown',e=>{e.preventDefault();input[a]=true;b.classList.add('active');});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>{input[a]=false;b.classList.remove('active');}));});
  document.querySelectorAll('[data-press]').forEach(b=>{const a=b.dataset.press;b.addEventListener('pointerdown',e=>{e.preventDefault();ability(a);b.classList.add('active');setTimeout(()=>b.classList.remove('active'),130);});});
  ui.start.addEventListener('click',()=>{started=true;ui.message.classList.add('hidden');toast('THE VEIL REMEMBERS');});
  function update(dt){
    world.time+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.style.opacity=0;}
    if(!started||paused)return;
    player.animT+=dt;player.attackT=Math.max(0,player.attackT-dt);player.comboWindow=Math.max(0,player.comboWindow-dt);player.dashT=Math.max(0,player.dashT-dt);player.invuln=Math.max(0,player.invuln-dt);player.castT=Math.max(0,player.castT-dt);
    if(player.attackT===0&&player.grounded)player.anim=(input.left||input.right)?'run':'idle';
    if(player.dashT<=0){player.vx*=Math.pow(.0008,dt);if(input.left)move(-1);else if(input.right)move(1);}
    player.vy+=1450*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;
    player.x=clamp(player.x,45,Math.max(50,W-180));if(player.y+player.h>=world.floor){player.y=world.floor-player.h;player.vy=0;player.grounded=true;}else player.grounded=false;
    if(!player.grounded&&player.anim!=='attack')player.anim=player.vy<0?'jump':'fall';
    if(player.energy<100)player.energy=Math.min(100,player.energy+7*dt);
    boss.face=boss.x>player.x? -1:1;boss.attackT-=dt;if(boss.attackT<=0&&boss.hp>0){boss.attackT=rand(2.1,3.2);if(Math.abs(boss.x-player.x)<220){if(player.invuln<=0){player.hp=Math.max(0,player.hp-10);shake=8;toast('SENTINEL STRIKE');}}else{world.projectiles.push({x:boss.x,y:boss.y+50,vx:-boss.face*260,life:2});}}
    world.projectiles.forEach(p=>{p.x+=p.vx*dt;p.life-=dt;if(Math.abs(p.x-(player.x+20))<25&&p.life>0&&player.invuln<=0){player.hp=Math.max(0,player.hp-8);p.life=0;burstParticles(p.x,p.y,'#b48aff',8);}});
    world.projectiles=world.projectiles.filter(p=>p.life>0);
    world.summons.forEach(s=>{s.t+=dt;s.life-=dt;if(s.life>0&&Math.random()<dt*2&&Math.abs(s.x-boss.x)<500)damageBoss(2);});world.summons=world.summons.filter(s=>s.life>0);
    world.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;});world.particles=world.particles.filter(p=>p.life>0);
    world.effects.forEach(e=>e.t+=dt);world.effects=world.effects.filter(e=>e.t<e.life);
    boss.hitT=Math.max(0,boss.hitT-dt);
    ui.healthFill.style.width=player.hp+'%';ui.energyFill.style.width=player.energy+'%';ui.healthText.textContent=Math.ceil(player.hp)+' / 100';ui.energyText.textContent=Math.ceil(player.energy)+' / 100';ui.bossFill.style.width=(boss.hp/boss.max*100)+'%';
    if(player.hp<=0){started=false;ui.message.classList.remove('hidden');ui.message.querySelector('h1').textContent='THE VEIL CLAIMS YOU';ui.message.querySelector('p').textContent='The court is patient. Rise and try again.';ui.start.textContent='RISE AGAIN';player.hp=100;player.energy=100;boss.hp=boss.max;player.x=170;}
  }
  function polygon(points,fill,stroke=null){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#08101e');g.addColorStop(.58,'#101d30');g.addColorStop(1,'#080c15');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const moonX=W*.72,moonY=H*.27;let mg=ctx.createRadialGradient(moonX,moonY,5,moonX,moonY,125);mg.addColorStop(0,'rgba(109,195,255,.23)');mg.addColorStop(1,'rgba(51,100,158,0)');ctx.fillStyle=mg;ctx.fillRect(moonX-130,moonY-130,260,260);
    ctx.fillStyle='rgba(172,216,255,.55)';ctx.beginPath();ctx.arc(moonX,moonY,31,0,Math.PI*2);ctx.fill();
    for(let layer=0;layer<3;layer++){let y=H*(.49+layer*.095);ctx.fillStyle=['#111d30','#0c1727','#0a1220'][layer];ctx.beginPath();ctx.moveTo(0,y+90);for(let x=0;x<=W+80;x+=80){let yy=y+Math.sin(x*.012+layer*3)*18+rand(-3,3);ctx.lineTo(x,yy);ctx.lineTo(x+25,yy-70-layer*12);ctx.lineTo(x+50,yy+5);}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();}
    // broken gothic pillars
    for(let i=0;i<8;i++){let x=((i*190-world.time*7)%(W+190)+W+190)%(W+190)-50;let h=H*(.22+(i%3)*.055);ctx.fillStyle='#17263b';ctx.fillRect(x,H*.48-h,24,h);polygon([[x-12,H*.48-h],[x+12,H*.48-h-22],[x+36,H*.48-h]],'#213651');ctx.fillStyle='rgba(93,174,228,.12)';ctx.fillRect(x+4,H*.48-h+8,2,h-10);}
    // distant veil motes
    for(let i=0;i<32;i++){let x=(i*97+world.time*13)%(W+20),y=(i*53+Math.sin(world.time+i)*15)%(H*.7);ctx.fillStyle='rgba(112,192,255,.25)';ctx.fillRect(x,y,2,2);}
    let fg=ctx.createLinearGradient(0,world.floor,0,H);fg.addColorStop(0,'#18263a');fg.addColorStop(1,'#080d17');ctx.fillStyle=fg;ctx.fillRect(0,world.floor,W,H-world.floor);
    ctx.strokeStyle='rgba(113,190,241,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,world.floor);ctx.lineTo(W,world.floor);ctx.stroke();
    for(let x=0;x<W;x+=70){ctx.strokeStyle='rgba(93,155,204,.08)';ctx.beginPath();ctx.moveTo(x,world.floor);ctx.lineTo(x-30,H);ctx.stroke();}
  }
  function drawKael(){
    const x=player.x,y=player.y,w=player.w,h=player.h;let t=player.animT,run=player.anim==='run',attack=player.anim==='attack';
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(player.face,1);
    // shadow pool
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(0,h/2+2,34,8,0,0,Math.PI*2);ctx.fill();
    let bob=player.grounded?Math.sin(t*(run?17:3))*(run?3:1.4):0;ctx.translate(0,bob);
    // trailing cloak
    polygon([[-9,-23],[-24,-10],[-31,27],[-18,35],[-5,15],[8,34],[21,27],[15,-17]],'#101b2b','#3c6688');
    polygon([[-13,-17],[-22,6],[-15,28],[-7,13]],'#27435e');
    // legs
    ctx.strokeStyle='#a6c4db';ctx.lineWidth=7;ctx.lineCap='round';let stride=run?Math.sin(t*17)*9:0;
    ctx.beginPath();ctx.moveTo(-8,20);ctx.lineTo(-10+stride,39);ctx.moveTo(8,20);ctx.lineTo(11-stride,39);ctx.stroke();
    ctx.strokeStyle='#18283c';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-10+stride,39);ctx.lineTo(-16+stride,40);ctx.moveTo(11-stride,39);ctx.lineTo(17-stride,40);ctx.stroke();
    // torso and armor
    polygon([[-14,-28],[13,-28],[18,13],[8,23],[-12,18]],'#294763','#7fb6d7');
    polygon([[-5,-23],[4,-22],[10,12],[0,18],[-7,8]],'#0b1727');
    // arm / attack extension
    ctx.strokeStyle='#b6d2e7';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-12,-20);ctx.lineTo(-20,-3);ctx.moveTo(12,-20);ctx.lineTo(attack?43:18,attack?-5:0);ctx.stroke();
    // head and hair
    ctx.fillStyle='#d5e6f1';ctx.beginPath();ctx.ellipse(0,-39,12,15,0,0,Math.PI*2);ctx.fill();
    polygon([[-13,-43],[-9,-57],[1,-59],[12,-51],[13,-39],[4,-46],[-3,-41],[-9,-34]],'#101a2a','#42627c');
    ctx.fillStyle='#7ce0ff';ctx.fillRect(4,-40,5,2);
    // sigil
    ctx.strokeStyle='#71d8ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-1,-13);ctx.lineTo(3,-5);ctx.lineTo(-2,2);ctx.stroke();
    if(player.invuln>0){ctx.strokeStyle='rgba(106,220,255,.65)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,30,49,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  function drawBoss(){
    const x=boss.x,y=boss.y;ctx.save();ctx.translate(x+boss.w/2,y+boss.h/2);ctx.scale(boss.face,1);
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(0,boss.h/2+4,49,10,0,0,Math.PI*2);ctx.fill();
    let glow=boss.hitT>0?'#d7f7ff':'#8b79e8';ctx.shadowBlur=22;ctx.shadowColor=glow;
    polygon([[-24,-35],[-38,-8],[-30,47],[-9,55],[0,31],[15,53],[35,43],[30,-25],[12,-45]],boss.hitT>0?'#d4e9f2':'#1c2440','#8278c8');
    ctx.shadowBlur=0;polygon([[-18,-45],[-15,-67],[-2,-78],[15,-66],[20,-44],[0,-31]],'#11182a','#a8a0e8');
    ctx.fillStyle='#b9eaff';ctx.fillRect(-10,-48,7,3);ctx.fillRect(7,-48,7,3);
    polygon([[-20,-64],[-35,-82],[-26,-50]],'#444b78');polygon([[17,-65],[35,-83],[28,-48]],'#444b78');
    for(let i=0;i<4;i++){ctx.strokeStyle='rgba(147,125,255,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-20+i*12,-12);ctx.lineTo(-28+i*15,22);ctx.stroke();}
    ctx.restore();
  }
  function drawEffects(){
    world.effects.forEach(e=>{let p=e.t/e.life;ctx.save();ctx.globalAlpha=1-p;
      if(e.type==='slash'){ctx.translate(e.x,e.y);ctx.scale(e.dir,1);ctx.strokeStyle='#b9edff';ctx.lineWidth=5*(1-p);ctx.shadowBlur=18;ctx.shadowColor='#58cfff';ctx.beginPath();ctx.arc(0,0,32+p*25,-1.1,.9);ctx.stroke();}
      if(e.type==='dash'){ctx.fillStyle='rgba(90,206,255,.3)';ctx.fillRect(e.x-20-p*100,e.y-20,100,55);for(let i=0;i<5;i++){ctx.strokeStyle='rgba(126,222,255,.5)';ctx.beginPath();ctx.moveTo(e.x-i*16,e.y-30);ctx.lineTo(e.x-i*26-70,e.y+35);ctx.stroke();}}
      if(e.type==='chain'){ctx.strokeStyle='#72dfff';ctx.lineWidth=4;ctx.shadowBlur=16;ctx.shadowColor='#55cfff';ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.bezierCurveTo(e.x+e.dir*100,e.y-70,e.x+e.dir*220,e.y+40,e.x+e.dir*410,e.y+10);ctx.stroke();}
      if(e.type==='burst'||e.type==='ultimate'){let r=(e.type==='ultimate'?70:25)+p*(e.type==='ultimate'?420:180);ctx.strokeStyle=e.type==='ultimate'?'#b2a2ff':'#6bdfff';ctx.lineWidth=8*(1-p)+1;ctx.shadowBlur=24;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.arc(e.x,e.y,r,Math.PI,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(e.x,e.y,r*.75,r*.22,0,0,Math.PI*2);ctx.stroke();}
      if(e.type==='summon'){ctx.strokeStyle='#7ddfff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,18+p*30,0,Math.PI*2);ctx.stroke();}
      ctx.restore();});
    world.projectiles.forEach(p=>{ctx.fillStyle='#b38cff';ctx.shadowBlur=18;ctx.shadowColor='#9d7aff';ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;});
    world.summons.forEach(s=>{ctx.globalAlpha=.7;ctx.fillStyle='#83dfff';ctx.shadowBlur=22;ctx.shadowColor='#55caff';ctx.beginPath();ctx.ellipse(s.x,s.y,15,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101a30';ctx.fillRect(s.x-7,s.y-7,4,3);ctx.fillRect(s.x+4,s.y-7,4,3);ctx.globalAlpha=1;ctx.shadowBlur=0;});
    world.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);});ctx.globalAlpha=1;
  }
  function render(){
    ctx.save();if(shake>0){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake*=.86;if(shake<.2)shake=0;}
    drawBackground();drawEffects();drawBoss();drawKael();
    // foreground grass / stone silhouettes
    ctx.fillStyle='rgba(3,7,13,.55)';for(let i=0;i<16;i++){let x=(i*89-world.time*12)%(W+80);ctx.fillRect(x,world.floor+rand(18,28),rand(12,35),3);}
    ctx.restore();
  }
  function frame(now){let dt=Math.min((now-last)/1000||0,.033);last=now;update(dt);render();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  // Keep the canvas responsive and stop stuck movement when the tab loses focus.
  addEventListener('blur',()=>{input.left=input.right=false;});
})();

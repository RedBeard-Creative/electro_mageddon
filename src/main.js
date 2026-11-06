import './style.css';
import * as THREE from 'three';
import {ROOM,BAG,ROBOT,OBSTACLES,FLASHLIGHT,newGame,look,move,jump,punch,update,bagInRange,robotInRange,flashlightToggle} from './gameplay.js';
import {createCharacterActor} from './characters.js';
import {createXbotViewHand} from './hands.js';

// ELECTROMAGEDDON / PROTOTYPE 01 — one small, intentionally playable room.
const $ = id => document.getElementById(id);
const canvas=$('world'),status=$('flash-status'),hits=$('hit-count'),target=$('target');
const message=$('message'),flash=$('hit-flash'),lockButton=$('lock-mouse');
const state=newGame(),pressed=new Set();
let renderer,scene,camera,clock,pivot,torch,beam,rigLeft,rigRight,impactGlow;
let playerActor=null,robotActor=null,inspectCharacter=false;
let flashTimer=0,noticeTimeout=0,lastMouse=null;
const MAT={
 floor:new THREE.MeshStandardMaterial({color:0x2b3840,roughness:.89,metalness:.16}),
 wall:new THREE.MeshStandardMaterial({color:0x192831,roughness:.76,metalness:.31}),
 black:new THREE.MeshStandardMaterial({color:0x0a131a,roughness:.56,metalness:.75}),
 graphite:new THREE.MeshStandardMaterial({color:0x23343e,roughness:.54,metalness:.81}),
 chrome:new THREE.MeshStandardMaterial({color:0x788e9a,roughness:.22,metalness:.9}),
 steel:new THREE.MeshStandardMaterial({color:0x596b73,roughness:.39,metalness:.83}),
 amber:new THREE.MeshStandardMaterial({color:0xffb35e,roughness:.35,metalness:.49,emissive:0x8e3b0e,emissiveIntensity:.35}),
 teal:new THREE.MeshStandardMaterial({color:0x79d4e5,roughness:.23,metalness:.38,emissive:0x2a879e,emissiveIntensity:.85}),
 leather:new THREE.MeshStandardMaterial({color:0x54232c,roughness:.96,metalness:0}),
 leatherEdge:new THREE.MeshStandardMaterial({color:0x190d13,roughness:.86,metalness:.07}),
 crate:new THREE.MeshStandardMaterial({color:0x394951,roughness:.81,metalness:.55}),
 cable:new THREE.MeshStandardMaterial({color:0x17232a,roughness:.9,metalness:.15})
};
function box(parent,w,h,d,material,x=0,y=0,z=0){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh
}
function cylinder(parent,top,bottom,length,material,x=0,y=0,z=0,sides=20){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,length,sides),material);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh
}
function ball(parent,r,material,x=0,y=0,z=0){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),material);
 mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh
}
function bar(parent,start,end,radius,material){
 const length=start.distanceTo(end);
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,10),material);
 mesh.position.copy(start).add(end).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());
 mesh.castShadow=true;parent.add(mesh);return mesh
}
function seededRandom(){let x=1539393;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function industrialTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;
 const ctx=c.getContext('2d');ctx.fillStyle='#273038';ctx.fillRect(0,0,512,512);
 const rand=seededRandom();
 for(let i=0;i<5200;i++){const x=rand()*512,y=rand()*512;ctx.fillStyle=rand()>.5?'#b2c0c2':'#080d14';ctx.globalAlpha=.015+rand()*.075;ctx.fillRect(x,y,1+rand()*4,1+rand()*4)}
 ctx.globalAlpha=1;ctx.strokeStyle='#101c23';ctx.lineWidth=4;
 for(let x=0;x<=512;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke()}
 for(let y=0;y<=512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke()}
 for(let y=0;y<512;y+=128)for(let x=0;x<512;x+=128){
   ctx.fillStyle='#60737b';ctx.globalAlpha=.45;
   for(const [dx,dy] of [[8,8],[120,8],[8,120],[120,120]]){ctx.beginPath();ctx.arc(x+dx,y+dy,2,0,Math.PI*2);ctx.fill()}
 }
 ctx.globalAlpha=1;
 const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex
}
function labelTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=360;
 const ctx=c.getContext('2d');ctx.fillStyle='#401921';ctx.fillRect(0,0,512,360);
 ctx.strokeStyle='#c79d8e';ctx.lineWidth=8;ctx.strokeRect(20,20,472,320);
 ctx.fillStyle='#ecd4b7';ctx.textAlign='center';
 ctx.font='700 76px Arial';ctx.fillText('TRAINER',256,119);
 ctx.font='900 146px Arial';ctx.fillText('01',256,272);
 ctx.font='600 24px monospace';ctx.fillText('HEAVY DUTY // 75 KG',256,316);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex
}
function buildRoom(){
 const map=industrialTexture();
 MAT.floor.map=map;MAT.floor.needsUpdate=true;
 // The floor and surrounding walls are genuine 3D geometry, not a flat skybox.
 const floor=box(scene,24,.24,24,MAT.floor,0,-.18,0);floor.receiveShadow=true;
 box(scene,24,.3,24,MAT.black,0,7.7,0);
 for(const x of [-12,12]){
  box(scene,.5,7.8,24,MAT.wall,x,3.7,0);
  for(let z=-11;z<=11;z+=2.4)box(scene,.17,7.3,.18,MAT.steel,x>0?11.68:-11.68,3.6,z);
 }
 for(const z of [-12,12]){
  box(scene,24,7.8,.5,MAT.wall,0,3.7,z);
  for(let x=-10.8;x<=10.8;x+=2.4)box(scene,.15,7.1,.2,MAT.steel,x,3.5,z>0?11.68:-11.68);
 }
 for(const x of [-10,10])for(const z of [-10,10]){
  box(scene,.6,7.2,.6,MAT.graphite,x,3.5,z);
  for(const y of [1.4,4.8])box(scene,.8,.14,.8,MAT.steel,x,y,z)
 }
 for(const z of [-8,-1,6]){
  box(scene,23,.15,.32,MAT.graphite,0,7.0,z);
  box(scene,17,.045,.09,MAT.teal,0,6.87,z);
 }
 // Industrial conduits and floor hazard markings.
 for(const x of [-10.8,10.8]){
  bar(scene,new THREE.Vector3(x,2.5,-10.5),new THREE.Vector3(x,2.5,10.5),.11,MAT.steel);
  bar(scene,new THREE.Vector3(x,3.3,-10.5),new THREE.Vector3(x,3.3,10.5),.075,MAT.cable);
 }
 for(let i=-9;i<=9;i+=3){
  box(scene,.12,.012,.85,MAT.amber,i,.005,-8.5);
  box(scene,.12,.012,.85,MAT.amber,i,.005,8.5);
 }
 for(const o of OBSTACLES)createCargo(o.x,o.z);
 // Bag podium circle indicates the punching area without a bright UI marker.
 const circle=new THREE.Mesh(new THREE.RingGeometry(.95,1.0,64),MAT.amber);
 circle.rotation.x=-Math.PI/2;circle.position.set(BAG.x,.012,BAG.z);
 circle.material=MAT.amber.clone();circle.material.transparent=true;circle.material.opacity=.38;
 scene.add(circle);
 const ceilingLamp=new THREE.PointLight(0xff8b55,5.5,8,2);
 ceilingLamp.position.set(-7.6,5.1,-6.5);scene.add(ceilingLamp);
 const sideLamp=new THREE.PointLight(0x5bb9e0,4.0,8,2);
 sideLamp.position.set(8,4.8,3.3);scene.add(sideLamp);
 const lampSphere=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),
  new THREE.MeshBasicMaterial({color:0xffab66}));lampSphere.position.copy(ceilingLamp.position);scene.add(lampSphere);
}
function createCargo(x,z){
 const cargo=new THREE.Group();cargo.position.set(x,0,z);scene.add(cargo);
 const h=x>0?1.75:1.45;
 box(cargo,1.65,h,1.6,MAT.crate,0,h*.5,0);
 for(const sx of [-.79,.79])for(const sz of [-.77,.77])box(cargo,.08,h+.04,.09,MAT.chrome,sx,h*.5,sz);
 for(const sy of [.16,h-.16])box(cargo,1.72,.08,1.68,MAT.graphite,0,sy,0);
 const inset=box(cargo,.97,.62,.025,MAT.black,0,h*.58,.823);
 inset.castShadow=false;
 box(cargo,.76,.045,.03,MAT.amber,0,h*.58+.17,.85);
}
function createPunchingBag(){
 pivot=new THREE.Group();pivot.position.set(BAG.x,3.88,BAG.z);scene.add(pivot);
 // Ceiling bracket and mounting point remain stationary.
 // A real support cable connects the training bag to the ceiling.
 box(scene,.9,.20,.9,MAT.graphite,BAG.x,7.45,BAG.z);
 bar(scene,new THREE.Vector3(BAG.x,4.08,BAG.z),new THREE.Vector3(BAG.x,7.38,BAG.z),.085,MAT.steel);
 for(const y of [4.32,5.3,6.3,7.12])cylinder(scene,.19,.19,.12,MAT.graphite,BAG.x,y,BAG.z,12);
 cylinder(scene,.4,.4,.17,MAT.graphite,BAG.x,4.08,BAG.z);
 box(scene,.77,.13,.77,MAT.steel,BAG.x,4.21,BAG.z);
 // Moving chain links under the pivot.
 for(let i=0;i<9;i++){
  const link=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,7,14),MAT.chrome);
  link.position.set(0,-.13-i*.12,0);
  link.rotation.y=i%2?Math.PI/2:0;link.scale.y=1.45;link.castShadow=true;pivot.add(link);
 }
 const bagGroup=new THREE.Group();bagGroup.position.y=-2.15;pivot.add(bagGroup);
 const bagBody=cylinder(bagGroup,.47,.43,1.86,MAT.leather,0,0,0,36);
 bagBody.geometry.computeVertexNormals();
 cylinder(bagGroup,.485,.485,.12,MAT.leatherEdge,0,.9,0,36);
 cylinder(bagGroup,.46,.44,.1,MAT.leatherEdge,0,-.91,0,36);
 for(let i=0;i<4;i++){
  const strap=new THREE.Mesh(new THREE.BoxGeometry(.09,.5,.035),MAT.leatherEdge);
  const a=i*Math.PI/2;strap.position.set(Math.sin(a)*.45,1.05,Math.cos(a)*.45);
  strap.rotation.y=a;bagGroup.add(strap);
 }
 // Leather panel seams, physically raised ring stitching.
 for(const y of [-.79,.76]){
  const loop=new THREE.Mesh(new THREE.TorusGeometry(.452,.012,7,48),MAT.steel);
  loop.rotation.x=Math.PI/2;loop.position.y=y;bagGroup.add(loop)
 }
 for(const a of [0,Math.PI]){
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.02,1.55,.024),MAT.leatherEdge);
  seam.position.set(Math.sin(a)*.45,0,Math.cos(a)*.45);
  seam.rotation.y=a;bagGroup.add(seam);
 }
 const patch=new THREE.Mesh(new THREE.PlaneGeometry(.68,.53),
  new THREE.MeshStandardMaterial({map:labelTexture(),roughness:1,transparent:false}));
 patch.position.set(0,.02,.463);patch.castShadow=false;bagGroup.add(patch);
 impactGlow=new THREE.PointLight(0xffba6b,0,2.8);
 impactGlow.position.set(0,-2.05,0);pivot.add(impactGlow);
 return bagBody
}
function attachFlashlight(){
 // Mount the torch in the same articulated left hand that grasps tools.
 // Its beam moves subtly with the player's hands, rather than floating.
 const holder=rigLeft.root;
 torch=new THREE.SpotLight(0xe2f4ff,FLASHLIGHT.intensity,FLASHLIGHT.distance,
  FLASHLIGHT.angle,FLASHLIGHT.penumbra,FLASHLIGHT.decay);
 torch.position.set(-.014,-.075,-.74);
 torch.target.position.set(-.014,-.07,-9.4);
 torch.castShadow=true;torch.shadow.mapSize.set(768,768);torch.shadow.bias=-.00015;
 torch.shadow.camera.near=.13;torch.shadow.camera.far=35;
 holder.add(torch,torch.target);
 const cone=new THREE.CylinderGeometry(FLASHLIGHT.beamRadius,.02,FLASHLIGHT.beamLength,40,1,true);
 cone.rotateX(-Math.PI/2);
 beam=new THREE.Mesh(cone,new THREE.MeshBasicMaterial({
  color:0xb4def2,transparent:true,opacity:FLASHLIGHT.beamOpacity,side:THREE.BackSide,
  depthWrite:false,blending:THREE.AdditiveBlending,fog:false
 }));
 beam.position.set(-.014,-.075,-.74-FLASHLIGHT.beamLength/2);
 beam.renderOrder=7;holder.add(beam);
 const body=cylinder(holder,.066,.075,.27,MAT.graphite,-.014,-.077,-.60,16);
 body.rotation.x=Math.PI/2;body.castShadow=false;
 const lens=cylinder(holder,.078,.078,.028,MAT.teal,-.014,-.077,-.755,16);
 lens.rotation.x=Math.PI/2;lens.castShadow=false;
}
function announce(str){message.textContent=str}
function playPunchSound(hit){
 try{
  const context=window.__electroAudio ??= new (window.AudioContext||window.webkitAudioContext)();
  if(context.state==='suspended')context.resume();
  const osc=context.createOscillator(),gain=context.createGain();
  osc.type=hit?'triangle':'sawtooth';
  osc.frequency.setValueAtTime(hit?146:92,context.currentTime);
  osc.frequency.exponentialRampToValueAtTime(hit?66:48,context.currentTime+.12);
  gain.gain.setValueAtTime(.06,context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.18);
  osc.connect(gain);gain.connect(context.destination);
  osc.start();osc.stop(context.currentTime+.19)
 }catch(e){/* Audio is optional; never block combat. */}
}
function tryPunch(){
 const outcome=punch(state);
 if(!outcome.performed)return;
 playPunchSound(outcome.hit);
 if(outcome.hit){
  hits.textContent=String(state.hits).padStart(2,'0');
  flashTimer=.19;flash.style.opacity='.7';
  if(outcome.target==='robot'){
    announce('DIRECT HIT · AETHER-02 STAGGERED · '+state.robot.health+'/'+ROBOT.maxHealth+' ARMOR');
  }else{
    announce('DIRECT HIT! Training bag is swinging.');impactGlow.intensity=3.8;
  }
 }else{
  announce('Move close to AETHER-02, face it, and punch with F.');
 }
}
function handleMouse(e){
 if(document.pointerLockElement===canvas){
  look(state,e.movementX||0,e.movementY||0);return
 }
 // Free-mouse look — no click and no pointer lock are needed to steer.
 if(lastMouse){
   look(state,e.clientX-lastMouse.x,e.clientY-lastMouse.y)
 }
 lastMouse={x:e.clientX,y:e.clientY};
}
function bindInput(){
 const navigation=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','KeyW','KeyA','KeyS','KeyD']);
 window.addEventListener('keydown',e=>{
  if(navigation.has(e.code)||['KeyF','KeyJ','KeyL','KeyV','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
  pressed.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyF')tryPunch();
  if(e.code==='Space'||e.code==='KeyJ'){
    if(jump(state))announce('Jump activated — tap Space again once you land.');
  }
  if(e.code==='KeyV'){
    inspectCharacter=!inspectCharacter;
    if(playerActor)playerActor.setFirstPersonClip(!inspectCharacter);
    announce(inspectCharacter?'Character inspection view. Press V for first person.':'First-person view restored.');
  }
  if(e.code==='KeyL'){
    const enabled=flashlightToggle(state);
    torch.visible=enabled;beam.visible=enabled;status.textContent=enabled?'LIGHT ON':'LIGHT OFF';
    announce(enabled?'Flashlight activated.':'Flashlight disabled. Press L to turn it back on.')
  }
 });
 window.addEventListener('keyup',e=>pressed.delete(e.code));
 window.addEventListener('blur',()=>{pressed.clear();lastMouse=null});
 window.addEventListener('mousemove',handleMouse);
 document.addEventListener('mouseleave',()=>lastMouse=null);
 document.addEventListener('pointerlockchange',()=>{
  lockButton.textContent=document.pointerLockElement===canvas?'UNLOCK [ESC]':'LOCK MOUSE';
  lastMouse=null;
 });
 lockButton.addEventListener('click',async()=>{
  try{
    if(document.pointerLockElement===canvas)await document.exitPointerLock();
    else await canvas.requestPointerLock();
  }catch(e){announce('Pointer lock unavailable. Free-mouse turning still works.')}
 });
 $('punch').addEventListener('click',tryPunch);
 canvas.addEventListener('pointerdown',e=>{if(e.button===0)tryPunch()});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 window.addEventListener('resize',resize);
}
function resize(){
 if(!renderer||!camera)return;
 camera.aspect=window.innerWidth/Math.max(1,window.innerHeight);
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth,window.innerHeight,false);
}
function animate(){
 const dt=Math.min(clock.getDelta(),.045);
 const lr=(pressed.has('ArrowRight')||pressed.has('KeyD')?1:0)-(pressed.has('ArrowLeft')||pressed.has('KeyA')?1:0);
 const fb=(pressed.has('ArrowUp')||pressed.has('KeyW')?1:0)-(pressed.has('ArrowDown')||pressed.has('KeyS')?1:0);
 const run=pressed.has('ShiftLeft')||pressed.has('ShiftRight');
 move(state,lr,fb,dt,run);
 update(state,dt);
 const cameraY=1.69+state.jumpY+(state.grounded&&state.isMoving?Math.sin(state.walkPhase*2)*.018:Math.sin(state.time*1.6)*.006);
 if(inspectCharacter){
   // Optional third-person preview, while movement always stays view-relative.
   const fx=Math.sin(state.yaw),fz=-Math.cos(state.yaw);
   camera.position.set(state.x-fx*3.35,2.30+state.jumpY,state.z-fz*3.35);
   camera.lookAt(state.x,1.24+state.jumpY,state.z);
 }else{
   camera.position.set(state.x,cameraY,state.z);
   camera.rotation.order='YXZ';
   camera.rotation.set(state.pitch,state.yaw,0);
 }
 const thrust=state.punchAnim>0?Math.sin(Math.PI*(1-state.punchAnim/.33)):0;
 const bob=state.isMoving?Math.sin(state.walkPhase)*.011:Math.sin(state.time*1.2)*.004;
 for(const [hand,side] of [[rigLeft,-1],[rigRight,1]]){
  const punching=state.punchArm===(side===-1?'left':'right');
  const v=punching?thrust:0;
  hand.setGrip(side===-1&&state.flashlight?'hold':'ready');
  hand.update(dt,v>.04);
  const arm=hand.root;
  arm.visible=!inspectCharacter;
  arm.position.set(side*.42-v*side*.21,-.46+v*.11+bob*(side>0?1:-1),-.69-v*.79);
  arm.rotation.set(-.10-v*.27,side*.08-v*side*.12,side*.02-v*side*.025);
 }
 if(playerActor){
  playerActor.root.position.set(state.x,state.jumpY,state.z);
  playerActor.root.rotation.y=Math.PI-state.yaw;
  playerActor.update(dt,state.isMoving&&state.grounded,state.time,0,false,run);
 }
 if(robotActor){
  const bot=state.robot;
  $('ai-mode').textContent=bot.behavior==='chase'?'AI PURSUIT':'AI PATROL';
  robotActor.root.position.set(bot.x,0,bot.z);
  robotActor.root.rotation.y=Math.PI-bot.yaw;
  // A small visual recoil complements the physical backwards movement.
  robotActor.root.rotation.x=bot.stagger>0?-.13*(bot.stagger/ROBOT.staggerSeconds):0;
  robotActor.root.rotation.z=bot.turning?-.045*bot.turnAmount*Math.sign(bot.turnDirection||1):0;
  robotActor.update(dt,bot.walking||bot.turning,state.time,
   bot.hitFlash>0?Math.min(1,bot.hitFlash/ROBOT.hitFlashSeconds+.15):0,
   bot.stagger>0||bot.downTimer>0,false,bot.turning);
 }
 if(pivot){pivot.rotation.x=state.bagTiltX;pivot.rotation.z=state.bagTiltZ}
 if(flashTimer>0){flashTimer-=dt;if(flashTimer<=0)flash.style.opacity='0'}
 impactGlow.intensity=Math.max(0,impactGlow.intensity-dt*15);
 const robotTarget=robotInRange(state),bagTarget=bagInRange(state);
 target.textContent=robotTarget?'[ F ] PUNCH AETHER-02':bagTarget?'[ F ] PUNCH BAG':'';
 $('crosshair').classList.toggle('ready',robotTarget||bagTarget);
 renderer.render(scene,camera);
}
function init(){
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.setSize(window.innerWidth,window.innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.5;
  renderer.shadowMap.enabled=true;
  renderer.localClippingEnabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x05090f);
  scene.fog=new THREE.FogExp2(0x05090f,.032);
  scene.add(new THREE.HemisphereLight(0x91b5cb,0x171a24,.18));
  camera=new THREE.PerspectiveCamera(76,window.innerWidth/window.innerHeight,.06,80);
  camera.position.set(state.x,1.69,state.z);
  scene.add(camera);
  buildRoom();createPunchingBag();
  playerActor=createCharacterActor(scene,'player',{onAssetStatus:(role,s)=>{if($('avatar-status'))$('avatar-status').textContent='PLAYER: '+s;}});
  playerActor.setFirstPersonClip(true);
  robotActor=createCharacterActor(scene,'robot',{onAssetStatus:(role,s)=>{if($('robot-status'))$('robot-status').textContent='ENEMY: '+s;}});
  // The target is lit just enough to stand out without brightening the room.
  const robotMarker=new THREE.PointLight(0x7fc9d7,2.3,3.4,2);
  robotMarker.position.set(0,1.50,0);robotActor.root.add(robotMarker);
  rigLeft=createXbotViewHand(camera,-1);rigRight=createXbotViewHand(camera,1);attachFlashlight();
  resize();bindInput();
  clock=new THREE.Clock();
  $('loading').hidden=true;
  announce('Patrol robot walks the room. Space to jump; F to punch; get close and it will chase you.');
  renderer.setAnimationLoop(animate);
 }catch(error){
  console.error('Electromageddon initialization failed:',error);
  $('loading').hidden=true;$('fatal').hidden=false;
  $('fatal-message').textContent=error?.message||String(error);
 }
}
init();

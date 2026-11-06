import './style.css';
import * as THREE from 'three';
import {ROOM,BAG,OBSTACLES,FLASHLIGHT,newGame,look,move,punch,update,bagInRange,flashlightToggle} from './gameplay.js';

// ELECTROMAGEDDON / PROTOTYPE 01 — one small, intentionally playable room.
const $ = id => document.getElementById(id);
const canvas=$('world'),status=$('flash-status'),hits=$('hit-count'),target=$('target');
const message=$('message'),flash=$('hit-flash'),lockButton=$('lock-mouse');
const state=newGame(),pressed=new Set();
let renderer,scene,camera,clock,pivot,torch,beam,rigLeft,rigRight,impactGlow;
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
function makeArm(side){
 // Full 3D mechanical gauntlet. It uses moving 3D pieces rather than a flat image.
 const root=new THREE.Group();camera.add(root);
 const s=side;
 const arm=new THREE.Group();root.add(arm);
 const fore=cylinder(arm,.123,.17,.65,MAT.graphite,0,-.02,-.11,12);
 fore.rotation.x=Math.PI/2;
 const under=cylinder(arm,.09,.10,.54,MAT.black,0,-.065,-.14,12);
 under.rotation.x=Math.PI/2;
 for(const z of [.02,-.22]){
  const brace=box(arm,.32,.15,.12,MAT.steel,0,.065,z);
  brace.rotation.x=-.13;
 }
 // Beveled plates along the armor.
 const plate=box(arm,.25,.05,.42,MAT.chrome,0,.145,-.17);
 plate.rotation.x=-.07;
 const wrist=cylinder(arm,.118,.118,.16,MAT.steel,0,-.04,-.46,12);
 wrist.rotation.x=Math.PI/2;
 const hand=box(arm,.28,.20,.28,MAT.graphite,0,-.04,-.63);
 box(arm,.31,.075,.16,MAT.chrome,0,.04,-.73);
 for(let i=0;i<4;i++){
  const finger=box(arm,.062,.105,.18,i%2?MAT.steel:MAT.graphite,-.105+i*.07,-.082,-.83);
  finger.rotation.x=.14;
 }
 const thumb=box(arm,.09,.1,.19,MAT.steel,s*.18,-.11,-.62);
 thumb.rotation.y=s*.32;
 for(const x of [-.11,.11])box(arm,.027,.06,.37,MAT.teal,x,.13,-.19);
 ball(arm,.06,MAT.amber,0,.13,-.55);
 root.userData={restX:s*.43,restY:-.49,restZ:-.72};
 root.position.set(root.userData.restX,root.userData.restY,root.userData.restZ);
 root.rotation.set(-.10,s*.09,s*.02);
 return root
}
function attachFlashlight(){
 torch=new THREE.SpotLight(0xe2f4ff,FLASHLIGHT.intensity,FLASHLIGHT.distance,FLASHLIGHT.angle,FLASHLIGHT.penumbra,FLASHLIGHT.decay);
 torch.position.set(-.19,-.1,0);
 torch.target.position.set(0,0,-9.5);
 torch.castShadow=true;torch.shadow.mapSize.set(768,768);torch.shadow.bias=-.00015;
 torch.shadow.camera.near=.13;torch.shadow.camera.far=35;
 camera.add(torch,torch.target);
 const cone=new THREE.CylinderGeometry(FLASHLIGHT.beamRadius,.02,FLASHLIGHT.beamLength,40,1,true);
 cone.rotateX(-Math.PI/2);
 beam=new THREE.Mesh(cone,new THREE.MeshBasicMaterial({
  color:0xb4def2,transparent:true,opacity:FLASHLIGHT.beamOpacity,side:THREE.BackSide,
  depthWrite:false,blending:THREE.AdditiveBlending,fog:false
 }));
 beam.position.set(-.10,-.04,-FLASHLIGHT.beamLength/2);
 beam.renderOrder=7;camera.add(beam);
 const frame=box(camera,.14,.12,.29,MAT.graphite,-.19,-.13,-.25);
 frame.castShadow=false;
 const lens=cylinder(camera,.069,.069,.025,MAT.teal,-.19,-.13,-.39,16);
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
  announce('DIRECT HIT! Bag is swinging.');impactGlow.intensity=3.8;
 }else{
  announce('Too far away — face the bag and move closer.');
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
  if(navigation.has(e.code)||['KeyF','KeyL','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
  pressed.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyF'||e.code==='Space')tryPunch();
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
 camera.position.set(state.x,1.69+(state.isMoving?Math.sin(state.walkPhase*2)*.018:Math.sin(state.time*1.6)*.006),state.z);
 camera.rotation.order='YXZ';
 camera.rotation.set(state.pitch,-state.yaw,0);
 const thrust=state.punchAnim>0?Math.sin(Math.PI*(1-state.punchAnim/.33)):0;
 const bob=state.isMoving?Math.sin(state.walkPhase)*.011:Math.sin(state.time*1.2)*.004;
 for(const [arm,side] of [[rigLeft,-1],[rigRight,1]]){
  const v=side>0?thrust:0;
  arm.position.set(side*.43-v*.32,-.49+v*.16+bob*(side>0?1:-1),-.72-v*.69);
  arm.rotation.set(-.10-v*.19,side*.09-v*.25,side*.02-v*.08);
 }
 if(pivot){pivot.rotation.x=state.bagTiltX;pivot.rotation.z=state.bagTiltZ}
 if(flashTimer>0){flashTimer-=dt;if(flashTimer<=0)flash.style.opacity='0'}
 impactGlow.intensity=Math.max(0,impactGlow.intensity-dt*15);
 target.textContent=bagInRange(state)?'[ F ] PUNCH TRAINER 01':'';
 $('crosshair').classList.toggle('ready',bagInRange(state));
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
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x05090f);
  scene.fog=new THREE.FogExp2(0x05090f,.032);
  scene.add(new THREE.HemisphereLight(0x91b5cb,0x171a24,.18));
  camera=new THREE.PerspectiveCamera(76,window.innerWidth/window.innerHeight,.06,80);
  camera.position.set(state.x,1.69,state.z);
  scene.add(camera);
  buildRoom();createPunchingBag();
  rigLeft=makeArm(-1);rigRight=makeArm(1);attachFlashlight();
  resize();bindInput();
  clock=new THREE.Clock();
  $('loading').hidden=true;
  announce('Find the bag in the flashlight beam. Arrow keys to move; F to punch.');
  renderer.setAnimationLoop(animate);
 }catch(error){
  console.error('Electromageddon initialization failed:',error);
  $('loading').hidden=true;$('fatal').hidden=false;
  $('fatal-message').textContent=error?.message||String(error);
 }
}
init();

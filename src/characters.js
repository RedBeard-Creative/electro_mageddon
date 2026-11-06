import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Public reusable rigged character models.
// Xbot: three.js example asset. AETHER-02: RamonLinares/atlas-09 (CC0).
export const CHARACTER_ASSETS=Object.freeze({
 player:{
  name:'XBOT HUMANOID',
  url:'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb',
  height:1.84
 },
 robot:{
  name:'AETHER-02',
  url:'https://raw.githubusercontent.com/RamonLinares/atlas-09/main/public/models/aether-02.glb',
  height:1.91
 }
});

const loader=new GLTFLoader();
const red=new THREE.Color(0xff2a30);
const redGlow=new THREE.Color(0xd31322);

function buildFallback(materialColor=0x647783){
 const root=new THREE.Group();
 const suit=new THREE.MeshStandardMaterial({color:materialColor,roughness:.38,metalness:.77});
 const trim=new THREE.MeshStandardMaterial({color:0x212d39,roughness:.54,metalness:.78});
 const accent=new THREE.MeshStandardMaterial({color:0x8fe4ef,roughness:.22,metalness:.52,emissive:0x2e8c9a,emissiveIntensity:.6});
 function limb(parent,w,h,d,x,y,z,mat=suit){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 const torso=new THREE.Group();torso.position.y=1.26;root.add(torso);
 limb(torso,.57,.71,.33,0,0,0);limb(torso,.42,.2,.37,0,.28,-.02,trim);
 limb(torso,.3,.17,.35,0,.03,.18,accent);
 const head=new THREE.Group();head.position.y=.57;torso.add(head);
 limb(head,.29,.34,.31,0,0,0,trim);
 limb(head,.26,.095,.035,0,.02,.172,accent);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.38,.22,0);torso.add(shoulder);
  limb(shoulder,.22,.48,.23,side*.015,-.23,0);
  limb(shoulder,.18,.15,.22,side*.015,-.49,-.01,trim);
  limb(shoulder,.16,.2,.25,side*.015,-.61,-.02);
  arms.push(shoulder);
  const hip=new THREE.Group();hip.position.set(side*.18,.92,0);root.add(hip);
  limb(hip,.23,.48,.26,0,-.26,0);
  limb(hip,.19,.44,.22,0,-.67,0,trim);
  limb(hip,.24,.17,.42,0,-.91,-.09);
  legs.push(hip);
 }
 const materials=[suit,trim,accent];
 return {root,materials,animateWalk(t,motion){
  const stride=motion?Math.sin(t*7.5)*.30:0;
  legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
  arms[0].rotation.x=-stride*.65;arms[1].rotation.x=stride*.65;
  torso.position.y=1.26+(motion?Math.abs(Math.sin(t*7.5))*.025:0);
 }};
}
function gatherMaterials(object){
 const materials=new Set();
 object.traverse(node=>{
  if(!node.isMesh)return;
  node.castShadow=true;node.receiveShadow=true;
  const matList=Array.isArray(node.material)?node.material:[node.material];
  const copies=matList.map(m=>{const mat=m.clone();materials.add(mat);return mat});
  node.material=Array.isArray(node.material)?copies:copies[0];
 });
 return [...materials];
}
function normalizeModel(scene,height){
 // In glTF, animated models may be many metres tall; normalize to human height.
 const bounds=new THREE.Box3().setFromObject(scene),size=new THREE.Vector3();
 bounds.getSize(size);
 if(!Number.isFinite(size.y)||size.y<.01)throw Error('Character asset has no usable height');
 const center=bounds.getCenter(new THREE.Vector3());
 const unit=new THREE.Group();
 scene.position.set(-center.x,-bounds.min.y,-center.z);
 unit.add(scene);
 unit.scale.setScalar(height/size.y);
 return unit;
}
function findClip(clips,keyword){
 const m=clips.find(c=>c.name.toLowerCase()===keyword.toLowerCase());
 return m||clips.find(c=>c.name.toLowerCase().includes(keyword.toLowerCase()))||null
}
export function createCharacterActor(parent,role,{onAssetStatus=()=>{}}={}){
 const config=CHARACTER_ASSETS[role];
 if(!config)throw Error('Unknown character role '+role);
 const root=new THREE.Group();parent.add(root);
 const fallback=buildFallback(role==='robot'?0xd7e2e6:0x71828a);
 root.add(fallback.root);
 let materials=fallback.materials,baseMaterials=[],mixer=null,actions={};
 let currentAction=null,modelReady=false,localTime=0;
 let clipHead=false,clipCutoff=1.49;
 function saveMaterialBases(){
  baseMaterials=materials.map(mat=>({
   mat,color:mat.color?.clone()||null,
   emissive:mat.emissive?.clone()||null,
   intensity:Number.isFinite(mat.emissiveIntensity)?mat.emissiveIntensity:0
  }));
 }
 saveMaterialBases();
 function clearFlash(){for(const entry of baseMaterials){
   if(entry.color)entry.mat.color.copy(entry.color);
   if(entry.emissive)entry.mat.emissive.copy(entry.emissive);
   if(entry.emissive!==null)entry.mat.emissiveIntensity=entry.intensity;
 }}
 function applyFlash(amount){
  const t=Math.min(1,Math.max(0,amount));
  for(const entry of baseMaterials){
   if(entry.color)entry.mat.color.copy(entry.color).lerp(red,t);
   if(entry.emissive)entry.mat.emissive.copy(entry.emissive).lerp(redGlow,t);
   if(entry.emissive)entry.mat.emissiveIntensity=entry.intensity+2.2*t;
  }
 }
 async function load(){
  try{
   const gltf=await loader.loadAsync(config.url);
   const normalized=normalizeModel(gltf.scene,config.height);
   const clonedMaterials=gatherMaterials(normalized);
   const nextMixer=new THREE.AnimationMixer(gltf.scene);
   const idle=findClip(gltf.animations,'idle')||findClip(gltf.animations,'sentinel')||gltf.animations[0];
   const walk=findClip(gltf.animations,'walk')||findClip(gltf.animations,'run');
   const run=findClip(gltf.animations,'run')||walk;
   const nextActions={};
   if(idle)nextActions.idle=nextMixer.clipAction(idle);
   if(walk)nextActions.walk=nextMixer.clipAction(walk);
   if(run)nextActions.run=nextMixer.clipAction(run);
   if(nextActions.idle)nextActions.idle.play();
   root.remove(fallback.root);
   root.add(normalized);
   materials=clonedMaterials;
   saveMaterialBases();
   // Preserve first-person head clipping even if the GLB arrives after the
   // user starts playing or toggles camera view.
   for(const mat of materials){
    mat.clippingPlanes=clipHead?[new THREE.Plane(new THREE.Vector3(0,-1,0),clipCutoff)]:[];
    mat.needsUpdate=true;
   }
   mixer=nextMixer;actions=nextActions;currentAction=nextActions.idle||null;
   modelReady=true;
   onAssetStatus(role,config.name+' LOADED');
  }catch(error){
   console.warn(config.name+' could not load; using local articulated fallback',error);
   onAssetStatus(role,config.name+' / FALLBACK ACTIVE');
  }
 }
 // Do not block the game on the network. It remains playable with its fallback.
 load();
 return {
  root,
  get loaded(){return modelReady},
  setFirstPersonClip(enabled,cutoff=1.49){
   clipHead=enabled;clipCutoff=cutoff;
   // Head/upper torso are hidden only from the first-person camera.
   // Legs stay visible when looking down; the full rig is shown when inspecting.
   for(const mat of materials){
    mat.clippingPlanes=clipHead?[new THREE.Plane(new THREE.Vector3(0,-1,0),clipCutoff)]:[];
    mat.needsUpdate=true;
   }
  },
  update(dt,walk,time,flash=0,stunned=false,sprinting=false){
   localTime+=dt;
   if(mixer){
    const goal=stunned?(actions.idle||null):
      (walk?(sprinting?actions.run||actions.walk:actions.walk||actions.run):actions.idle)||null;
    if(goal&&goal!==currentAction){
     if(currentAction)currentAction.fadeOut(.17);
     goal.reset().fadeIn(.17).play();
     currentAction=goal;
    }
    mixer.update(dt);
   }else fallback.animateWalk(localTime,walk&&!stunned);
   applyFlash(flash);
  },
  dispose(){
   clearFlash();if(mixer)mixer.stopAllAction();
  }
 };
}

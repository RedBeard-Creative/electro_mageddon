import * as THREE from 'three';

// The Xbot torso in src/characters.js is the complete player mesh.
// These viewmodel hands are sculpted to match Xbot's matte silver/graphite,
// humanoid proportions: a tapered forearm, real palm, articulated fingers,
// knuckle covers, and a thumb that folds OVER the fist.
// Kept separate from the full-body mesh so punches don't deform the Xbot rig.
const MATERIALS={
 armor:new THREE.MeshStandardMaterial({color:0x8e979d,metalness:.57,roughness:.47}),
 palm:new THREE.MeshStandardMaterial({color:0x737d83,metalness:.35,roughness:.66}),
 knuckles:new THREE.MeshStandardMaterial({color:0xa8b0b4,metalness:.51,roughness:.43}),
 joints:new THREE.MeshStandardMaterial({color:0x30383e,metalness:.38,roughness:.81}),
 sleeve:new THREE.MeshStandardMaterial({color:0x484f58,metalness:.51,roughness:.54}),
 seam:new THREE.MeshStandardMaterial({color:0x222a32,metalness:.41,roughness:.72})
};
const sphere=new THREE.SphereGeometry(1,16,12);
function ovoid(parent,material,x,y,z,sx,sy,sz){
 const mesh=new THREE.Mesh(sphere,material);
 mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh
}
function shaft(parent,material,r1,r2,len,x,y,z){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,20),material);
 mesh.rotation.x=Math.PI/2;
 mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh
}
function seam(parent,r,z){
 const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.008,6,24),MATERIALS.seam);
 ring.rotation.x=Math.PI/2;ring.position.z=z;parent.add(ring)
}
export function createXbotViewHand(camera,side){
 // side: -1 left, +1 right. Hands are natural humanoid size (~18 cm).
 const root=new THREE.Group();camera.add(root);
 const limb=new THREE.Group();root.add(limb);

 // A wrist narrower than the elbow, as on the actual Xbot suit.
 shaft(limb,MATERIALS.sleeve,.142,.102,.70,0,-.035,.18);
 // Rounded forearm shells follow the taper, not a blocky rectangular sleeve.
 ovoid(limb,MATERIALS.armor,0,.040,.20,.118,.080,.33);
 ovoid(limb,MATERIALS.armor,0,-.115,.15,.098,.051,.29);
 ovoid(limb,MATERIALS.sleeve,0,-.020,-.175,.111,.103,.085);
 shaft(limb,MATERIALS.joints,.101,.093,.07,0,-.025,-.27);
 seam(limb,.11,-.235);

 const wrist=new THREE.Group();wrist.position.set(0,-.026,-.325);limb.add(wrist);
 // Palm has a soft shape with tapered edges, like Xbot's smooth armored glove.
 ovoid(wrist,MATERIALS.palm,0,-.005,-.113,.147,.103,.171);
 ovoid(wrist,MATERIALS.armor,0,.062,-.125,.124,.050,.127);
 ovoid(wrist,MATERIALS.sleeve,0,-.071,-.177,.129,.035,.112);
 // Thin hand seams make the armor look segmented without glowing robot buttons.
 for(const x of [-.096,-.030,.036,.100])
  ovoid(wrist,MATERIALS.seam,x,.048,-.203,.005,.006,.069);

 const fingers=[];
 const offsets=[-.105,-.037,.038,.106];
 const fingerLengths=[.126,.143,.138,.116];
 for(let i=0;i<4;i++){
  const finger=new THREE.Group();
  finger.position.set(offsets[i],-.008,-.24);
  wrist.add(finger);
  const width=i===0||i===3?.033:.036;
  ovoid(finger,MATERIALS.knuckles,0,.017,-.015,width+.006,.042,.039);
  ovoid(finger,MATERIALS.joints,0,-.007,-.059,width*.9,.030,.039);
  const seg1=new THREE.Group();finger.add(seg1);
  const len=fingerLengths[i];
  ovoid(seg1,MATERIALS.palm,0,-.009,-len*.47,width,.032,len*.56);
  const knuckle=new THREE.Group();knuckle.position.z=-len;seg1.add(knuckle);
  ovoid(knuckle,MATERIALS.joints,0,-.002,0,width*.91,.031,.028);
  ovoid(knuckle,MATERIALS.knuckles,0,.020,0,width,.023,.031);
  ovoid(knuckle,MATERIALS.palm,0,-.005,-.046,width*.87,.032,.070);
  fingers.push({base:finger,tip:knuckle,i});
 }
 // Five-digit anatomy: wrap the thumb across the index finger while punching.
 const thumb=new THREE.Group();thumb.position.set(side*.137,-.075,-.117);wrist.add(thumb);
 thumb.rotation.z=-side*.40;
 ovoid(thumb,MATERIALS.palm,side*.035,-.01,-.038,.053,.055,.090);
 const thumbTip=new THREE.Group();thumbTip.position.set(side*.054,-.015,-.104);thumb.add(thumbTip);
 ovoid(thumbTip,MATERIALS.knuckles,side*.025,.01,-.030,.048,.043,.067);
 ovoid(thumbTip,MATERIALS.palm,side*.040,-.004,-.078,.043,.036,.056);

 // Three reusable hand poses: fist (combat), ready (relaxed), and grip (tools).
 // A future tool can call setGrip('hold') without replacing the mesh.
 let pose='ready',curl=.65;
 function setGrip(value){
  if(value==='hold'||value==='ready'||value==='fist')pose=value
 }
 function update(dt,punching=false){
  const destination=punching?1.0:(pose==='hold'?.60:pose==='fist'?1.0:.45);
  const t=1-Math.exp(-16*Math.max(0,dt));
  curl+=(destination-curl)*t;
  for(const {base,tip,i} of fingers){
   base.rotation.x=(.20+.82*curl)*(i===3?.94:1);
   tip.rotation.x=.26+1.10*curl;
   base.rotation.y=(i-1.5)*.055*(1-curl);
  }
  thumb.rotation.y=-side*(.23+.33*curl);
  thumbTip.rotation.x=.14+.55*curl;
 }
 update(.05,false);

 root.userData.restX=side*.43;
 root.userData.restY=-.46;
 root.userData.restZ=-.69;
 root.position.set(root.userData.restX,root.userData.restY,root.userData.restZ);
 root.rotation.set(-.10,side*.08,side*.02);
 return {root,update,setGrip,get grip(){return pose},side,
  fingerCount:fingers.length+1}
}

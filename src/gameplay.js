// Electromageddon v0.1 - deterministic gameplay rules (no renderer dependency)
export const ROOM = Object.freeze({ minX:-11.15,maxX:11.15,minZ:-11.1,maxZ:11.1 });
export const BAG = Object.freeze({ x:0,z:-3.75,radius:.65 });
export const OBSTACLES = Object.freeze([
  {x:-7.1,z:-6.4,radius:1.15},{x:7.0,z:-6.2,radius:1.15},
  {x:-7.5,z:3.6,radius:1.2},{x:7.5,z:3.65,radius:1.2}
]);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function forward(yaw){return {x:Math.sin(yaw),z:-Math.cos(yaw)}}
export function right(yaw){return {x:Math.cos(yaw),z:Math.sin(yaw)}}
export function newGame(){
  return {x:0,z:5.6,yaw:0,pitch:0,walkPhase:0,isMoving:false,
    flashlight:true,punchCooldown:0,punchAnim:0,totalPunches:0,hits:0,
    bagTiltX:0,bagTiltZ:0,bagVelX:0,bagVelZ:0,lastHitAt:-100,
    time:0};
}
export function look(state,dx,dy,sensitivity=.0035){
  state.yaw+=clamp(dx,-175,175)*sensitivity;
  state.pitch=clamp(state.pitch-clamp(dy,-175,175)*sensitivity*.64,-1.12,1.12);
}
function separateCircle(state,object,playerRadius=.38){
  const dx=state.x-object.x,dz=state.z-object.z;
  const min=object.radius+playerRadius,d=Math.hypot(dx,dz);
  if(d<min){
    const nx=d>.00001?dx/d:1,nz=d>.00001?dz/d:0;
    state.x=object.x+nx*(min+.005);state.z=object.z+nz*(min+.005);
  }
}
export function move(state,strafe,advance,dt,sprint=false){
  dt=clamp(dt,0,.05);
  const length=Math.hypot(strafe,advance);
  state.isMoving=length>.01;
  if(!state.isMoving)return;
  const s=length>1?1/length:1,step=(sprint?5.8:3.45)*dt;
  const f=forward(state.yaw),r=right(state.yaw);
  state.x+=(r.x*strafe+f.x*advance)*s*step;
  state.z+=(r.z*strafe+f.z*advance)*s*step;
  state.x=clamp(state.x,ROOM.minX,ROOM.maxX);
  state.z=clamp(state.z,ROOM.minZ,ROOM.maxZ);
  for(const item of [...OBSTACLES,BAG])separateCircle(state,item);
  state.x=clamp(state.x,ROOM.minX,ROOM.maxX);
  state.z=clamp(state.z,ROOM.minZ,ROOM.maxZ);
  state.walkPhase+=dt*(sprint?12.5:8.2);
}
export function bagInRange(state){
  const dx=BAG.x-state.x,dz=BAG.z-state.z,distance=Math.hypot(dx,dz);
  if(distance>2.45||distance<.01)return false;
  const f=forward(state.yaw);
  return (f.x*dx+f.z*dz)/distance>.70 && Math.abs(state.pitch)<.86;
}
export function punch(state){
  if(state.punchCooldown>0)return {performed:false,hit:false};
  state.punchCooldown=.42;
  state.punchAnim=.33;
  state.totalPunches++;
  const hit=bagInRange(state);
  if(hit){
    state.hits++;state.lastHitAt=state.time;
    const f=forward(state.yaw);
    // Impulse pushes the weighted bag in the direction of the fist.
    state.bagVelX+=f.z*2.3;
    state.bagVelZ-=f.x*2.3;
  }
  return {performed:true,hit};
}
export function update(state,dt){
  dt=clamp(dt,0,.05);
  state.time+=dt;
  state.punchCooldown=Math.max(0,state.punchCooldown-dt);
  state.punchAnim=Math.max(0,state.punchAnim-dt);
  // Damped pendulum at a heavy chain, with modest swing limits.
  const spring=10.5,drag=Math.exp(-1.65*dt);
  state.bagVelX=(state.bagVelX-state.bagTiltX*spring*dt)*drag;
  state.bagVelZ=(state.bagVelZ-state.bagTiltZ*spring*dt)*drag;
  state.bagTiltX=clamp(state.bagTiltX+state.bagVelX*dt,-.67,.67);
  state.bagTiltZ=clamp(state.bagTiltZ+state.bagVelZ*dt,-.67,.67);
}
export function flashlightToggle(state){state.flashlight=!state.flashlight;return state.flashlight}

// ================================================================ rendu
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.95;
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xc7d0db);
scene.fog=new THREE.Fog(0xc7d0db,45,135);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(renderer),0.04).texture;
scene.environmentIntensity=0.5;

const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,0.05,260);
scene.add(new THREE.HemisphereLight(0xe6eeff,0x6d665e,0.55));
const sun=new THREE.DirectionalLight(0xfff0dc,2.6);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:0.5,far:50});
sun.shadow.bias=-0.0003; sun.shadow.normalBias=0.025;
scene.add(sun,sun.target);

// le monde : 600 m × 600 m découpés en zones de 40 m (voir 022_monde.js)
const WORLD=600,CHUNK=40;
const PLATE=WORLD; // ancien nom gardé pour les limites

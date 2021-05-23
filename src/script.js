import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import { AnimationMixer, Vector3 } from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

// console.log(OrbitControls)
// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xffffff, 10, 800);

const textureLoader = new THREE.TextureLoader()

const grass = textureLoader.load('/textures/grass.jpg')
grass.wrapS = THREE.RepeatWrapping;
grass.wrapT = THREE.RepeatWrapping;
grass.repeat.set(512,512);
const nmapcircles = textureLoader.load('/normalmaps/golf.png')

const modelLoader = new GLTFLoader()
const fbxLoader = new FBXLoader()



/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}


// Lights

// const pointLight = new THREE.PointLight(0xffffff, 0.1)
// pointLight.position.x = 2
// pointLight.position.y = 3
// pointLight.position.z = 4
// scene.add(pointLight)
// pointLight.castShadow = true

const blueLight = new THREE.DirectionalLight(0xffffff, 2)
blueLight.position.x = 10
blueLight.position.y = 20
blueLight.position.z = 10
scene.add(blueLight)

blueLight.castShadow = true

const d = 80;

blueLight.shadow.camera.left = - d;
blueLight.shadow.camera.right = d;
blueLight.shadow.camera.top = d;
blueLight.shadow.camera.bottom = - d;

const hemisphereLight = new THREE.HemisphereLight( 0x8eba20, 0xffffff, 1 );
scene.add( hemisphereLight );

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.x = 0
camera.position.y = 12
camera.position.z = 16
scene.add(camera)
// camera.lookAt(0,0,0)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true;
renderer.setClearColor('#79e8e6',0.7)


var controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0,0,0)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI / 2 - 0.1
controls.zoomSpeed = 0.5

// Objects
// --------------------------------------------------------------------------------------------------------

const PLANE = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000,1000), new THREE.MeshStandardMaterial({map: grass}))
PLANE.rotation.x = - Math.PI/2
PLANE.receiveShadow = true;
scene.add(PLANE)



function loadModel(model_path, callback){
    fbxLoader.load(
        './models/'+model_path+'.fbx',
        function(obj){
            obj.scale.set(0.05,0.05,0.05)
            obj.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}})
            callback(obj)
        }
    )
}

function loadAnimation(anim_path, callback){
    fbxLoader.load(
        './models/animations/'+anim_path+'.fbx',
        function(obj){
            callback(anim_path, obj.animations[0])
        }
    )
}


class ThirdPersonCamera {
    constructor(){
        this.camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 1000)
        this.camera.position.y = 15
        this.centerAt = new Vector3()

        // offset

        // player's direction = rotation.y
        // 0 --> z:1, x:0
        // pi/2 --> z:0, x:1
        // ...
    }

    update(obj){
        let rot = obj.rotation.y;
        let z_comp = Math.cos(rot);
        let x_comp = Math.sin(rot);
        // console.log(x_comp,z_comp)

        this.camera.position.x = obj.position.x-20*x_comp;
        this.camera.position.z = obj.position.z-20*z_comp;

        this.camera.lookAt(obj.position.x + 20*x_comp, 0, obj.position.z + 20*z_comp)
    }

}


class CharacterController {
    constructor(model){
        this.entity = model;
        this.mixer = new THREE.AnimationMixer(this.entity)
        scene.add(this.entity)
        this.animations = {}

        this.camera = new ThirdPersonCamera();


        this.input = new CharacterControllerInput(this)

        this.state = 'idle'

        this.FSM = new FiniteStateMachine()

    }

    addAnimation(path,anim){
        let temp = this.mixer.clipAction(anim)
        // temp.timeScale = 60
        this.animations[path] = temp
        console.log(this.animations['idle'])
        // console.log(this.animations)
        if(path == 'idle') {console.log('playing');this.animations[path].play(); console.log(this.animations['idle'])}
        if(path == 'jump_catch') this.animations[path].setLoop(THREE.LoopOnce)
    }

    processInput(inp){
        let new_state = this.state;
        if(this.state == 'jump_catch'){
            if(this.animations['jump_catch'].time > 2.2){
                new_state = 'idle'
                this.FSM.currentState = 'idle'
            }
        }
        else{
            this.FSM.updateState(inp);
            new_state = this.FSM.currentState
        }
        if(new_state == this.state) return;

        // change of state

        // can universally crossfade and transition

        let anim_name = new_state
        // console.log('anim name:',anim_name)
        this.animations[anim_name].time = 0.0
        this.animations[anim_name].enabled = true
        this.animations[anim_name].setEffectiveWeight(1.0)
        this.animations[anim_name].crossFadeFrom(this.animations[this.state], 0.3, true)
        // this.animations[this.state].stop()
        this.animations[anim_name].play()

        this.state = new_state        
    }


    update(){

        this.camera.update(this.entity)

        this.processInput(this.input.keys)
        if(this.state == 'jogging'){
            this.entity.translateZ(0.2)
        }
        else if(this.state == 'running'){
            this.entity.translateZ(0.6)
        }
        if(this.input.keys.d == true) {this.entity.rotation.y -= Math.PI/40;console.log(this.entity.rotation.y)}
        else if(this.input.keys.a == true) this.entity.rotation.y += Math.PI/40
    }
}

class CharacterControllerInput {
    constructor(controller){
        this.controller = controller
        this.keys = {
            ' ': false,
            w: false,
            // f: false,
            d: false,
            a: false,
            shift: false

        }

        document.addEventListener('keydown',(e)=>{
            let k = e.key.toLowerCase()
            if(this.keys[k] != undefined){
                this.keys[k] = true;
            }
        })
        document.addEventListener('keyup',(e)=>{
            let k = e.key.toLowerCase()
            if(this.keys[k] != undefined){
                this.keys[k] = false;
            }

        })
    }
}

class FiniteStateMachine {
    constructor(){
        this.currentState = 'idle'
    }

    updateState(inp){
        if(this.currentState == 'idle'){
            if(inp['w'] == true)
                this.currentState = 'jogging'
            else if(inp[' '] == true)
                this.currentState = 'jump_catch'
        }

        else if(this.currentState == 'jogging'){
            if(inp['w'] == false){
                this.currentState = 'idle'
            }
            else{
                if(inp['shift'] == true)
                    this.currentState = 'running'
                if(inp[' '] == true)
                    this.currentState = 'jump_catch'
            }

        }

        else if(this.currentState == 'running'){
            if(inp['w'] == false){
                this.currentState = 'idle'
            }
            else{
                if(inp['shift'] == false)
                    this.currentState = 'jogging'
                if(inp[' '] == true)
                    this.currentState = 'jump_catch'
            }
        }
    }

}





var PLAYER;

loadModel('mannequin', function(model){
    PLAYER = new CharacterController(model)

    for(let anim_path of ['idle','jump_catch','jogging','falling','running']){
        loadAnimation(anim_path, function(path,anim){
            PLAYER.addAnimation(path,anim)
        })
    }
})


// Events
// --------------------------------------------------------------------------------------------------------

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onMouseClick( event ) {
    
}


window.addEventListener( 'mousemove', onMouseMove, false );
window.addEventListener( 'dblclick', onMouseClick, false );

/**
 * Animate
 */

 

const clock = new THREE.Clock()
let prev = 0
let onfield = false
let prevIntersect = new Vector3(0,0,0)
const tick = () =>
{

    const elapsedTime = clock.getElapsedTime()

    raycaster.setFromCamera( mouse, camera );

	// // calculate objects intersecting the picking ray
	// var intersect = raycaster.intersectObject(plane.mesh)

    // if (intersect.length > 0){
    //     onfield = true
    //     intersect = intersect[0]
    //     if (intersect.point.distanceTo(prevIntersect) > 0.2){
    //         // console.log(intersect.point)
    //         prevIntersect = intersect.point
    //     }
    // }
    // else onfield = false

    // console.log(delta)
    // if (mixer) mixer.update(0.0005);

    // Render
    try{
        PLAYER.mixer.update(0.02)
        PLAYER.update()}
    catch(e){console.log(e)}
    controls.update()
    try{renderer.render(scene, PLAYER.camera.camera)}
    catch(e){renderer.render(scene, camera)}
    


    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
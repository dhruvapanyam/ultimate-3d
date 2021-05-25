// const socket = io("http://192.168.0.105:8080");


import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import { AnimationMixer, Vector3 } from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

// // console.log(OrbitControls)
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

const DISC = new THREE.Mesh(new THREE.SphereBufferGeometry(0.5,64,64), new THREE.MeshStandardMaterial({color: '#000000'}))
DISC.castShadow = true;
DISC.receiveShadow = true;
scene.add(DISC)


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
            console.log('loadAnimation:',anim_path,obj)
            if(anim_path == 'untitled')
                callback(anim_path, obj.animations[1])
            else
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
        // // console.log(x_comp,z_comp)

        let bone = 'mixamorig1Hips'
        this.camera.position.x = bones[bone].getWorldPosition(new Vector3).x - 20*x_comp;
        this.camera.position.z = bones[bone].getWorldPosition(new Vector3).z - 20*z_comp;

        this.camera.lookAt(obj.position.x + 20*x_comp, 0, obj.position.z + 20*z_comp)
    }

}


const intro = 'idle'
class CharacterController {
    constructor(model, states){
        this.entity = model;
        this.mixer = new THREE.AnimationMixer(this.entity.children[0])
        scene.add(this.entity)
        this.animations = {}

        this.camera = new ThirdPersonCamera();


        this.input = new CharacterControllerInput(this)

        this.state = 'idle'

        this.FSM = new FiniteStateMachine(states)



        this.velocity = 0;

    }

    addAnimation(path,anim){
        let temp = this.mixer.clipAction(anim)
        // temp.timeScale = 60
        this.animations[path] = temp
        // // console.log(this.animations['idle'])
        console.log(path,this.animations[path])
        // console.log('CharacterController::addAnimation:',path);
        if(path == intro) {this.animations[path].play();}
        if(path == 'vertical') this.animations[path].setLoop(THREE.LoopOnce)
    }


    addTransition(prev, req, next, options={}){
        // console.log('CharacterController::addTransition: calling inner functions');
        this.FSM.addTransition(prev, req, next, options)
    }



    processInput(inp){


        let new_state = this.FSM.updateState(inp);

        if(new_state == null) return;
        else {
            // need to transition to new_state

            let prev = new_state.prev;
            let next = new_state.next;
            let options = new_state.options;

            console.log('CharacterController::processInput: Transitioning from',prev,'to',next,'! Options:',options);

            this.animations[next].time = options.start_time;
            this.animations[next].enabled = true;
            // this.animations[prev].setEffectiveWeight(1-options.effectiveWeight);
            this.animations[next].setEffectiveWeight(1.0);

            // if(0 && options.crossfade == true) this.animations[next].crossFadeFrom(this.animations[prev], options.crossFadeDuration, options.crossFadeWarp);
            this.animations[prev].fadeOut(0.5)

            this.animations[next].fadeIn(0.5)
            this.animations[next].play()
            console.log('Playing animation:',next)

            

            this.state = next;

        }

        // let new_state = this.state;
        // if(this.state == 'vertical'){
        //     if(this.animations['vertical'].time > 2.2){
        //         new_state = 'idle'
        //         this.FSM.currentState = 'idle'
        //     }
        // }
        // else{
        //     this.FSM.updateState(inp);
        //     new_state = this.FSM.currentState
        // }
        // if(new_state == this.state) return;

        // // change of state

        // // can universally crossfade and transition

        // let anim_name = new_state
        // // // console.log('anim name:',anim_name)
        // this.animations[anim_name].time = 0.0
        // this.animations[anim_name].enabled = true
        // this.animations[anim_name].setEffectiveWeight(1.0)
        // this.animations[anim_name].crossFadeFrom(this.animations[this.state], 0.3, true)
        // // this.animations[this.state].stop()
        // this.animations[anim_name].play()

        // this.state = new_state  
        
        
    }

    updateVelocity(){
        if(this.state == 'idle'){
            this.velocity = Math.max(0, this.velocity * 0.9)
        }
        else if(this.state == 'jogging'){
            this.velocity = Math.min(this.velocity+0.005, 0.3);
        }
        else if(this.state == 'running'){
            this.velocity = Math.min(this.velocity+0.005, 0.6);
        }

        this.entity.translateZ(this.velocity)

        if(this.input.keys.d == true) {this.entity.rotation.y -= Math.PI/40;}
        else if(this.input.keys.a == true) this.entity.rotation.y += Math.PI/40
    }


    update(){

        this.camera.update(this.entity)

        this.processInput(this.input.keys)

        this.updateVelocity()
        
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
    constructor(states){
        this.currentState = 'idle'

        this.special_rules = {'vertical': [{function_check: x => (x.time > 2.2), state: 'idle'}]}

        this.states = {}
        for(let s of states){
            this.states[s] = new FSMState(s)
        }
    }

    satisfiesRequirements(inp, inp_key) {
        // inp: {'w':true, 'shift':false,...}
        let requirements = JSON.parse(inp_key);
        // requirements = {'true':[...], 'false':[...]}
        for(let t of requirements.true){
            if(inp[t] == false) return false;
        }

        for(let f of requirements.false){
            if(inp[f] == true) return false;
        }

        return true;
    }

    checkCollision(req, inp_key) {
        // req: {true:['w','shift', ...], false:[' ','d', ...]}
        let true_set = new Set(req.true)
        let false_set = new Set(req.false)
        // // console.log('FSM::checkCollision: inp_key =',inp_key)
        inp_key = JSON.parse(inp_key);
        for(let t of inp_key.true){
            if(true_set.has(t) == false) return false;
        }

        for(let f of inp_key.false){
            if(false_set.has(f) == false) return false;
        }

        return true;
    }

    addTransition(prev, req, next, options){
        // // console.log('FSM::addTransition: entered function. Params:',prev,req,next,options);
        for(let inp_key in this.states[prev].transitions){
            // // console.log('Checking collision with',inp_key)
            if(this.checkCollision(req, inp_key))
            {
                // console.log('This transition:',prev,req,next,'is comparable to another transition')
                return null;
            }
        }
        // console.log('FSM::addTransition: adding transition',req,next);
        this.states[prev].addTransition(req, next, options);
    }

    updateState(inp){

        // convert inp to standard form
        // then check if it exists in this.states[this.currentState].transitions

        let inp_key = null;
        // // console.log('FSM::updateState: current state\'s transitions:',this.states[this.currentState])
        for(let k in this.states[this.currentState].transitions){
            // // console.log('transition key:',k)
            if(this.satisfiesRequirements(inp, k)){
                // console.log('FSM::updateState: found inp_key match with',k)//this.states[this.currentState].transitions[k]);
                inp_key = k;
                // console.log('Updating inp_key to',inp_key)
                break
            }
        }


        if(inp_key == null) return null;

        // // console.log('reached here')

        let next_state = this.states[this.currentState].transitions[inp_key]
        let prev_state = this.currentState
        this.currentState = next_state.state

        let res = {
            prev: prev_state,
            next: this.currentState,
            options: next_state.options
        }

        // // console.log('FSM::updateState: Returning:',res)

        return res;

    }

}


class FSMState {
    constructor(name){
        this.name = name;
        this.transitions = {};
    }

    _mergeOptions(options){
        let res = {}
        let params = [['start_time',0.0],['effectiveWeight',1.0],['crossFade',true],['crossFadeDuration',0.3],['crossFadeWarp',true]]

        for(let param of params){
            if(options[param[0]] != undefined) res[param[0]] = options[param[0]]
            else res[param[0]] = param[1]
        }

        return res;
    }

    addTransition(req, next, options){
        let opt = this._mergeOptions(options)
        // let inp = standardizeInput(inp);
        let inp_key = JSON.stringify(req)
        this.transitions[inp_key] = {
            state: next,
            options: opt
        };
        // console.log('FSMState::addTransition: added transition:', this.transitions[inp_key]);

    }


}




var PLAYER;
const player_states = ['idle','jogging','running','forehand','vertical']
const player_transitions = [
    ['idle', {true: ['w'], false: []}, 'jogging'],
    ['idle', {true: ['w','shift'], false: []}, 'running'],
    ['idle', {true: [' '], false: ['w','shift']}, 'vertical'],
    ['idle', {true: [' ','shift'], false: ['w']}, 'forehand'],

    ['jogging', {true: ['w','shift'], false: []}, 'running'],
    ['jogging', {true: ['w',' '], false: []}, 'vertical'],
    ['jogging', {true: [], false: ['w']}, 'idle'],

    ['running', {true: ['w'], false: ['shift']}, 'jogging'],
    ['running', {true: [], false: ['w']}, 'idle'],

    ['forehand', {true: [], false: ['shift']}, 'idle'],
    ['forehand', {true: [], false: [' ']}, 'idle'],

    ['vertical', {true: [], false: [' ']}, 'idle']



]

var bones = {};

loadModel('mannequin', function(model){
    PLAYER = new CharacterController(model, player_states)

    for(let anim_path of player_states){
        loadAnimation(anim_path, function(path,anim){
            PLAYER.addAnimation(path,anim)
        })
    }

    for(let trans of player_transitions){
        let [prev, req, next] = trans;
        // console.log('Prev:',prev,'Req:',req,'Next:',next)
        PLAYER.addTransition(prev, req, next)
    }

    // console.log(PLAYER.entity)

    let cur = [PLAYER.entity.children[1]];
    while(cur.length > 0){
        let bone = cur[0]
        bones[bone.name] = bone;
        cur = cur.slice(1);
        for(let c of bone.children) cur.push(c)
    }

    // console.log('Bones:')
    // console.log(bones)
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


 function setVector(a,b){
     a.x = b.x
     a.y = b.y
     a.z = b.z
     return a
 }
 

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
    //         // // console.log(intersect.point)
    //         prevIntersect = intersect.point
    //     }
    // }
    // else onfield = false

    // // console.log(delta)
    // if (mixer) mixer.update(0.0005);

    // Render
    try{
        PLAYER.mixer.update(0.02)
        PLAYER.update();


        let right_hand_pos = PLAYER.entity.children[1].children[1].children[0].children[0].children[2].children[0].children[0].children[0].position
        let [x,y,z] = [right_hand_pos.x,right_hand_pos.y,right_hand_pos.z]

        let bone = 'mixamorig1RightHandMiddle1'

        // DISC.position.x = bones[bone].x

        bones[bone].getWorldPosition(DISC.position)
        // DISC.position.x = PLAYER.entity.children[1].position.x/20
        // // console.log(Math.round(x*1000000))

        // // console.log(Math.round(PLAYER.entity.children[1].position.x),Math.round(PLAYER.entity.children[1].children[1].position.x))

        // DISC.position.x = x*1000000;
        // // console.log(PLAYER.entity.children[1].position.x,PLAYER.entity.children[1].position.y,PLAYER.entity.children[1].position.z)
    }
    catch(e){}
    controls.update()
    try{renderer.render(scene, PLAYER.camera.camera)}
    catch(e){renderer.render(scene, camera)}


    


    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
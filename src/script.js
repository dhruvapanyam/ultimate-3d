// const socket = io("http://192.168.0.105:8080");


import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import { AnimationMixer, Vector3 } from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'


const sin = Math.sin;
const cos = Math.cos;
const sqrt = Math.sqrt;

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
            // console.log('loadAnimation:',anim_path,obj)
            if(anim_path == 'untitled')
                callback(anim_path, obj.animations[1])
            else
                callback(anim_path, obj.animations[0])
        }
    )
}




class ThirdPersonCamera {
    constructor(controller){
        this.controller = controller;
        this.camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 1000)
        this.camera.position.y = 15
        this.centerAt = new Vector3()

        this.speed_bar = new THREE.Mesh(new THREE.PlaneBufferGeometry(3,0.4), new THREE.MeshBasicMaterial({color: 'black'}))
        this.speed_amt = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,0.3), new THREE.MeshBasicMaterial({color: 'green'}))
        
        scene.add(this.speed_bar);
        scene.add(this.speed_amt);

        this.angle_bar = new THREE.Mesh(new THREE.PlaneBufferGeometry(3,0.4), new THREE.MeshBasicMaterial({color: 'black'}))
        this.angle_amt = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,0.3), new THREE.MeshBasicMaterial({color: 'red'}))
        
        scene.add(this.angle_bar);
        scene.add(this.angle_amt);

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

        setVector(this.speed_bar.position, this.camera.position)
        setVector(this.speed_bar.rotation, this.camera.rotation)
        this.speed_bar.translateZ(-10);
        this.speed_bar.translateY(-4);

        setVector(this.speed_amt.position, this.camera.position)
        setVector(this.speed_amt.rotation, this.camera.rotation)
        this.speed_amt.translateZ(-9.9);
        this.speed_amt.translateY(-3.96);


        setVector(this.angle_bar.position, this.camera.position)
        setVector(this.angle_bar.rotation, this.camera.rotation)
        this.angle_bar.translateZ(-10);
        this.angle_bar.translateY(-5);

        setVector(this.angle_amt.position, this.camera.position)
        setVector(this.angle_amt.rotation, this.camera.rotation)
        this.angle_amt.translateZ(-9.9);
        this.angle_amt.translateY(-4.96);

        // let sx = this.speed_bar.scale.x
        let sp = this.controller.throw_speed
        this.speed_amt.scale.set(sp,1,1)


        let an = disc_flight_params.theta * 3 / 90
        this.angle_amt.scale.set(an,1,1)
        // console.log(this.speed_bar.scale)
    }

}


const intro = 'idle'
class CharacterController {
    constructor(model, states){
        this.entity = model;
        this.mixer = new THREE.AnimationMixer(this.entity.children[0])
        scene.add(this.entity)
        this.animations = {}

        this.camera = new ThirdPersonCamera(this);


        this.input = new CharacterControllerInput(this)

        this.state = 'idle'

        this.FSM = new FiniteStateMachine(this, states)

        this.throw_speed = 1;


        this.velocity = 0;

    }

    addAnimation(path,anim){
        let temp = this.mixer.clipAction(anim)
        // temp.timeScale = 60
        this.animations[path] = temp
        // // console.log(this.animations['idle'])
        // console.log(path,this.animations[path])
        // console.log('CharacterController::addAnimation:',path);
        if(path == intro) {this.animations[path].play();}
        if(path == 'vertical') this.animations[path].setLoop(THREE.LoopOnce)


        // console.log(this)
    }


    addTransition(prev, req, next, options={}){
        // console.log('CharacterController::addTransition: calling inner functions');
        this.FSM.addTransition(prev, req, next, options)
    }



    processInput(inp){

        if (inp['ShiftRight'] == true){
            this.throw_speed = (this.throw_speed + 0.05) % 3;
        }

        if (inp['ShiftLeft'] == true){
            disc_flight_params.theta = (disc_flight_params.theta + 1) % 90;
        }

        let new_state = this.FSM.updateState(inp);

        if(new_state == null) return;
        else {
            // need to transition to new_state  

            let prev = this.FSM.states[new_state.prev].animation;
            let next = this.FSM.states[new_state.next].animation;
            let options = new_state.options;

            console.log(prev,'to',next)

            // console.log('CharacterController::processInput: Transitioning from',prev,'to',next,'! Options:',options);

            this.animations[next].time = 0.0;
            this.animations[next].enabled = true;
            // this.animations[prev].setEffectiveWeight(1-options.effectiveWeight);
            this.animations[next].setEffectiveWeight(1.0);

            // if(0 && options.crossfade == true) this.animations[next].crossFadeFrom(this.animations[prev], options.crossFadeDuration, options.crossFadeWarp);
            // this.animations[prev].fadeOut(0.5)
            // this.animations[next].fadeIn(0.5)
            this.animations[next].play()
            this.animations[prev].stop()
            // console.log('Playing animation:',next)

            

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
            this.velocity = Math.min(this.velocity+0.01, 0.6);
        }

        this.entity.translateZ(this.velocity)

        if(this.input.keys['ArrowRight'] == true) {this.entity.rotation.y -= Math.PI/40;}
        else if(this.input.keys['ArrowLeft'] == true) this.entity.rotation.y += Math.PI/40
    }


    update(){

        this.camera.update(this.entity)

        this.processInput(this.input.keys)

        this.updateVelocity()

        if(this.state == 'forehand'){
            if(this.animations['forehand'].time > 0.8 && this.animations['forehand'].time < 1){
                if(DISC.inHand) DISC.throw()
            }
        }
        
    }
}

class CharacterControllerInput {
    constructor(controller){
        this.controller = controller
        this.keys = {}
        let inp_keys = ['KeyQ','KeyW','KeyE','KeyA','KeyS','KeyD','KeyH','KeyJ','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']
        // let inp_keys = ['q','w','e','a','s','d','h','j',' ','shift','arrowup','arrowdown','arrowleft','arrowright']
        for(let inp of inp_keys) this.keys[inp] = false;

        document.addEventListener('keydown',(e)=>{
            let k = e.code//.toLowerCase()
            if(this.keys[k] != undefined){
                this.keys[k] = true;
            }
        })
        document.addEventListener('keyup',(e)=>{
            let k = e.code//.toLowerCase()
            if(this.keys[k] != undefined){
                this.keys[k] = false;
            }

        })
    }
}

class FiniteStateMachine {
    constructor(controller, states){
        this.controller = controller
        console.log('Init FSM: Controller =>',this.controller)
        this.currentState = 'idle'

        this.special_rules = {'vertical': [{function_check: x => (x.time > 2.2), state: 'idle'}]}

        this.states = {}
        for(let s in states){
            this.states[s] = new FSMState(s,states[s])
        }

        console.log('FSM: States =>',this.states)
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
        // console.log('current state:',this.currentState)
        let timeout = this.states[this.currentState].timeout;
        if(timeout != null) {
            let anim = this.states[this.currentState].animation

            if (this.controller.animations[anim].time > timeout[0]){
                console.log('Timeout transition! ==>', timeout[1])
                let res = {
                    prev: this.currentState,
                    next: timeout[1],
                    options: {}
                }

                this.currentState = timeout[1]

                return res;
            }
        }

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
    constructor(name, state_props){
        let anim = state_props[0]
        let timeout = state_props[1]

        this.name = name;
        this.animation = anim;
        this.timeout = timeout;
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


/*


Player States:

idle, jogging, running, idle_vertical, jogging_vertical, running_vertical
shuffle_idle, shuffle_left, shuffle_right
holding_disc_center, holding_disc_forehand, holding_disc_backhand, throwing_disc_forehand, throwing_disc_backhand






*/

var PLAYER;


var _idle = 'idle'
var _jogging = 'jogging'
var _running = 'running'
var _jump = 'jump_catch'
var _hold_center = 'hold_disc_center'
var _hold_fore = 'hold_disc_forehand'
var _hold_back = 'hold_disc_backhand'
var _throw_fore = 'forehand'

const keys = {
    a: 'KeyA',
    q: 'KeyQ',
    w: 'KeyW',
    e: 'KeyE',
    space: 'Space',
    Lshift: 'ShiftLeft',
    Rshift: 'ShiftRight',
    h: 'KeyH',
    t: 'KeyT',
    j: 'KeyJ',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
}


const player_states = {
    // state_name: [anim_name, timeout]

    'idle': [_idle, null],
    'jogging': [_jogging, null],
    'running': [_running, null],
    'idle_vertical': [_jump, null],
    'jogging_vertical': [_jump, [2, 'jogging']],
    // 'running_vertical': ['jump_catch', [2, 'running']],
    
    'holding_disc_center': [_hold_center, null],
    'holding_disc_forehand': [_hold_fore, null],
    'holding_disc_backhand': [_hold_back, null],
    'throwing_disc_forehand': [_throw_fore, [1.3, 'idle']],
    // 'throwing_disc_backhand': ['throwing_disc_backhand',

}

const player_transitions = [
    ['idle', {true: [keys.up], false: []}, 'jogging'],
    ['idle', {true: [keys.up,keys.Lshift], false: []}, 'running'],
    ['idle', {true: [keys.space], false: [keys.up,keys.Lshift]}, 'idle_vertical'],
    ['idle', {true: [keys.space,keys.Lshift], false: [keys.up]}, 'throwing_disc_forehand'],

    ['jogging', {true: [keys.up,keys.Lshift], false: []}, 'running'],
    ['jogging', {true: [keys.up,keys.space], false: []}, 'jogging_vertical'],
    ['jogging', {true: [], false: [keys.up]}, 'idle'],

    ['running', {true: [keys.up], false: [keys.Lshift]}, 'jogging'],
    ['running', {true: [], false: [keys.up]}, 'idle'],

    ['idle_vertical', {true: [], false: [keys.space]}, 'idle'],

    ['idle', {true: [keys.h], false: [keys.up,keys.Lshift,keys.space]}, 'holding_disc_center'],
    ['holding_disc_center', {true: [keys.j], false: [keys.q,keys.e]}, 'idle'],
    
    ['holding_disc_center', {true: [keys.e], false: []}, 'holding_disc_forehand'],
    ['holding_disc_center', {true: [keys.q], false: []}, 'holding_disc_backhand'],
    
    ['holding_disc_forehand', {true: [], false: [keys.e]}, 'holding_disc_center'],
    ['holding_disc_backhand', {true: [], false: [keys.q]}, 'holding_disc_center'],

    ['holding_disc_forehand', {true: [keys.space], false: []}, 'throwing_disc_forehand'],
    ['throwing_disc_forehand', {true: [], false: [keys.space]}, 'holding_disc_forehand'],
    


]

var bones = {};

loadModel('mannequin', function(model){
    PLAYER = new CharacterController(model, player_states)

    for(let s in player_states){
        loadAnimation(player_states[s][0], function(path,anim){
            console.log('adding animation:',path)
            PLAYER.addAnimation(path,anim)
        })
    }

    for(let trans of player_transitions){
        let [prev, req, next] = trans;
        // console.log('Prev:',prev,'Req:',req,'Next:',next)
        PLAYER.addTransition(prev, req, next)
    }


    let cur = [PLAYER.entity.children[1]];
    while(cur.length > 0){
        let bone = cur[0]
        bones[bone.name] = bone;
        cur = cur.slice(1);
        for(let c of bone.children) cur.push(c)
    }

    console.log('Bones:')
    console.log(bones)
})


// DISC
// -----------------------------------------------------------------------------

var disc_flight_params = {
    C1: 0.25,
    C2: 0.1,
    theta: 0,
    forceY: 7,
    forceX: -15,
    forceZ: 0,
    g: -9.8,
    throw_direction_x: -1,
    throw_direction_z: 0,
    time: 0.05
}

gui.add(disc_flight_params, 'C1').min(0.0)
gui.add(disc_flight_params, 'C2').min(0)
gui.add(disc_flight_params, 'theta').min(0.0).max(90)
gui.add(disc_flight_params, 'forceX').min(-30.0).max(30.0)
gui.add(disc_flight_params, 'forceY').min(-5.0).max(40.0)
gui.add(disc_flight_params, 'forceZ').min(-30.0).max(30.0)
gui.add(disc_flight_params, 'g').min(-20).max(-5)
gui.add(disc_flight_params, 'time').min(0.001).max(0.1)


class DiscEntity {
    constructor(model){
        
        // Model

        this.mesh = model;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.scale.set(0.005,0.005,0.005)
        scene.add(this.mesh)

        // Flight params

        this.velocity = new Vector3();

        this.angle_of_incidence = 0;
        this.angle_of_tilt = 0;

        this.spin_force = 1;

        this.throw_x = 0;
        this.throw_z = 0;

        // State

        this.inHand = true;
    }

    update(t = disc_flight_params.time){
        if(this.inHand){
            let bone = 'mixamorig1RightHand';
            // follow the position and rotation of the bone ^
            bones[bone].getWorldPosition(this.mesh.position);
            bones[bone].getWorldQuaternion(this.mesh.quaternion)

            // this.mesh.rotation.y += Math.PI/2

            // offsetting the center of the disc so the edge is in the hand
            this.mesh.translateY(1.5)
            this.mesh.translateZ(0.3)
        }

        else{
            // in flight

            /*

            Case 1: f = Wsin(a-b), f' = Wcos(a-b)
                    l1 = fcos(a)
                    d1 = fsin(a)
                    l2 = f'cos(a)
                    d2 = f'sin(a)
            
            Case 2: f = Wsin(b-a), f' = Wcos(b-a)
                    l1 = -fcos(a)
                    d1 = -fsin(a)
                    l2 = f'cos(a)
                    d2 = f'sin(a)
            
            Case 3: f = Wsin(a+b), f' = Wcos(a+b)
                    l1 = fcos(a)
                    d1 = fsin(a)
                    l2 = f'cos(a)
                    d2 = f'sin(a)
            
            Case 4: f = Wsin(180 - (a+b)), f' = Wcos(180 - (a+b))
                    l1 = fcos(a)
                    d1 = fsin(a)
                    l2 = f'cos(a)
                    d2 = f'sin(a)
            
            

            */

            let v = this.velocity;
            let p = this.mesh.position;

            let W = v.length() // velocity magnitude


            let AOI = this.angle_of_incidence;
            let AOM = this.velocity.angleTo(new Vector3(v.x, 0, v.z))

            if(v.y < 0) AOM *= -1;

            let f1,f2,h,l1,l2,d1,d2;
            let flight_case = -1;
            if(v.y > 0){
                // either case 1 or 2
                if (AOI > AOM) flight_case = 1;
                else flight_case = 2;
            }
            else{
                // either case 3 or 4;
                if(AOI + AOM < Math.PI / 2) flight_case = 3;
                else flight_case = 4;
            }

            switch(flight_case){
                
                case 1:
                    f1 = W * sin(AOI - AOM);
                    h = W * cos(AOI - AOM);
                    f2 = disc_flight_params.C1 * h;

                    
                    break;
                
                case 2:
                    f1 = - W * sin(AOM - AOI);
                    h = W * Math.cos(AOM - AOI);
                    f2 = disc_flight_params.C1 * h;

                    break;
                
                case 3:
                    f1 = W * sin(AOI + AOM);
                    h = W * cos(AOI + AOM);
                    f2 = disc_flight_params.C1 * h;

                    break;
                
                case 4:
                    f1 = W * sin(Math.PI - (AOI + AOM));
                    h = W * cos(Math.PI - (AOI + AOM));
                    f2 = disc_flight_params.C1 * h;

                    break;
                
                
            }

            l1 = f1 * cos(AOI);
            d1 = Math.abs(f1 * sin(AOI));
            
            l2 = f2 * cos(AOI);
            d2 = f2 * sin(AOI);


            // console.log('AOM:',AOM)

            let lift = l1 + l2;
            let drag = d1 + d2;


            // console.log('Lift: ',lift - disc_flight_params.g, 'Drag: ',drag)
            // console.log('AOM:',AOM*180/Math.PI,'F speed:',Math.sqrt(v.x*v.x+v.z+v.z), 'U speed:', v.y, 'Lift:',lift,'Drag:',drag,'Upwards F:',lift-9.8)

            let P = new Vector3(); // new position
            let V = new Vector3();

            // update XZ velocities

            // for now, no Z velocity;


            let x_sign = this.throw_x >= 0 ? 1 : -1
            V.x = v.x - (drag * t) * this.throw_x;
            let z_sign = this.throw_z >= 0 ? 1 : -1
            V.z = v.z - (drag * t) * this.throw_z;

            // console.log('Drag:',drag,'Lift:',lift);


            // console.log('Upward Force:',lift - disc_flight_params.g);
            
            // update velocity

                // s = ut + Ft^2/2
                // F = G + L
            let F = disc_flight_params.g + lift;
            let s = (v.y * t) + (t*t*F/2)

                // v^2 = 2Fs + u^2

            if(s > 0){
                // still moving upwards, so +ve
                V.y = Math.sqrt(2*F*s + (v.y * v.y))
            }
            else{
                // moving downwards => -ve 
                V.y = -Math.sqrt(2*F*s + (v.y * v.y))
                
            }

            if(V.x == 0 && V.z == 0){
                // console.log('Became Zero!')
            }
            // console.log(V.y)
            this.velocity = V
            // this.velocity.y = V.y


            // update position



            P.x = (p.x + (V.x * t));
            P.y = (p.y + (V.y * t));
            P.z = (p.z + (V.z * t));

            // console.log('old position:',p.x,p.y,p.z)
            // console.log('new position:',P.x,P.y,P.z)

            this.mesh.position.x = P.x
            this.mesh.position.y = P.y
            this.mesh.position.z = P.z


            let look_vector = new Vector3();
            if(AOI == 0) look_vector.set(0,1,0);
            else{
                look_vector.set(-this.throw_x, 1/Math.tan(AOI), -this.throw_z);
            } 
            // console.log('looking at:',look_vector.x,look_vector.y,look_vector.z);
            look_vector.x += this.mesh.position.x
            look_vector.y += this.mesh.position.y
            look_vector.z += this.mesh.position.z

            this.mesh.lookAt(look_vector)


            if(P.y < 0.5){
                this.inHand = true;
                // this.mesh.position.set(0,5,0)
                this.velocity.set(0,0,0);
            }



        }


        
    }

    throw(start_pos = new Vector3(0,5,0), direction = PLAYER.entity.rotation, speed = 10 * PLAYER.throw_speed, y_force = 5){
        console.log('throwing')
        let angle = direction.y;
        let x_comp = Math.sin(angle)
        let z_comp = Math.cos(angle)

        this.angle_of_incidence = disc_flight_params.theta * Math.PI / 180;

        this.velocity.x = speed * x_comp;
        this.velocity.y = y_force;
        this.velocity.z = speed * z_comp;

        // setVector(this.mesh.position, start_pos)

        this.inHand = false;

        this.mesh.rotation.set(-Math.PI/2,0,0)
        if(this.velocity.x == 0 && this.velocity.z == 0){
            this.throw_x = disc_flight_params.throw_direction_x;
            this.throw_z = disc_flight_params.throw_direction_z;
        }
        else{
            this.throw_x = this.velocity.x / sqrt(Math.pow(this.velocity.x,2) + Math.pow(this.velocity.z,2))
            this.throw_z = this.velocity.z / sqrt(Math.pow(this.velocity.x,2) + Math.pow(this.velocity.z,2))

            disc_flight_params.throw_direction_x = this.throw_x;
            disc_flight_params.throw_direction_z = this.throw_z;
        }

        console.log('throwing to:',this.throw_x,this.throw_z)

        
        
    }
}

var DISC;

document.addEventListener('keydown', e => {
    if(e.key.toLowerCase() == 't'){
        DISC.throw()
    }
    else if(e.key == '1'){
        PLAYER.animations['throw_disc_forehand'].play();
    }
})

document.addEventListener('keyup', e => {
    if(e.key == '2'){
        PLAYER.animations['throw_disc_forehand'].stop();
    }
})

loadModel('disc', function(model){
    // model.scale.set(0.05,0.05,0.05);
    DISC = new DiscEntity(model);
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

        DISC.update()
    }
    catch(e){console.log(e)}
    controls.update()
    try{renderer.render(scene, PLAYER.camera.camera)}
    catch(e){renderer.render(scene, camera)}


    


    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
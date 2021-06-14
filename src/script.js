// import io from 'socket.io-client/dist/socket.io';
// const socket = io("http://localhost:9000");


import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import { AnimationMixer, Vector2, Vector3 } from 'three'

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

const init_width = window.innerWidth
const init_height = window.innerHeight
// console.log(init_width, init_height)

// Lights

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(-100,100,0)

directionalLight.castShadow = true;
directionalLight.shadow.camera.top = 500;
directionalLight.shadow.camera.left = 500;
directionalLight.shadow.camera.bottom = -500;
directionalLight.shadow.camera.right = -500;

directionalLight.shadow.mapSize.set(4096,4096)

scene.add(directionalLight)

const hemisphereLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.8 );
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
        scene.add(this.camera)


        this.tot_w = 0.22 * init_width / 1920
        this.tot_h = 0.11 * init_height / 981


        this.speed_bar = this.createHUD({type: 'plane', width: 20, height: 2}, new THREE.MeshBasicMaterial({color:'black'}), {x:0,y:2})
        this.speed_amt = this.createHUD({type: 'plane', width: 19.5, height: 1.5}, new THREE.MeshBasicMaterial({color:'green'}), {x:0.25,y:1.75})

        this.AOT = this.createHUD({type: 'plane', width: 10, height: 1}, new THREE.MeshBasicMaterial({color: 'black'}), {x:0,y:50})



        this.test_circle = this.createHUD({type: 'circle', radius: 20, angle: 10}, new THREE.MeshBasicMaterial({color:'blue'}),{x:0,y:4})

    }

    createHUD(dim, mat, pos){       // format: dim = {type, width: w%, height: h%}, pos = {x,y} (for top-left corner)
        let mesh, center;
        if(dim.type == 'plane'){
            let w = dim.width * this.tot_w / 100
            let h = dim.height * this.tot_h / 100
            mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(w,h), mat);
            center = true;
        }
        else if(dim.type == 'circle'){
            // mesh = new THREE.Mesh(new THREE.CircleGeometry(0.001), new THREE.LineBasicMaterial())
            // mesh.position.set(0,0,-0.1)
            center = false;
            let geometry = new THREE.CircleGeometry( dim.radius * this.tot_w/100, 64, 0, dim.angle);
            mesh = new THREE.Mesh( geometry, mat );

        }
        this.camera.add(mesh);
        mesh.position.set(0,0,-0.1)
        // console.log(mesh)
        this.placeHUD(mesh, pos, center);

        return mesh;
    }

    placeHUD(mesh, screen_loc, center=true){
        // screen_loc = (x,y) as %

        // x: 0% = -0.11 for the left end
        //  100% = +0.11 for the right end

        // console.log('mesh params:',w,h)

        let final_x = -0.11 + screen_loc.x * 0.22 / 100 //+ w/2
        let final_y = -0.055 + screen_loc.y * 0.11 / 100 //- h/2

        // console.log('final:',final_x,final_y)


        
        if(center){
            let w = mesh.geometry.parameters.width
            let h = mesh.geometry.parameters.height

            let ws = mesh.scale.x
            let hs = mesh.scale.y


            mesh.position.x = final_x * init_width / 1920 + w*ws/2
            mesh.position.y = final_y * init_height / 981 - h*hs/2
        }
        else{
            mesh.position.x = final_x * init_width / 1920
            mesh.position.y = final_y * init_height / 981
        }

        

    }



    update(obj){
        let rot = obj.rotation.y;
        let z_comp = Math.cos(rot);
        let x_comp = Math.sin(rot);
        // // console.log(x_comp,z_comp)

        let bone = 'mixamorig1Hips'
        // this.camera.position.x = bones[bone].getWorldPosition(new Vector3).x - 20*x_comp;
        this.camera.position.x = obj.position.x - 20*x_comp;
        // this.camera.position.z = bones[bone].getWorldPosition(new Vector3).z - 20*z_comp;
        this.camera.position.z = obj.position.z - 20*z_comp;

        this.camera.lookAt(obj.position.x + 20*x_comp, 0, obj.position.z + 20*z_comp)

        // console.log(this.camera.position.x, this.speed_bar.position.x)

        this.speed_amt.scale.x = this.controller.throw_speed / 3;

        this.placeHUD(this.speed_amt, {x:0.25,y:1.75})
        

        let tl = disc_flight_params.theta * Math.PI/180
        if(tl != this.test_circle.geometry.parameters.thetaLength){
            // console.log('changing to',tl)
            this.camera.remove(this.test_circle)
            this.test_circle = this.createHUD({type: 'circle', radius: 20, angle: tl}, new THREE.MeshBasicMaterial({color:'blue'}),{x:0,y:4})
        }

        if(this.controller.input.keys[keys.q] == true){
            THROW.AOT = Math.max(-Math.PI/3,THROW.AOT-0.01)
        }
        else if(this.controller.input.keys[keys.r] == true){
            THROW.AOT = Math.min(Math.PI/3,THROW.AOT+0.01)
        }

        this.AOT.rotation.z = -THROW.AOT;

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

        this.throw_speed = 0;


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

        if (inp['Space'] == true){
            this.throw_speed = Math.min(this.throw_speed + 0.05, 3);
        }

        else{
            if(this.throw_speed > 0.01 && DISC.inHand == true){
                DISC.throw();
            }
            else
                this.throw_speed = 0.01;
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
        let inp_keys = ['KeyQ','KeyW','KeyE','KeyR','KeyA','KeyS','KeyD','KeyH','KeyJ','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']
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
    r: 'KeyR',
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
    // ['idle', {true: [keys.space], false: [keys.up,keys.Lshift]}, 'idle_vertical'],
    // ['idle', {true: [keys.space,keys.Lshift], false: [keys.up]}, 'throwing_disc_forehand'],

    ['jogging', {true: [keys.up,keys.Lshift], false: []}, 'running'],
    ['jogging', {true: [keys.up,keys.space], false: []}, 'jogging_vertical'],
    ['jogging', {true: [], false: [keys.up]}, 'idle'],

    ['running', {true: [keys.up], false: [keys.Lshift]}, 'jogging'],
    ['running', {true: [], false: [keys.up]}, 'idle'],

    ['idle_vertical', {true: [], false: [keys.space]}, 'idle'],

    ['idle', {true: [keys.h], false: [keys.up,keys.Lshift,keys.space]}, 'holding_disc_center'],
    ['holding_disc_center', {true: [keys.j], false: [keys.q,keys.e]}, 'idle'],
    
    ['holding_disc_center', {true: [keys.e], false: []}, 'holding_disc_forehand'],
    ['holding_disc_center', {true: [keys.w], false: []}, 'holding_disc_backhand'],
    
    ['holding_disc_forehand', {true: [], false: [keys.e]}, 'holding_disc_center'],
    ['holding_disc_backhand', {true: [], false: [keys.w]}, 'holding_disc_center'],

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
    C2: 3,
    C3: -5,
    theta: 0,
    forceY: 7,
    forceX: -15,
    forceZ: 0,
    AOT: Math.PI/8,
    g: -7,
    throw_direction_x: -1,
    throw_direction_z: 0,
    time: 0.05
}

gui.add(disc_flight_params, 'C1').min(0.0)
gui.add(disc_flight_params, 'C2')
gui.add(disc_flight_params, 'C3')
gui.add(disc_flight_params, 'theta').min(0.0).max(90)
gui.add(disc_flight_params, 'AOT').min(-Math.PI/2).max(Math.PI/2)
gui.add(disc_flight_params, 'forceX').min(-30.0).max(30.0)
gui.add(disc_flight_params, 'forceY').min(-5.0).max(40.0)
gui.add(disc_flight_params, 'forceZ').min(-30.0).max(30.0)
gui.add(disc_flight_params, 'g').min(-20).max(-5)
gui.add(disc_flight_params, 'time').min(0.001).max(0.1)




var THROW = {
    direction: 0,       // angle on XZ plane
    forward_speed: 1,   // horizontal component
    upward_speed: 1,    // vertical component
    AOI: 0,
    AOT: 0
}

function updateThrowDetails(data){
    if(data.direction != undefined){
        THROW.direction = data.direction;
    }
    if(data.forward_speed != undefined){
        THROW.forward_speed = data.forward_speed;
    }
    if(data.upward_speed != undefined){
        THROW.upward_speed = data.upward_speed;
    }
    if(data.AOI != undefined){
        THROW.AOI = data.AOI;
    }
    if(data.AOT != undefined){
        THROW.AOT = data.AOT;
    }
}


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

        this.throw_side = 0;

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

            let AOT = THROW.AOT           // angle of tilt




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


            // let x_sign = this.throw_x >= 0 ? 1 : -1
            // let z_sign = this.throw_z >= 0 ? 1 : -1
            // V.z = v.z - (drag * t) * this.throw_z;

            let translation = disc_flight_params.C2 * sin(AOT);

            let side_x_comp = -this.throw_z;
            let side_z_comp = this.throw_x;

            this.throw_side += translation * t;

            V.x = v.x - ( (drag * t) * this.throw_x ) //+ ( this.throw_side * side_x_comp);
            V.z = v.z - ( (drag * t) * this.throw_z ) //+ ( this.throw_side * side_z_comp);


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



            P.x = (p.x + (V.x * t) + this.throw_side * t * side_x_comp);
            P.y = (p.y + (V.y * t));
            P.z = (p.z + (V.z * t) + this.throw_side * t * side_z_comp);

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

            // add side vector based on AOT

            // change lookvactor's X-Z values by moving them to the side
            let side_look = Math.tan(AOT);
            look_vector.x += side_look * side_x_comp
            look_vector.z += side_look * side_z_comp

            this.mesh.lookAt(look_vector)
            // this.mesh.rotateOnAxis(new Vector3(0,1,1).normalize(), -AOT)
            // this.mesh.rotation.set(Math.PI/2,Math.PI/2,0)

            // this.mesh.rotation.y = Math.PI/2


            if(P.y < 0.5){
                this.inHand = true;
                // this.mesh.position.set(0,5,0)
                console.log('ended with vy:',this.velocity.y)
                this.velocity.set(0,0,0);
            }



        }


        
    }

    throw(speed = 10 * PLAYER.throw_speed){
        console.log('throwing')

        let throw_data = computeArc();

        let angle = throw_data.direction;
        let y_force = throw_data.y;


        let x_comp = Math.cos(angle)
        let z_comp = Math.sin(angle)

        this.angle_of_incidence = disc_flight_params.theta * Math.PI / 180;

        this.velocity.x = speed * x_comp;
        this.velocity.y = y_force;
        this.velocity.z = speed * z_comp;

        // setVector(this.mesh.position, start_pos)

        this.inHand = false;

        // this.mesh.rotation.set(-Math.PI/2,0,Math.PI/2)
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

        let init_angle = throw_data.init;

        // let side_velocity = Math.sin(init_angle - )

        // let sign = disc_flight_params.AOT > 0 ? 1 : -1;
        // this.throw_side = disc_flight_params.C3 * sign;

        this.throw_side = 0;

        // this.mesh.rotation.z = Math.PI/4
    }


    getArc(){
        let ang = -PLAYER.entity.rotation.y + Math.PI/2;
        
        // console.log('Init angle:',ang)

        let res = {}
        let i=0;
        arcPoints = [];
        for(let t = ang - 5*Math.PI/12; t <= ang + 5*Math.PI/12; t += Math.PI/48){
            // console.log('computing for angle:',(t-ang)*180/Math.PI)
            let v = new Vector2(cos(t),sin(t)).multiplyScalar(10);
            let v3 = new Vector3(v.x,0,v.y).add(this.mesh.position);
            // console.log(v3)
            res[t] = screenXY(v3,PLAYER.camera.camera)

            arcPoints[i] = v3;
            i++;
        }
        return {
            init: ang,
            res: res
        };
    }
}

var arcPoints = []

var arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
var arcLine = new THREE.Line(arcGeometry, new THREE.LineBasicMaterial())
scene.add(arcLine)
// arcLine.geometry.attributes.position.needsUpdate = true;

var DISC;

document.addEventListener('keydown', e => {
    if(e.key.toLowerCase() == 't'){
        DISC.throw()
    }
    else if(e.key == '1'){
        PLAYER.animations['throw_disc_forehand'].play();
    }
    else if(e.key == 'o'){
        DISC.inHand = true;
        DISC.velocity.set(0,0,0);
    }
    else if(e.key == 'p'){
        let discscreen = screenXY(DISC.mesh.position, PLAYER.camera.camera)
        console.log('Mouse:',screenMouse.x,screenMouse.y)
        console.log('Disc:',discscreen.x,discscreen.y)
    }
    // else if(e.key == 'q'){
    //     THROW.AOT += 0.1
    // }
    // else if(e.key == 'r'){
    //     THROW.AOT -= 0.1
    // }
})

function computeArc(){
    let arc = DISC.getArc();

    let init_angle = arc.init;
    let res = arc.res;
    // console.log(res);
    let tar = screenMouse.x;
    // console.log('Target:',tar)
    let ans;
    let min = Infinity;
    let ind;
    let i=0;
    for(let ang in res){
        // console.log(ang,res[ang])
        if(min > Math.abs(res[ang].x - tar)){
            min = Math.abs(res[ang].x - tar)
            ans = ang
            ind = i;
        }
        i++;
    }
    let y_change = (res[ans].y - screenMouse.y) * 0.04;
    y_change = Math.min(y_change, 15);
    y_change = Math.max(y_change, -3);

    arcPoints[ind].y += y_change;

    // console.log('Index:',ind,arcPoints.map(x=>x.y))
    // arcPoints = [DISC.mesh.position, arcPoints[ind]];
    scene.remove(arcLine)
    arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints)
    arcLine = new THREE.Line(arcGeometry,new THREE.LineBasicMaterial());
    scene.add(arcLine)

    return {
        direction: ans,
        y: y_change,
        init: init_angle
    }

    // console.log('Angle:',ans * 180 / Math.PI)
}

document.addEventListener('keyup', e => {
    if(e.key == '2'){
        PLAYER.animations['throw_disc_forehand'].stop();
    }
})

loadModel('disc1', function(model){
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

    console.log('new width:',sizes.width)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const screenMouse = new THREE.Vector2();

function onMouseMove( event ) {

	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    screenMouse.x = event.clientX;
    screenMouse.y = event.clientY;

    
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

    // try{raycaster.setFromCamera( mouse, PLAYER.camera.camera );}
    // catch(e){raycaster.setFromCamera( mouse, camera );}

	// // calculate objects intersecting the picking ray
	
    // else onfield = false

    // // console.log(delta)
    // if (mixer) mixer.update(0.0005);

    // Render
    try{
        PLAYER.mixer.update(0.02)
        PLAYER.update();

        DISC.update()

        if(DISC.inHand == true){
            computeArc()
        }

        
    }
    catch(e){console.log(e)}
    controls.update()
    try{renderer.render(scene, PLAYER.camera.camera)}
    catch(e){renderer.render(scene, camera)}


    


    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()



function screenXY(obj,camera){

    var vector = obj.clone();
    var windowWidth = window.innerWidth;
    var minWidth = 1280;
  
    if(windowWidth < minWidth) {
      windowWidth = minWidth;
    }
  
    var widthHalf = (windowWidth/2);
    var heightHalf = (window.innerHeight/2);
  
    vector.project(camera);
  
    vector.x = parseInt(( vector.x * widthHalf ) + widthHalf);
    vector.y = parseInt(- ( vector.y * heightHalf ) + heightHalf);
    vector.z = 0;
  
    return vector;
  
  };
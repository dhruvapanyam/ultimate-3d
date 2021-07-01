import io from 'socket.io-client';
console.log(process.env.NODE_ENV)
const socket = process.env.NODE_ENV === 'production' ? io() : io('http://localhost:8000/');

// ------------------------------ THREE.JS -------------------------------


import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import { AnimationMixer, Vector2, Vector3 } from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

import {keys, player_states, player_transitions, velocity_handler, side_velocity_handler, player_animations} from './state_manager'


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

directionalLight.shadow.mapSize.set(2048,2048)

scene.add(directionalLight)

const hemisphereLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1 );
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


// var controls = new OrbitControls(camera, renderer.domElement)
// controls.target.set(0,0,0)
// controls.enableDamping = true
// controls.maxPolarAngle = Math.PI / 2 - 0.1
// controls.zoomSpeed = 0.5

// Objects
// --------------------------------------------------------------------------------------------------------

const PLANE = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000,1000), new THREE.MeshStandardMaterial({map: grass}))
PLANE.rotation.x = - Math.PI/2
PLANE.receiveShadow = true;
scene.add(PLANE)


const fieldLength = 500
const fieldWidth = 185
const endZone = 90

const fieldPoints = [
    new Vector3(-fieldWidth / 2, 0, -fieldLength / 2),
    new Vector3(-fieldWidth / 2, 0, fieldLength / 2),
    new Vector3(fieldWidth / 2, 0, fieldLength / 2),
    new Vector3(fieldWidth / 2, 0, -fieldLength / 2),
    new Vector3(-fieldWidth / 2, 0, -fieldLength / 2),
    new Vector3(-fieldWidth / 2, 0, -fieldLength / 2 + endZone),
    new Vector3(fieldWidth / 2, 0, -fieldLength / 2 + endZone),
    new Vector3(fieldWidth / 2, 0, fieldLength / 2 - endZone),
    new Vector3(-fieldWidth / 2, 0, fieldLength / 2 - endZone),
]

const fieldGeometry = new THREE.BufferGeometry().setFromPoints(fieldPoints);
const fieldLineMaterial = new THREE.LineBasicMaterial({linewidth: 4, color: 'white'})

const FIELD = new THREE.Line(fieldGeometry, fieldLineMaterial)
scene.add(FIELD)


var ANIMATIONS = {};
var MODELS = {};


var asset_loaders = {
    'animations': 0,
    'disc': 0
}

loadModel('disc1', model=>{MODELS['disc'] = model})

function init_assets(character){
    asset_loaders[character] = 0
    loadModel(character, model=>{MODELS[character] = model; asset_loaders[character] = 100;})
}

for(let character of ['shannon']){
    init_assets(character)
}

loadAnimation(player_animations, anims=>{for(let a in anims) ANIMATIONS[a] = anims[a]; asset_loaders['animations'] = 100});



function loadModel(model_path, callback){
    fbxLoader.load(
        './models/'+model_path+'.fbx',
        function(obj){
            // console.log(model_path,obj)
            console.log('loadModel')
            obj.scale.set(0.05,0.05,0.05)
            obj.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}})
            callback(obj)
        }
    )
}

function loadAnimation(anim_set, callback){
    fbxLoader.load(
        './models/animations/mannequin/animations.fbx',
        function(obj){
            console.log('loadAnimation')
            let anims = {}
            for(let clip of obj.animations){
                let cname = clip.name.split('Armature|')[1];
                if(anim_set.has(cname)){
                    // console.log('Extracting animations clip:',cname,clip)
                    anims[cname] = clip;

                }
            }
            callback(anims)

        }
    )
}




// set of IDs of players in the room currently
var online_players = new Set();




class ThirdPersonCamera {
    constructor(controller){
        this.controller = controller;
        this.camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 1000)
        this.camera.position.y = 15
        scene.add(this.camera)

        this.angle_offset = 0;


        this.tot_w = 0.22 * init_width / 1920
        this.tot_h = 0.11 * init_height / 981


        this.speed_bar = this.createHUD({type: 'plane', width: 20, height: 2}, new THREE.MeshBasicMaterial({color:'black'}), {x:0,y:2})
        this.speed_amt = this.createHUD({type: 'plane', width: 19.5, height: 1.5}, new THREE.MeshBasicMaterial({color:'green'}), {x:0.25,y:1.75})

        this.AOT = this.createHUD({type: 'plane', width: 10, height: 1}, new THREE.MeshBasicMaterial({color: 'black'}), {x:0,y:50})

        this.AOI = this.createHUD({type: 'circle', radius: 20, angle: 10}, new THREE.MeshBasicMaterial({color:'blue'}),{x:0,y:4})


        this.minimap = this.createHUD({type: 'plane', width: 37/3, height: 100/3}, new THREE.MeshBasicMaterial({color: 'white'}), {x:100-37/3, y:100/3})

        // endzones and central zone
        this.minimap_inner = [
            this.createHUD({type: 'plane', width: 0.99*37/3, height: 0.98*18/3}, new THREE.MeshBasicMaterial({color: 'green'}), {x:100-0.995*37/3, y:0.995*100/3}),
            this.createHUD({type: 'plane', width: 0.99*37/3, height: 0.98*64/3}, new THREE.MeshBasicMaterial({color: 'green'}), {x:100-0.995*37/3, y:0.991*82/3}),
            this.createHUD({type: 'plane', width: 0.99*37/3, height: 0.98*18/3}, new THREE.MeshBasicMaterial({color: 'green'}), {x:100-0.995*37/3, y:0.995*18/3}),
        ]
        //

        this.minimap_players = {}
        // for(let pid in PLAYERS){
        //     this.addMiniPlayer(pid)
        // }

        this.minimap_disc = this.createHUD({type: 'circle', radius: 0.2, angle: Math.PI*2}, new THREE.MeshBasicMaterial({color:'blue'}),{x:0,y:4})
        this.minimap_disc.position.set(0,0,0)
        this.minimap.add(this.minimap_disc)
       
        // console.log(this.minimap)

        this.HUD_objects = {speed:this.speed_bar, speedamt:this.speed_amt, aot:this.AOT, aoi:this.AOI}//, mini:this.minimap, mini1:this.minimap_inner[0],mini2:this.minimap_inner[1],mini3:this.minimap_inner[2]};
        for(let obj in this.HUD_objects){
            this.camera.remove(this.HUD_objects[obj])
        }

        // this.minimap_field = this.createHUD({type: 'plane', width: 0.9*37/3, height: 0.9*100/3}, new THREE.MeshBasicMaterial({color: 'white'}), {x:100-0.9*37/3, y:0.9*100/3})
    }

    addMiniPlayer(pid){
        console.log('adding to minimap:',pid)
        this.minimap_players[pid] = this.createHUD({type: 'circle', radius: 0.2, angle: Math.PI*2}, new THREE.MeshBasicMaterial({color:'red'}),{x:0,y:4})
        this.minimap_players[pid].position.set(0,0,0)
        this.minimap.add(this.minimap_players[pid])
    }

    removeMiniPlayer(pid){
        console.log('removing from minimap:',pid)
        this.minimap.remove(this.minimap_players[pid])
        delete this.minimap_players[pid];
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
        // // console.log(mesh)
        this.placeHUD(mesh, pos, center);

        return mesh;
    }

    placeHUD(mesh, screen_loc, center=true){
        // screen_loc = (x,y) as %

        // x: 0% = -0.11 for the left end
        //  100% = +0.11 for the right end

        // // console.log('mesh params:',w,h)

        let final_x = -0.11 + screen_loc.x * 0.22 / 100 //+ w/2
        let final_y = -0.055 + screen_loc.y * 0.11 / 100 //- h/2

        // // console.log('final:',final_x,final_y)


        
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
        let ang = obj.rotation.y;

        let dist_from_player = 30;

        let temp_x,temp_y,temp_z;

        let rot = ang + this.angle_offset

        if(PLAYER.state == 'turning_back'){
            let anim_elapsed = this.controller.animations['turn_back'].time;
            rot -= Math.PI * anim_elapsed/0.6
        }
        let z_comp = Math.cos(rot);
        let x_comp = Math.sin(rot);
        

        if(!PLAYER.holdingDisc() || PLAYER.throwingDisc()){
            // not holding disc, can move around.
            // if(gazeMouse.x != prevGazeMouse.x){
            //     this.angle_offset -= 1 * (gazeMouse.x - prevGazeMouse.x)
            //     prevGazeMouse.x = gazeMouse.x;
            //     // flag = 1
            // }
            this.angle_offset = -gazeMouse.x * 3;

            temp_y = 15 + ((gazeMouse.y - 0.4) * 6)

            let bone = new Vector3();
            this.controller.center_bone.getWorldPosition(bone);
            if(Math.abs(gazeMouse.y) > 0.3){
                dist_from_player = Math.max(5,dist_from_player*(1 - (Math.abs(gazeMouse.y) - 0.3)))
                
            }
            temp_x = bone.x - dist_from_player*x_comp
            temp_z = bone.z - dist_from_player*z_comp
        }
        else{
            // this.camera.position.y = 15;
            dist_from_player = 20;
            temp_x = DISC.mesh.position.x - dist_from_player*x_comp;
            temp_z = DISC.mesh.position.z - dist_from_player*z_comp;
            temp_y = 13;
        }
       
        this.camera.position.lerp(new Vector3(temp_x,temp_y,temp_z), 0.1);


        // if(this.controller.state != 'dive_right' && this.controller.state != 'dive_left'){

        if(this.controller.holdingDisc() && !this.controller.throwingDisc()){
            let look = DISC.mesh.position.clone().setY(5)
            look.x += 5 * sin(this.controller.entity.rotation.y)
            look.z += 5 * cos(this.controller.entity.rotation.y)
            
            this.camera.lookAt(look)
        }
        else{
            let look = this.controller.entity.position.clone();
            let ylook = 5;
            if(gazeMouse.y > 0.3) ylook = 5 - (gazeMouse.y - 0.3) * 5;
            else if(gazeMouse.y < -0.3) ylook = 5 - (gazeMouse.y + 0.3) * 8
            this.camera.lookAt(look.setY(ylook))
        }
        // }

        

        // // console.log(this.camera.position.x, this.speed_bar.position.x)




        if(DISC.state.playerID == this.controller.id){

            this.speed_amt.scale.x = THROW.forward_speed / 30;

            this.placeHUD(this.speed_amt, {x:0.25,y:1.75})
            

            let tl = THROW.AOI
            if(tl != this.AOI.geometry.parameters.thetaLength){
                // // console.log('changing to',tl)
                this.camera.remove(this.AOI)
                this.AOI = this.createHUD({type: 'circle', radius: 20, angle: tl}, new THREE.MeshBasicMaterial({color:'blue'}),{x:0,y:4})
                this.HUD_objects.aoi = this.AOI;
                if(DISC.state.playerID != this.controller.id) this.camera.remove(this.AOI);
            }

            // if(this.controller.input.keys[keys.q] == true){
            //     THROW.AOT = Math.max(-Math.PI/3,THROW.AOT-0.01)
            // }
            // else if(this.controller.input.keys[keys.r] == true){
            //     THROW.AOT = Math.min(Math.PI/3,THROW.AOT+0.01)
            // }

            this.AOT.rotation.z = -THROW.AOT;
        }

        // this.minimap_players[this.controller.id].position.x -= 0.001


        for(let pid in this.minimap_players){
            if(!online_players.has(parseInt(pid)) && !online_players.has(pid)) this.removeMiniPlayer(pid)
            // console.log(online_players.has(pid))
        }

        for(let pid of online_players){
            if(PLAYERS[pid] == undefined || PLAYERS[pid].loading == true) continue;

            if(this.minimap_players[pid] == undefined) this.addMiniPlayer(pid);
            // console.log(pid) 
            let scaleH = PLAYERS[pid].entity.position.z / (fieldLength/2);
            let scaleW = PLAYERS[pid].entity.position.x / (fieldWidth/2);

            if(Math.abs(scaleW) <= 1) this.minimap_players[pid].position.x = scaleW * -this.minimap.geometry.parameters.width / 2
            if(Math.abs(scaleH) <= 1) this.minimap_players[pid].position.y = scaleH * this.minimap.geometry.parameters.height / 2
        }

        let scaleH = DISC.mesh.position.z / (fieldLength/2);
        let scaleW = DISC.mesh.position.x / (fieldWidth/2);


        if(Math.abs(scaleW) <= 1) this.minimap_disc.position.x = scaleW * -this.minimap.geometry.parameters.width / 2
        if(Math.abs(scaleH) <= 1) this.minimap_disc.position.y = scaleH * this.minimap.geometry.parameters.height / 2

    }

}


const characters = {
    'mannequin': {
        bone: 1,
        anim_path: 'mannequin/',
        slice: 10
    },

    'sophie': {
        bone: 6,
        anim_path: 'mannequin/',
        slice: 9
    },

    'shannon': {
        bone: 0,
        anim_path: 'mannequin/',
        slice: 10
    }
}


const intro = 'idle_offence'

var prevPos = new Vector3();
class CharacterController {
    constructor(id, character, control=false){

        this.id = id;
        this.character = character;
        this.velocity = [0,0];
        this.loading = true;
        this.control = control;
    }

    loadAssets(){
        if(MODELS[this.character] != undefined){

            console.log('Loading assets for player',this.id)

            this.entity = MODELS[this.character]
            delete MODELS[this.character];
            init_assets(this.character)
            // this.entity.scale.set(0.0025,0.0025,0.0025)

            this.bones = {};
            let cur = [this.entity.children[characters[this.character].bone]];
            while(cur.length > 0){
                let bone = cur[0]
                bone.name = 'mixamorig1' + bone.name.slice(characters[this.character].slice);
                this.bones[bone.name] = bone;
                cur = cur.slice(1);
                for(let c of bone.children) cur.push(c)
            }

            // this.center_bone = this.bones[characters[this.character].rig];
            this.center_bone = this.bones['mixamorig1Hips'];

            // this.mixer = new THREE.AnimationMixer(this.entity.children[characters[this.character].bone])
            this.mixer = new THREE.AnimationMixer(this.entity.children[characters[this.character].bone])
            scene.add(this.entity)
            this.animations = {}

            // console.log('Controllable Player?',control)
            if(this.control == true){
                this.camera = new ThirdPersonCamera(this);
                this.input = new CharacterControllerInput(this)
                this.FSM = new FiniteStateMachine(this, player_states)

                for(let trans of player_transitions){
                    let [prev, req, next] = trans;
                    // // console.log('Prev:',prev,'Req:',req,'Next:',next)
                    this.addTransition(prev, req, next)
                }
            }
            else{
                this.current_anim = 'idle_offence'
            }


            this.state = 'idle'
            // this.velocity = velocity;

            // setVector(this.entity.position,position)
            // this.entity.rotation.y = rotation

            for(let clipname in ANIMATIONS){
                this.addAnimation(clipname, ANIMATIONS[clipname]);
            }
            asset_loaders['player'+String(this.id)] = 100;

            this.loading = false;

            // setInterval(()=>{
            //     this.broadcast()
            // },2000)
        }

        else{
            // console.log('Waiting for assets')
        }

    }

    updatePlayerPosition(){
        socket.emit('playerPosition', {id:this.id, position:this.entity.position})
    }
    updatePlayerRotation(){
        socket.emit('playerRotation', {id:this.id, rotation:this.entity.rotation.y})
    }
    updatePlayerVelocity(show=false){
        socket.emit('playerVelocity', {id:this.id, velocity:this.velocity, show:show})
    }

    broadcast(){
        this.updatePlayerPosition()
        this.updatePlayerRotation()
        this.updatePlayerVelocity()
    }

    addAnimation(path,anim){

        this.animations[path] = this.mixer.clipAction(anim)
        if(path == intro) this.animations[path].play();


        // // console.log(this)
    }


    addTransition(prev, req, next, options={}){
        // // console.log('CharacterController::addTransition: calling inner functions');
        this.FSM.addTransition(prev, req, next, options)
    }

    holdingDisc(){
        return DISC.state.playerID == this.id
    }

    throwingDisc(){
        return this.state == 'throwing_disc_forehand' || this.state == 'throwing_disc_backhand'
    }



    processInput(inp){

        if (inp[keys.space] == true){
            // this.throw_speed = Math.min(this.throw_speed + 0.05, 3);
            if(DISC.state.playerID == this.id) THROW.forward_speed = Math.min(THROW.forward_speed + 0.8, 30);
        }

        else{
            if(THROW.forward_speed > 0.5 && this.holdingDisc() && !this.throwingDisc()){
                // DISC.prepareThrow();
                // socket.emit('throw',THROW);

                // for(let obj in this.camera.HUD_objects){
                //     this.camera.camera.remove(this.camera.HUD_objects[obj]);
                // }
                // DISC.throw();
                // DISC.prepareThrow();

                console.log('preparing throw')
                DISC.prepareThrow();
            


                this.input.keys['catch_disc'] = false;
                this.input.keys['throw_disc'] = true;
                this.input.keys['threw_disc'] = false;
            }
            else
                if(!this.holdingDisc()) THROW.forward_speed = 0.5;
        }

        if (inp['ShiftLeft'] == true && DISC.state.playerID == this.id){
            THROW.AOI = (THROW.AOI + Math.PI/150) % (Math.PI/3);
        }

        if(inp[keys.c] == true){
            // console.log(DISC)
        }
        if((inp[keys.c] == true || inp[keys.j] == true) && DISC.state.location != 'hand'){
            let left_hand = new Vector3();
            let right_hand = new Vector3();

            this.bones['mixamorig1RightHand'].getWorldPosition(right_hand)
            this.bones['mixamorig1LeftHand'].getWorldPosition(left_hand)

            // mesh_center.y += 4;
            let catching_dist = 12;
            if(inp[keys.j] == true || left_hand.distanceTo(DISC.mesh.position) < catching_dist || right_hand.distanceTo(DISC.mesh.position) < catching_dist){

                socket.emit('discState',{location:'hand',playerID:this.id});

                for(let obj in this.camera.HUD_objects){
                    this.camera.camera.add(this.camera.HUD_objects[obj]);
                }

                this.input.keys['catch_disc'] = true;
                this.input.keys['throw_disc'] = false;
                this.input.keys['threw_disc'] = false;

                this.camera.angle_offset = 0;
                DISC.state.location = 'hand'
                DISC.state.playerID = this.id;
            }
        }

        let new_state = this.FSM.updateState(inp);

        if(new_state == 'throw'){
            // console.log('preparing throw')
            // DISC.prepareThrow();
            socket.emit('throw',THROW)
            DISC.throw();

            gazeMouse.x = 0
            prevGazeMouse.x = 0;

            for(let obj in PLAYER.camera.HUD_objects){
                PLAYER.camera.camera.remove(PLAYER.camera.HUD_objects[obj]);
            }

            PLAYER.input.keys['threw_disc'] = true;
            PLAYER.input.keys['throw_disc'] = false;
            PLAYER.input.keys['catch_disc'] = false;
        }
        else if(new_state == null) return;
        else {

            // if(new_state.)
            
            // need to transition to new_state  

            let prev = this.FSM.states[new_state.prev].animation;
            let next = this.FSM.states[new_state.next].animation;
            let options = new_state.options;

            socket.emit('playerState',{id:PLAYER_ID, state:next});
    

            console.log(prev,'to',next)

            // // console.log('CharacterController::processInput: Transitioning from',prev,'to',next,'! Options:',options);

            if(new_state.next == 'jogging_vertical') this.animations[next].time = 0.35;
            else this.animations[next].time = 0.0;
            this.animations[next].enabled = true;
            // this.animations[prev].setEffectiveWeight(1-options.effectiveWeight);
            this.animations[next].reset();
            this.animations[next].setEffectiveWeight(1.0);
            this.animations[next].setEffectiveTimeScale(1.0);

            // if(0 && options.crossfade == true) this.animations[next].crossFadeFrom(this.animations[prev], options.crossFadeDuration, options.crossFadeWarp);
            // this.animations[prev].fadeOut(0.5)
            // this.animations[next].fadeIn(0.5)

            if(prev == 'dive_right' || prev == 'dive_left'){
                this.entity.position.x = this.center_bone.getWorldPosition(new Vector3()).x
                this.entity.position.z = this.center_bone.getWorldPosition(new Vector3()).z
            }

            if(prev == 'turn_back'){
                this.entity.rotation.y += Math.PI
            }

            this.broadcast()

            // this.animations[next].play()
            // this.animations[next].fadeIn(0.2)
            // this.animations[prev].stop()


            // this.animations[next].crossFadeFrom(this.animations[prev], 0.2, true)

            this.animations[next].play()
            this.animations[prev].fadeOut(0.25)
            // this.animations[prev].stop()
            
            
            // // console.log('Playing animation:',next)

            

            this.state = new_state.next;

        }

        
        
    }

    updateVelocity(delta){
        let new_vel = [this.velocity[0], this.velocity[1]];

        if(velocity_handler[this.state] != undefined){
            let options = {
                cur_vel: this.velocity[0],
                anim_time: this.animations[this.FSM.states[this.state].animation].time
            }
            new_vel[0] = velocity_handler[this.state](options);
        }

        if(side_velocity_handler[this.state] != undefined){
            let options = {
                cur_vel: this.velocity[1],
                anim_time: this.animations[this.FSM.states[this.state].animation].time
            }
            new_vel[1] = side_velocity_handler[this.state](options);
        }

        // console.log(this.velocity[0] - new_vel[0]);
        // console.log(this.velocity)

        if(new_vel[0] != this.velocity[0] || new_vel[1] != this.velocity[1]){
            this.velocity = new_vel;
            // console.log('new velocity:',new_vel)
            this.updatePlayerVelocity(true)
        }

        let transZ = this.velocity[0] * delta
        let transX = this.velocity[1] * delta

        this.entity.translateZ(transZ)
        this.entity.translateX(transX)


        let flag = 0;
        if(this.input.keys[keys.d] == true) {this.entity.rotation.y -= Math.PI/60; flag = 1;}
        else if(this.input.keys[keys.a] == true) {this.entity.rotation.y += Math.PI/60; flag = 1;}
        if(flag){
            // socket.emit('playerRotation',{id:PLAYER_ID, rotation:this.entity.rotation.y})
            this.updatePlayerRotation()
        }

        // if(prevPos.distanceTo(this.entity.position) > 0) updatePlayerPosition(this.entity.position);
        prevPos = this.entity.position.clone();
    }


    update(delta){

        if(this.loading){
            this.loadAssets()
            return;
        }

        this.mixer.update(delta)
        this.camera.update(this.entity)
        this.updateVelocity(delta)
        this.processInput(this.input.keys)

        if(this.throwingDisc()){
            console.log('throwing')
        }

        if(this.holdingDisc()){
            if(!this.throwingDisc())
                computeArc(true)
        }
        else{
            scene.remove(arcLine)
        }        

        
    }

    updateRemote(delta){
        if(this.loading){
            this.loadAssets()
            return;
        }

        this.mixer.update(delta)

        // console.log(this.velocity)

        let transZ = delta * this.velocity[0]
        let transX = delta * this.velocity[1]
        this.entity.translateZ(transZ);
        this.entity.translateX(transX);
    }

    updateStateRemote(new_state){

        // console.log('changing state remotely ',this.state,'to',new_state)
        let prev = this.current_anim;
        let next = new_state
        // let options = new_state.options;

        console.log(prev,'to',next,'(remote)')

        // // console.log('CharacterController::processInput: Transitioning from',prev,'to',next,'! Options:',options);

        this.animations[next].time = 0.0;
        this.animations[next].enabled = true;
        // this.animations[prev].setEffectiveWeight(1-options.effectiveWeight);
        this.animations[next].setEffectiveWeight(1.0);

        // if(0 && options.crossfade == true) this.animations[next].crossFadeFrom(this.animations[prev], options.crossFadeDuration, options.crossFadeWarp);
        // this.animations[prev].fadeOut(0.5)
        // this.animations[next].fadeIn(0.5)
        this.animations[next].play()
        this.animations[prev].fadeOut(0.25)
        // this.animations[prev].stop()
        // // console.log('Playing animation:',next)

        

        this.current_anim = next;
    }
}

class CharacterControllerInput {
    constructor(controller){
        this.controller = controller
        this.keys = {}
        // let inp_keys = ['KeyQ','KeyW','KeyE','KeyR','KeyA','KeyC','KeyS','KeyD','KeyH','KeyJ','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','catch_disc','throw_disc','threw_disc']
        // let inp_keys = ['q','w','e','a','s','d','h','j',' ','shift','arrowup','arrowdown','arrowleft','arrowright']
        for(let inp in keys) this.keys[keys[inp]] = false;

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
        // console.log('Init FSM: Controller =>',this.controller)
        this.currentState = 'idle'

        // this.special_rules = {'vertical': [{function_check: x => (x.time > 2.2), state: 'idle'}]}

        this.states = {}
        for(let s in states){
            this.states[s] = new FSMState(s,states[s])
        }

        // console.log('FSM: States =>',this.states)
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
        // // // console.log('FSM::checkCollision: inp_key =',inp_key)
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
        // // // console.log('FSM::addTransition: entered function. Params:',prev,req,next,options);
        for(let inp_key in this.states[prev].transitions){
            // // // console.log('Checking collision with',inp_key)
            if(this.checkCollision(req, inp_key))
            {
                // // console.log('This transition:',prev,req,next,'is comparable to another transition')
                return null;
            }
        }
        // // console.log('FSM::addTransition: adding transition',req,next);
        this.states[prev].addTransition(req, next, options);
    }

    updateState(inp){

        // convert inp to standard form
        // then check if it exists in this.states[this.currentState].transitions

        let time_to_throw = false;

        let inp_key = null;
        // // console.log('current state:',this.currentState)
        let timeout = this.states[this.currentState].timeout;
        if(timeout != null) {
            let anim = this.states[this.currentState].animation

            if (this.controller.animations[anim].time > timeout[0]){
                // console.log('Timeout transition! ==>', timeout[1])
                if(timeout[1] == 'throw'){
                    if(DISC.state.playerID == PLAYER_ID)
                        time_to_throw = true;
                }
                else{
                    let res = {
                        prev: this.currentState,
                        next: timeout[1],
                        options: {}
                    }

                    this.currentState = timeout[1]

                    return res;
                }
            }
        }

        if(time_to_throw == true) return 'throw';

        // // // console.log('FSM::updateState: current state\'s transitions:',this.states[this.currentState])
        for(let k in this.states[this.currentState].transitions){
            // // // console.log('transition key:',k)
            if(this.satisfiesRequirements(inp, k)){
                // console.log('FSM::updateState: found inp_key match with',k)//this.states[this.currentState].transitions[k]);
                inp_key = k;
                // // console.log('Updating inp_key to',inp_key)
                break
            }
        }


        if(inp_key == null) return null;

        // // // console.log('reached here')

        let next_state = this.states[this.currentState].transitions[inp_key]
        let prev_state = this.currentState
        this.currentState = next_state.state

        let res = {
            prev: prev_state,
            next: this.currentState,
            options: next_state.options
        }

        // // // console.log('FSM::updateState: Returning:',res)

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
        // // console.log('FSMState::addTransition: added transition:', this.transitions[inp_key]);

    }


}




var PLAYERS = {};


var PLAYER;
var PLAYER_ID;

// var key_bindings = {
//     'Jog': keys.w,
//     'Run': keys.Lshift + ' ' + keys.w,
//     'Jog Backwards': keys.s,
//     'Turn Left': keys.a,
//     'Turn Right': keys.d,
//     'Look Left': 'mousemove',
//     'Look Right': 'mousemove',
//     'Catch': keys.c,
//     'Jump Catch': keys.space,
//     'Dive Left': keys.q,
//     'Dive Right': keys.e,

// }

// var bindings_gui = gui.addFolder('Key Bindings')

// for(let k in key_bindings){
//     bindings_gui.add(key_bindings, k)
// }



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
    time: 1
}

var disc_gui = gui.addFolder('Disc Parameters');
disc_gui.add(disc_flight_params, 'C1').min(0.0)
disc_gui.add(disc_flight_params, 'C2')
disc_gui.add(disc_flight_params, 'C3')
disc_gui.add(disc_flight_params, 'theta').min(0.0).max(90)
disc_gui.add(disc_flight_params, 'AOT').min(-Math.PI/2).max(Math.PI/2)
disc_gui.add(disc_flight_params, 'forceX').min(-30.0).max(30.0)
disc_gui.add(disc_flight_params, 'forceY').min(-5.0).max(40.0)
disc_gui.add(disc_flight_params, 'forceZ').min(-30.0).max(30.0)
disc_gui.add(disc_flight_params, 'g').min(-20).max(-5)
disc_gui.add(disc_flight_params, 'time').min(0.001).max(10)




var THROW = {
    direction: 0,       // angle on XZ plane
    forward_speed: 1,   // horizontal component
    upward_speed: 1,    // vertical component
    AOI: 0,
    AOT: 0
}



class DiscEntity {
    constructor(){
        
        // Model
        asset_loaders['disc'] = 20;

        loadModel('disc1',(model) => {

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
    
            this.state = {
                location: 'ground',
                playerID: null
            }

            asset_loaders['disc'] = 100;

        })

        
    }

    update(t = 0.05){
        if(this.state.location == 'hand'){
            let bone = 'mixamorig1RightHand';
            let pid = this.state.playerID;
            // follow the position and rotation of the bone ^
            PLAYERS[pid].bones[bone].getWorldPosition(this.mesh.position);
            PLAYERS[pid].bones[bone].getWorldQuaternion(this.mesh.quaternion)

            // this.mesh.rotation.y += Math.PI/2

            // offsetting the center of the disc so the edge is in the hand
            this.mesh.translateY(1.5)
            this.mesh.translateZ(0.3)
        }

        else if(this.state.location == 'ground'){

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
            if(AOT < -Math.PI/2 || AOT > Math.PI/2){
                
            }


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


            // // console.log('AOM:',AOM)

            let lift = l1 + l2;
            let drag = d1 + d2;


            // if(flight_case == 4){
            //     lift *= 2
            // }


            // // console.log('Lift: ',lift - disc_flight_params.g, 'Drag: ',drag)
            // // console.log('AOM:',AOM*180/Math.PI,'F speed:',Math.sqrt(v.x*v.x+v.z+v.z), 'U speed:', v.y, 'Lift:',lift,'Drag:',drag,'Upwards F:',lift-9.8)

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


            // // console.log('Upward Force:',lift - disc_flight_params.g);
            
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
                // // console.log('Became Zero!')
            }
            // // console.log(V.y)
            this.velocity = V
            // this.velocity.y = V.y


            // update position



            P.x = (p.x + (V.x * t) + this.throw_side * t * side_x_comp);
            P.y = (p.y + (V.y * t));
            P.z = (p.z + (V.z * t) + this.throw_side * t * side_z_comp);

            // // console.log('old position:',p.x,p.y,p.z)
            // // console.log('new position:',P.x,P.y,P.z)

            this.mesh.position.x = P.x
            this.mesh.position.y = P.y
            this.mesh.position.z = P.z


            let look_vector = new Vector3();
            if(AOI == 0) look_vector.set(0,1,0);
            else{
                look_vector.set(-this.throw_x, 1/Math.tan(AOI), -this.throw_z);
            } 
            // // console.log('looking at:',look_vector.x,look_vector.y,look_vector.z);
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
                this.state.location = 'ground'
                this.state.playerID = null;
                socket.emit('discState',{location:'ground'})
                // this.mesh.position.set(0,5,0)
                // // console.log('ended with vy:',this.velocity.y)
                this.mesh.position.y = 0.1;
                this.mesh.rotation.set(-Math.PI/2,0,0);
                this.velocity.set(0,0,0);
            }



        }


        
    }

    prepareThrow(){
        let arc = computeArc(true);
        THROW.direction = arc.direction;
        THROW.upward_speed = arc.y;
    }

    throw(){
        // // console.log('throwing')

        

        let angle = THROW.direction;
        let y_force = THROW.upward_speed;
        let speed = THROW.forward_speed;
        this.angle_of_incidence = THROW.AOI;
        this.angle_of_tilt = THROW.AOT;


        let x_comp = Math.cos(angle)
        let z_comp = Math.sin(angle)

        // this.angle_of_incidence = disc_flight_params.theta * Math.PI / 180;

        this.velocity.x = speed * x_comp;
        this.velocity.y = y_force;
        this.velocity.z = speed * z_comp;

        // setVector(this.mesh.position, start_pos)

        this.state.location = 'air'
        this.state.playerID = null;

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

        // // console.log('throwing to:',this.throw_x,this.throw_z)


        this.throw_side = 0;

    }


    getArc(){
        let ang = -PLAYER.entity.rotation.y + Math.PI/2;
        
        // // console.log('Init angle:',ang)

        let res = {}
        let i=0;
        arcPoints = [];
        for(let t = ang - 5*Math.PI/12; t <= ang + 5*Math.PI/12; t += Math.PI/48){
            // // console.log('computing for angle:',(t-ang)*180/Math.PI)
            let v = new Vector2(cos(t),sin(t)).multiplyScalar(10);
            let v3 = new Vector3(v.x,0,v.y).add(this.mesh.position.clone().setY(3))//(PLAYERS[this.state.playerID].center_bone.getWorldPosition(new Vector3()));
            // // console.log(v3)
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


// --------------------------------------------------------------
var DISC = new DiscEntity();
// --------------------------------------------------------------



function computeArc(print=false){
    if(!print)console.log('PREPARE func call')
    let arc = DISC.getArc();

    let init_angle = arc.init;
    // document.getElementById('init-value').innerHTML = Math.round(init_angle * 100) / 100
    let res = arc.res;
    // // console.log(res);
    let tar = screenMouse.x;
    // // console.log('Target:',tar)
    let ans;
    let min = Infinity;
    let ind;
    let i=0;
    for(let ang in res){
        // // console.log(ang,res[ang])
        if(min > Math.abs(res[ang].x - tar)){
            min = Math.abs(res[ang].x - tar)
            ans = ang
            ind = i;
        }
        i++;
    }
    // document.getElementById('ans-value').innerHTML = Math.round(ans * 100) / 100
    let y_change = (res[ans].y - screenMouse.y) * 0.04;
    y_change = Math.min(y_change, 15);
    y_change = Math.max(y_change, -6);

    arcPoints[ind].y += y_change;

    // // console.log('Index:',ind,arcPoints.map(x=>x.y))
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

    // // console.log('Angle:',ans * 180 / Math.PI)
}



// Events
// --------------------------------------------------------------------------------------------------------

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // console.log('new width:',sizes.width)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();



var gazeMouse = new Vector2();
var prevGazeMouse = new Vector2();

window.addEventListener('mousemove', e => {
    prevGazeMouse.x = gazeMouse.x;
    prevGazeMouse.y = gazeMouse.y;
    
    gazeMouse.x = (e.clientX / window.innerWidth) * 2 - 1
    gazeMouse.y = (e.clientY / window.innerHeight) * 2 - 1

    // if()
})

const screenMouse = new THREE.Vector2();

function onMouseMove( event ) {

    // // console.log('yep')

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

let fps = []
for(let i=0;i<100;i++) fps.push(1/60)
let fpssum = 100/60;
let counter = 0;


const tick = () =>
{

    const elapsedTime = clock.getElapsedTime()
    let delta = elapsedTime - prev
    prev = elapsedTime

    fpssum += delta - fps[counter];
    fps[counter] = delta;
    document.getElementById('fps-value').innerHTML = Math.round(100/fpssum);

    counter = (counter+1)%100;

    document.getElementById('users-value').innerHTML = Object.keys(PLAYERS).length;


    document.getElementById('ass-value').innerHTML = ''
    for(let asset in asset_loaders){
        if(asset_loaders[asset] != 100) document.getElementById('ass-value').innerHTML += asset + ', '
        else delete asset_loaders[asset];
    }



    // Render
    try{
        PLAYER.update(delta);
        // PLAYER.mixer.update(delta)

        // document.getElementById('rot-value').innerHTML = Math.round(PLAYER.entity.rotation.y * 100) / 100;

        for(let pID in PLAYERS){
            if(pID == PLAYER_ID) continue;
            PLAYERS[pID].updateRemote(delta)
            // if(PLAYERS[pID].loading == false) PLAYERS[pID].mixer.update(delta)
        }

        DISC.update(delta * 3)

        // console.log(gazeMouse.y)


        // if(PLAYER.entity.position.y != 0) console.log('player posY:',PLAYER.entity.position.y)

        
    }
    catch(e){console.log(e)}
    // controls.update()
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


// ------------------------------- SOCKET HANDLING -------------------------------------

/*

    Things to update on all clients:
        1. Players: {
            id: {
                position, rotation, current_state
            }
        }

        2. Disc: {
            state: 'hand','air','ground',
            thrower: id
        }

        3. Throw: THROW



*/





socket.on('init', data => {
    // data: {players, disc, id}

    // console.log('SOCKET::init',data)

    PLAYER_ID = data.id;

    for(let pid in data.players){
        // data.players[pid]: {id, position, rotation, velocity}
        asset_loaders['player'+String(pid)] = 0;
        online_players.add(pid)
        PLAYERS[parseInt(pid)] = new CharacterController(pid, 'shannon');
    }

    asset_loaders['player'+String(data.id)] = 0;
    console.log('Creating controller...')
    online_players.add(data.id)
    PLAYERS[parseInt(data.id)] = new CharacterController(parseInt(data.id), 'shannon', true, 0)
    PLAYER = PLAYERS[data.id]
    socket.emit('newPlayer',{id:PLAYER_ID})

    setVector(DISC.mesh.position, data.disc.position)
    setVector(DISC.mesh.rotation, data.disc.rotation)
    DISC.state = data.disc.state;

})

socket.on('newPlayer', data => {
    // data: {id}
    // console.log('SOCKET::new',data)
    online_players.add(data.id)
    asset_loaders['player'+String(data.id)] = 0;
    PLAYERS[data.id] = new CharacterController(parseInt(data.id), 'shannon')

    // for(let pid in PLAYERS){
    //     PLAYERS[pid].camera.addMiniPlayer(data.id);
    // }
})

socket.on('playerPosition', data => {
    // data: {id,pos}
    // console.log('Socket::position')
    if(PLAYERS[data.id] != undefined && PLAYERS[data.id].loading == false){
        setVector(PLAYERS[data.id].entity.position, data.position)
    }
})

socket.on('playerRotation', data => {
    // data: {id,rot}
    // console.log('Socket::rotation')
        if(PLAYERS[data.id] != undefined && PLAYERS[data.id].loading == false){
        PLAYERS[data.id].entity.rotation.y = data.rotation
    }
})
socket.on('playerVelocity', data => {
    // console.log('Socket::velocity',data.velocity)
    // data: {id,vel}
    if(PLAYERS[data.id] != undefined && PLAYERS[data.id].loading == false){
        PLAYERS[data.id].velocity[0] = parseFloat(data.velocity[0])
        PLAYERS[data.id].velocity[1] = parseFloat(data.velocity[1])
    }
})

socket.on('playerState', data => {
    // data: {id,state}
    if(PLAYERS[data.id] != undefined && PLAYERS[data.id].loading == false){
        PLAYERS[data.id].updateStateRemote(data.state)
    }
})



socket.on('discState', data => {
    // data: {location,playerID?}

    if(data.location == 'ground'){
        DISC.state.location = 'ground';
        DISC.state.playerID = null;

        DISC.mesh.position.y = 0.1;
        DISC.mesh.rotation.set(-Math.PI/2,0,0);
    }
    else if(data.location == 'hand'){
        DISC.state.location = 'hand'
        DISC.state.playerID = data.playerID;
    }
})

socket.on('throw', data => {
    THROW = data;
    DISC.throw();
})


socket.on('removePlayer', data => {
    // data: {id}
    if(PLAYERS[parseInt(data.id)] == undefined) return;
    online_players.delete(data.id);
    // for(let pid in PLAYERS){
    //     PLAYERS[pid].camera.removeMiniPlayer(data.id);
    // }
    scene.remove(PLAYERS[data.id].entity);
    delete PLAYERS[data.id];

    if(DISC.state.location == 'hand' && DISC.state.playerID == data.id){
        DISC.state.location = 'air'
        DISC.state.playerID = null;
    }
})


setInterval(()=>{
    socket.emit('ping',{start: new Date().getTime()})
    if(PLAYER != undefined && !PLAYER.loading)
        PLAYER.broadcast();
}, 2000)

socket.on('ping', data => {
    // data: {start}
    let d = new Date().getTime();
    document.getElementById('ping-value').innerHTML = d-data.start;
})


// document.addEventListener('keydown',e=>{
//     if(e.key == '`'){
//         if(PLAYER.entity != undefined && PLAYER_ID != undefined)
//             socket.emit('playerPosition',{id:PLAYER_ID,position:PLAYER.entity.position})
//     }
//     else if(e.key == 'p'){
//         let d = new Date().getTime();
//         socket.emit('ping',{start:d});
//     }
// })

window.addEventListener('wheel', e => {
    // // console.log(e)
    if(DISC.state.playerID == PLAYER_ID){
        if(e.deltaY < 0)
            THROW.AOT = Math.max(-Math.PI/3,THROW.AOT - 0.2)
            // THROW.AOT -= 0.2
        else
            // THROW.AOT += 0.2
            THROW.AOT = Math.min(Math.PI/3,THROW.AOT + 0.2)
    }
})


import './style.css'
import * as THREE from 'three'
import { AnimationMixer, Vector2, Vector3 } from 'three'
import {loadModel, loadAnimation, MODELS, ANIMATIONS, cloneFbx} from './loaders'
import {player_animations} from './state_manager'




import {keys, player_states, player_transitions, velocity_handler, side_velocity_handler, rotation_handler} from './state_manager'

const characters = {
    'mannequin': {
        bone: 1,
        anim_path: 'mannequin/',
        slice: 10
    },

    'sophie': {
        bone: 6,
        anim_path: 'mannequin/',
        slice: 9,
        hair: 5
    },

    'shannon': {
        bone: 0,
        anim_path: 'mannequin/',
        slice: 10,
        hair: 7
    }
}


const intro = 'idle_offence'

// var prevPos = new Vector3();
class CharacterController {
    constructor(id, character, scene, control=false){

        this.id = id;
        this.character = character;
        this.velocity = [0,0];
        this.loading = true;
        this.loading_model = true;
        this.loading_animations = true;
        this.control = control;
        // this.input = input;

        this.scene = scene;

        this.throwing = false;

        this.loadAssets();
    }

    getPosition(){
        if(this.loading) return new Vector3();
        return this.entity.position
    }
    getBonePosition(){
        if(this.loading) return new Vector3();
        return this.center_bone.getWorldPosition();
    }

    changePreset(p){
        if(this.loading) return;
        this.current_preset = p;

    }


    loadAssets(){
        if('shannon' in MODELS){

            this.entity = cloneFbx(MODELS['shannon']);
            // this.entity.scale.set(0.0025,0.0025,0.0025)

            this.bones = {};

            let cur = [this.entity.children[characters[this.character].bone]];
            let uuid = this.entity.children[characters[this.character].bone].id;
            while(cur.length > 0){
                let bone = cur[0]
                bone.name = 'mixamorig1' + bone.name.slice(characters[this.character].slice);
                this.bones[bone.name] = bone;
                cur = cur.slice(1);
                for(let c of bone.children) cur.push(c)

                if(bone.name == 'mixamorig1Neck')
                    this.neck = bone.id

            }

            this.center_bone = this.bones['mixamorig1Hips'];

            // this.mixer = new THREE.AnimationMixer(this.entity.children[characters[this.character].bone])
            this.mixer = new THREE.AnimationMixer(this.entity.children[characters[this.character].bone])
            this.scene.add(this.entity)
            this.animations = {}

            // // console.log('Controllable Player?',control)
            if(this.control == true){
                // this.camera = new ThirdPersonCamera(this);
                this.input = new CharacterControllerInput()
                this.FSM = {}

                this.current_preset = 'pov'

                for(let preset in player_transitions){
                    this.FSM[preset] = new FiniteStateMachine(this, player_states)
                    for(let trans of player_transitions[preset]){
                        let [prev, req, next] = trans;
                        // // // console.log('Prev:',prev,'Req:',req,'Next:',next)
                        this.addTransition(preset, prev, req, next)
                    }
                    
                }

                // this.entity.remove(this.entity.children[characters[this.character].hair])
                // // console.log(this.entity)
            
            }
            else{
                this.current_anim = 'idle_offence'
            }


            this.state = 'idle'

            this.loading_model = false;
            if(!this.loading_model && !this.loading_animations) {
                this.loading = false;
                this.setupAnimations();
            }
        }


        if(Object.keys(ANIMATIONS).length == player_animations.size){
            this.temp_anims = {}
            for(let clipname in ANIMATIONS){
                this.temp_anims[clipname] = ANIMATIONS[clipname]
            }

            this.loading_animations = false;
            if(!this.loading_model && !this.loading_animations) {
                this.loading = false;
                this.setupAnimations()
            }
        }

    }

    setupAnimations(){
        for(let anim in this.temp_anims){
            this.addAnimation(anim, this.temp_anims[anim])
        }
    }

    addAnimation(path,anim){

        this.animations[path] = this.mixer.clipAction(anim)
        if(path == intro) this.animations[path].play();


        // // // console.log(this)
    }


    addTransition(preset, prev, req, next, options={}){
        // // // console.log('CharacterController::addTransition: calling inner functions');
        this.FSM[preset].addTransition(prev, req, next, options)
    }


    turnNeck(look,tilt_back=false){
        if(this.loading == true) return;
        this.entity.traverse(obj => {
            if(obj.isBone){
                if(obj.name.split('mixamorig1')[1] in {'Neck':1,'Head':1,'HeadTop_End':1})
                    // obj.translateX(0.1)
                {
                    // look: [x,y] (-0.5 to 0.5)
                    let [x,y] = look;
                    let trot = new Vector3()
                    obj.rotation.x = Math.abs(x) * 0.4 + y * 0.7
                    obj.rotation.z = -x * 0.2
                    obj.rotation.y = -x * 0.7
                    if(tilt_back == true) {obj.rotation.x /= 3; obj.rotation.z /= 2}
                    
                }
            }

        })
        
    }

    getAnimationTimeout(){
        if(!this.throwing) return 1;

        if(this.state == 'throwing_disc_forehand'){
            return 0.8 - this.animations['throwing_disc_forehand'].time
        }
        if(this.state == 'throwing_disc_backhand'){
            return 1 - this.animations['throwing_disc_backhand'].time
        }
    }



    processInput(inp){

        
        let new_state = this.FSM[this.current_preset].updateState(inp);

        if(new_state == null) return;
        else {

            // if(new_state.next)
            
            // need to transition to new_state  

            let prev = this.FSM[this.current_preset].states[new_state.prev].animation;
            let next = this.FSM[this.current_preset].states[new_state.next].animation;
            let options = new_state.options;

            if(next == 'throwing_disc_forehand' || next == 'throwing_disc_backhand'){
                this.throwing = true;
            }
            else this.throwing = false;

            // socket.emit('playerState',{id:PLAYER_ID, state:next});
    

            // console.log(new_state.prev,'to',new_state.next)

            // // // console.log('CharacterController::processInput: Transitioning from',prev,'to',next,'! Options:',options);

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

            // this.animations[next].crossFadeFrom(this.animations[prev], 0.3, true);


            this.animations[prev].fadeOut(0.15)
            // this.animations[next].fadeIn(0.25)
            this.animations[next].play()
            // this.animations[prev].stop()
            
            
            // // // console.log('Playing animation:',next)

            

            this.state = new_state.next;

        }

        
        
    }

    updateVelocity(delta,hasDisc){
        if(this.loading == true) return;
        let new_vel = [this.velocity[0], this.velocity[1]];

        if(velocity_handler[this.state] != undefined){
            let options = {
                cur_vel: this.velocity[0],
                anim_time: this.animations[this.FSM[this.current_preset].states[this.state].animation].time
            }
            new_vel[0] = velocity_handler[this.state](options);
        }

        if(side_velocity_handler[this.state] != undefined){
            let options = {
                cur_vel: this.velocity[1],
                anim_time: this.animations[this.FSM[this.current_preset].states[this.state].animation].time
            }
            new_vel[1] = side_velocity_handler[this.state](options);
        }

        // // console.log(this.velocity[0] - new_vel[0]);
        // // console.log(this.velocity)

        if(new_vel[0] != this.velocity[0] || new_vel[1] != this.velocity[1]){
            this.velocity = new_vel;
            // // console.log('new velocity:',new_vel)
            // this.updatePlayerVelocity(true)
        }

        let transZ = this.velocity[0] * delta
        let transX = this.velocity[1] * delta

        this.entity.translateZ(transZ)
        this.entity.translateX(transX)


        let flag = 0;
        let pMode = 'cutter'
        if(hasDisc) pMode = 'thrower'
        if(this.input.keys[rotation_handler[this.current_preset][pMode].right] == true) {this.entity.rotation.y -= Math.PI/60; flag = 1;}
        else if(this.input.keys[rotation_handler[this.current_preset][pMode].left] == true) {this.entity.rotation.y += Math.PI/60; flag = 1;}
        if(flag){
            // socket.emit('playerRotation',{id:PLAYER_ID, rotation:this.entity.rotation.y})
            // this.updatePlayerRotation()
        }

        // if(prevPos.distanceTo(this.entity.position) > 0) updatePlayerPosition(this.entity.position);
        // prevPos = this.entity.position.clone();
    }


    catchDisc(){
        this.input.keys['catch_disc'] = true;
        this.input.keys['throw_disc'] = false;
        this.input.keys['threw_disc'] = false;
    }


    update(delta, hasDisc=false){

        if(this.loading == true) {
            this.loadAssets();
            return {};
        }

        this.mixer.update(delta)
        // this.camera.update(this.entity)
        this.updateVelocity(delta, hasDisc)
        this.processInput(this.input.keys)



        return {
            state: this.state,
            velocity: this.velocity,
            current_anim: this.FSM[this.current_preset].states[this.state].animation,
            rotation: this.entity.rotation.y
        }
        
    }

    updateRemote(delta){
        if(this.loading == true) {
            this.loadAssets()
            return;
        }

        this.mixer.update(delta)

        // // console.log(this.velocity)

        let transZ = delta * this.velocity[0]
        let transX = delta * this.velocity[1]
        this.entity.translateZ(transZ);
        this.entity.translateX(transX);
    }

    updateStateRemote(state){
        if(this.loading == true) return;
        // state: {state,current_anim,velocity}
        this.velocity[0] = state.velocity[0]
        this.velocity[1] = state.velocity[1]

        if(state.current_anim != this.current_anim){
            let prev = this.current_anim;
            let next = state.current_anim;

            this.animations[next].time = 0.0;
            this.animations[next].enabled = true;
            // this.animations[prev].setEffectiveWeight(1-options.effectiveWeight);
            this.animations[next].setEffectiveWeight(1.0);
    
            this.animations[next].play()
            this.animations[prev].fadeOut(0.25)

            this.current_anim = state.current_anim;
        }

        this.state = state.state;
        this.entity.rotation.y = state.rotation;
    }

}

class CharacterControllerInput {
    constructor(){
        // this.controller = controller
        this.keys = {}
        // console.log('input controller')
        // let inp_keys = ['KeyQ','KeyW','KeyE','KeyR','KeyA','KeyC','KeyS','KeyD','KeyH','KeyJ','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','catch_disc','throw_disc','threw_disc']
        // let inp_keys = ['q','w','e','a','s','d','h','j',' ','shift','arrowup','arrowdown','arrowleft','arrowright']
        for(let inp in keys) this.keys[keys[inp]] = false;

        window.addEventListener('keydown',(e)=>{
            // // console.log('keydown')
            let k = e.code//.toLowerCase()
            if(this.keys[k] != undefined){
                this.keys[k] = true;
            }
        })
        window.addEventListener('keyup',(e)=>{
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
        // // console.log('Init FSM: Controller =>',this.controller)
        this.currentState = 'idle'

        // this.special_rules = {'vertical': [{function_check: x => (x.time > 2.2), state: 'idle'}]}

        this.states = {}
        for(let s in states){
            this.states[s] = new FSMState(s,states[s])
        }

        // // console.log('FSM: States =>',this.states)
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
        // // // // console.log('FSM::checkCollision: inp_key =',inp_key)
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
        // // // // console.log('FSM::addTransition: entered function. Params:',prev,req,next,options);
        for(let inp_key in this.states[prev].transitions){
            // // // // console.log('Checking collision with',inp_key)
            if(this.checkCollision(req, inp_key))
            {
                // // // console.log('This transition:',prev,req,next,'is comparable to another transition')
                return null;
            }
        }
        // // // console.log('FSM::addTransition: adding transition',req,next);
        this.states[prev].addTransition(req, next, options);
    }

    updateState(inp){

        // convert inp to standard form
        // then check if it exists in this.states[this.currentState].transitions

        let time_to_throw = false;

        let inp_key = null;
        // // // console.log('current state:',this.currentState)
        let timeout = this.states[this.currentState].timeout;
        if(timeout != null) {
            let anim = this.states[this.currentState].animation

            if (this.controller.animations[anim].time > timeout[0]){
                // // console.log('Timeout transition! ==>', timeout[1])
                if(0 && timeout[1] == 'throw'){
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

        // // // // console.log('FSM::updateState: current state\'s transitions:',this.states[this.currentState])
        for(let k in this.states[this.currentState].transitions){
            // // // // console.log('transition key:',k)
            if(this.satisfiesRequirements(inp, k)){
                // // console.log('FSM::updateState: found inp_key match with',k)//this.states[this.currentState].transitions[k]);
                inp_key = k;
                // // // console.log('Updating inp_key to',inp_key)
                break
            }
        }


        if(inp_key == null) return null;

        // // // // console.log('reached here')

        let next_state = this.states[this.currentState].transitions[inp_key]
        let prev_state = this.currentState
        this.currentState = next_state.state

        let res = {
            prev: prev_state,
            next: this.currentState,
            options: next_state.options
        }

        // // // // console.log('FSM::updateState: Returning:',res)

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
        // // // console.log('FSMState::addTransition: added transition:', this.transitions[inp_key]);

    }


}


export {CharacterController};
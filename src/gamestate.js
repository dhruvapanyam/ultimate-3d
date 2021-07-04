import {CharacterController} from './controller'
import {DiscEntity} from './disc'
import {Vector3} from 'three'

import {BroadcastCamera, ThirdPersonCamera} from './camera';

import {MiniMap, DiscThrowArc, ThrowData} from './HUD';

import * as THREE from 'three'



class GameState {
    constructor(socket, scene, minimap_canvas, field_dimensions, speed_canvas){

        // console.log('GameState Constructor')

        this.scene = scene;
        this.socket = socket;

        this.lobby = new Set();

        this.players = {}
        this.disc = new DiscEntity(this.scene);

        this.player_id = null; // user's player ID
        this.player_state = {  // for socket updates
        
            state: null,
            current_anim: null,
            velocity: null,
            rotation: 0
        
        };

        this.throw_data = {
            forward_speed: 0,
            upward_speed: 0,
            AOI: Math.PI/12,
            AOT: 0,
            direction: 0,
            spin: 1
        }

        this.cams = {
            'broadcast': new BroadcastCamera(new Vector3(-110,60,0), new Vector3(-50,0,0), this.scene),
            'pov': new ThirdPersonCamera(this.scene)
        }

        this.camera_type = 'pov'



        this.field_dimensions = field_dimensions
        this.map = new MiniMap(minimap_canvas, 0.2, field_dimensions[0]);


        this.setupUserControls();


        this.throw_arrow = new THREE.ArrowHelper(new Vector3(0,0,1), new Vector3(0,7,0), 10);

        this.disc_arc = new DiscThrowArc(this.scene);

        this.speed_bar = new ThrowData(speed_canvas, 0.2);
        
    }

    log(...args){
        this.socket.emit('log',{data:args})
    }


    setupUserControls(){
        window.addEventListener('keydown', e => {
            if(e.code == 'KeyC'){
                this.tryCatchingDisc();
            }
            else if(e.code == 'KeyZ'){
                this.tryCatchingDisc(true)
            }
            else if(e.code == 'KeyP'){
                this.changeCamera('pov');
            }
            else if(e.code == 'KeyB'){
                this.changeCamera('broadcast')
            }
        })
    }

    updateDisc(delta){
        if(this.disc == undefined) return;
        if(this.disc.loading == true) return;
        if(this.disc.state.playerID == null){
            if(this.disc.state.location == 'air'){
                if(this.disc.getPosition().y < 0.5){
                    this.groundDisc();
                    this.socket.emit('discState',{location:'ground'})
                    // this.mesh.position.set(0,5,0)
                    // // console.log('ended with vy:',this.velocity.y)
                    this.disc.mesh.position.y = 0.1;
                    this.disc.mesh.rotation.set(-Math.PI/2,0,0);
                    this.disc.velocity.set(0,0,0);
                }
            }
            this.disc.updatePosition(delta);
        }
        else{
            let bone = 'mixamorig1RightHand';
            let pid = this.disc.state.playerID;
            this.disc.updatePosition(delta,this.players[pid].bones[bone])
        }
    }

    updateMyPlayer(delta){
        if(this.player_id == null) return;
        if(this.players[this.player_id] == undefined) return;
        // console.log('updating my player')

        let pstate = this.players[this.player_id].update(delta, this.holdingDisc());

        let unequal = false;
        for(let key in pstate){
            if(pstate[key] != this.player_state[key]){
                unequal = true;
                this.player_state[key] = pstate[key];
                // break;
            }
        }

        if(unequal){
            // console.log('broadcasting new state')
            
            this.socket.emit('playerState',{id:this.player_id,state:this.player_state})
        }


        if(this.playerReady()) document.getElementById('rot-value').innerHTML = this.players[this.player_id].entity.rotation.y

    }

    updatePlayers(delta){
        for(let pid in this.players){
            if(pid == this.player_id) continue;
            this.players[pid].updateRemote(delta);
        }
    }

    playerReady(){
        return this.player_id != null && this.players[this.player_id].loading == false;
    }

    updateCamera(){
        if(this.player_id == null) return;

        if(this.camera_type == 'broadcast'){
            this.cams[this.camera_type].update(this.players[this.player_id].getPosition());
        }
        else if(this.camera_type == 'pov'){
            let plook, change = false;
            if(this.playerReady()) change = this.cams[this.camera_type].updateMovement(this.players[this.player_id].input.keys)

            if(this.players[this.player_id].throwing) return;

            let temp;
            if(this.holdingDisc())
                temp = this.cams[this.camera_type].update(this.player_state.rotation, this.getThrowAxisPoint(), true);
            else
                temp = this.cams[this.camera_type].update(this.player_state.rotation, this.players[this.player_id].getPosition());

            if(this.playerReady() && !this.holdingDisc() && change){
                // console.log('neck change 2',change)
                plook = temp;
                this.socket.emit('turnNeck',{id:this.player_id, look:[plook[0],plook[1]], tilt: false})
                this.players[this.player_id].turnNeck(plook);
            }
        }
    }

    turnNeck(pid, look, tilt){
        if(this.players[pid] == undefined || this.players[pid].loading == true) return;
        // this.log('turning neck:',look,tilt)
        this.players[pid].turnNeck(look, tilt);
    }

    getThrowAxisPoint(){
        let ang = this.players[this.player_id].entity.rotation.y
        let axis_point = this.players[this.player_id].getPosition().clone();
        if(this.players[this.player_id].state == 'holding_disc_forehand') axis_point = axis_point.add(new Vector3(-Math.cos(ang) * 8,0, Math.sin(ang) * 8))
        else if(this.players[this.player_id].state == 'holding_disc_backhand') axis_point = axis_point.add(new Vector3(Math.cos(ang) * 7,0, -Math.sin(ang) * 7))
        return axis_point;
                
    }

    updateHUD(){
        let d = this.disc.getPosition()
        let p = []
        for(let pid in this.players){
            p.push([this.players[pid].getPosition().z, -this.players[pid].getPosition().x])
        }

        this.map.update(p,[d.z,-d.x])

        if(this.holdingDisc()){
            // this.scene.remove(this.throw_arrow)
            let ang = this.players[this.player_id].entity.rotation.y
            // this.throw_arrow = new THREE.ArrowHelper(new Vector3(Math.sin(ang),0,Math.cos(ang)), this.disc.getPosition().clone().setY(3), 10)
            // this.scene.add(this.throw_arrow)

            let disc_look = 0, change = false;
            if(this.players[this.player_id].throwing){
                // disc_look = this.disc_arc.update(this.disc.getPosition().clone().setY(4), ang, this.players[this.player_id].input.keys);
            }
            else{
                // else if()
                [disc_look,change] = this.disc_arc.update(this.getThrowAxisPoint().setY(4), ang, this.players[this.player_id].input.keys);
                this.throw_data.direction = ang - disc_look * Math.PI/3
                this.throw_data.upward_speed = this.disc_arc.height;
            }



            disc_look /= 4;
            let tilt_back = false;
            if(this.players[this.player_id].state == 'holding_disc_forehand') {disc_look -= 0.15; tilt_back = true;}
            else if(this.players[this.player_id].state == 'holding_disc_backhand') {disc_look += 0.3; tilt_back = true;}
            if(change){
                // console.log('neck change 1')
                this.socket.emit('turnNeck',{id:this.player_id, look:[disc_look,0], tilt: tilt_back})
                this.players[this.player_id].turnNeck([disc_look, 0], tilt_back);
            }



            this.speed_bar.update(this.throw_data);
            
        }
    }

    updateThrow(){
        if(!this.holdingDisc() || !this.players[this.player_id].throwing) {
            this.throw_data.forward_speed = 0;
            this.throw_data.AOT = 0;
            return;
        }

        this.tryThrowingDisc();

        if(this.players[this.player_id].input.keys['Space'] == true) this.throw_data.forward_speed = Math.min(this.throw_data.forward_speed + 3, 100);
        this.throw_data.AOI = Math.PI/18 + (1 - this.throw_data.forward_speed/100) * (Math.PI/12 - Math.PI/18)

        if(this.players[this.player_id].input.keys['ArrowRight'] == true) this.throw_data.AOT = Math.min(this.throw_data.AOT + Math.PI/120, Math.PI/3);
        else if(this.players[this.player_id].input.keys['ArrowLeft'] == true) this.throw_data.AOT = Math.max(this.throw_data.AOT - Math.PI/120, -Math.PI/3);


        // if(this.players[this.player_id].input.keys['KeyF'] == true) this.throw_data.forward_speed = Math.min(this.throw_data.forward_speed + 1, 100);
    }

    update(delta){
        // console.log('updating gamestate')
        this.updateDisc(delta);
        this.updateMyPlayer(delta);
        this.updatePlayers(delta);
        this.updateCamera()
        this.updateHUD();

        this.updateThrow();
    }

    addPlayer(id, control = false){
        // console.log('Adding player to gamestate')
        this.lobby.add(id);

        if(control == true) {
            this.players[id] = new CharacterController(id, 'shannon', this.scene, true);
            this.player_id = id;

            setInterval(()=>{
                this.socket.emit('playerPosition',{id:this.player_id, position:this.players[id].getPosition()})
            }, 3000)
        }
        else {
            this.players[id] = new CharacterController(id, 'shannon', this.scene);
        }
    }

    removePlayer(id){
        if(!(id in this.players)) return;
        if(this.disc.state.playerID == id) this.groundDisc();

        this.lobby.delete(id);
        this.scene.remove(this.players[id].entity)
        delete this.players[id];
    }

    movePlayer(id,pos){
        if(id in this.players && this.players[id].loading == false){
            this.players[id].entity.position.x = pos.x
            this.players[id].entity.position.y = pos.y
            this.players[id].entity.position.z = pos.z
        }
    }

    initializeDisc(data){
        // data: {state, position}
        if(this.disc.state == undefined) return;
        this.disc.state.location = data.state.location
        this.disc.state.playerID = data.state.playerID

    }

    holdingDisc(){
        return this.disc != undefined && this.disc.state != undefined && this.player_id != null && this.disc.state.playerID == this.player_id 
    }



    tryThrowingDisc(){
        let timeFromRelease = this.players[this.player_id].getAnimationTimeout();
        if(timeFromRelease < 0.05) {
            // console.log(this.throw_data)
            if(this.players[this.player_id].state == 'throwing_disc_forehand'){
                this.throw_data.spin = -1;
            }
            else{
                this.throw_data.spin = 1;
            }
            
            this.socket.emit('discThrow',{...this.throw_data});
            this.throwDisc();

            this.disc_arc.hide()
            this.speed_bar.hide();

            this.players[this.player_id].input.keys['catch_disc'] = false;
            this.players[this.player_id].input.keys['threw_disc'] = true;
        }
    }


    tryCatchingDisc(override=false){
        // this.log('trying to catch disc')
        if(this.disc.state.location == 'hand') return;
        if(this.players[this.player_id].loading == true) return;
        if(!override && this.disc.getPosition().distanceTo(this.players[this.player_id].getPosition()) > 8) return;

        // this.log('catching disc',this.players[this.player_id].input.keys['KeyZ'])
        this.players[this.player_id].catchDisc();

        this.catchDisc(this.player_id);

        // this.scene.add(this.throw_arrow)
        this.disc_arc.display()
        this.speed_bar.display()
    }

    changeDiscState(state){
        this.disc.state = {...state};
    }


    catchDisc(pid){
        this.disc.state.location = 'hand';
        this.disc.state.playerID = pid;
        this.socket.emit('discState',{...this.disc.state})
    }

    groundDisc(){
        this.disc.state.location = 'ground'
        this.disc.state.playerID = null;
    }

    throwDisc(data = this.throw_data){

        this.disc.throw({...data});

    }



    changePlayerState(pid, state){
        // state: {state,current_anim,velocity}
        this.players[pid].updateStateRemote(state);
    }





    changeThrowData(data){
        if(this.disc.state.playerID != this.player_id) return;

        for(let key in data){
            this.throw_data[key] = data[key]
        }
    }



    changeCamera(cam){
        this.camera_type = cam;
        this.players[this.player_id].changePreset(cam);
    }


}


export {GameState};
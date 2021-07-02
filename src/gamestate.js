import {CharacterController} from './controller'
import {DiscEntity} from './disc'
import {Vector3} from 'three'

import {BroadcastCamera} from './camera';

import {MiniMap} from './HUD';



class GameState {
    constructor(socket, scene, minimap_canvas, field_dimensions){

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
            AOI: 0,
            AOT: 0,
            direction: 0
        }

        this.cam = new BroadcastCamera(new Vector3(-110,60,0), new Vector3(-50,0,0), this.scene)


        this.field_dimensions = field_dimensions
        this.map = new MiniMap(minimap_canvas, 0.2, field_dimensions[0]);

        
    }

    log(...args){
        this.socket.emit('log',{data:args})
    }

    updateDisc(delta){
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

        let pstate = this.players[this.player_id].update(delta);

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

    }

    updatePlayers(delta){
        for(let pid in this.players){
            if(pid == this.player_id) continue;
            this.players[pid].updateRemote(delta);
        }
    }

    updateCamera(){
        if(this.player_id == null) return;
        this.cam.update(this.players[this.player_id].getPosition());
    }

    updateHUD(){
        let d = this.disc.getPosition()
        let p = []
        for(let pid in this.players){
            p.push([this.players[pid].getPosition().z, -this.players[pid].getPosition().x])
        }

        this.map.update(p,[d.z,-d.x])
    }

    update(delta){
        // console.log('updating gamestate')
        this.updateDisc(delta);
        this.updateMyPlayer(delta);
        this.updatePlayers(delta);
        this.updateCamera()
        this.updateHUD();
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
        if(!(id in players)) return;
        this.lobby.remove(id);
        this.scene.remove(players[id])
        delete players[id];
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
        this.disc.state.location = data.state.location
        this.disc.state.playerID = data.state.playerID

    }


    tryCatchingDisc(){
        // this.log('trying to catch disc')
        if(this.disc.state.location == 'hand') return;
        if(this.players[this.player_id].loading == true) return;
        if(this.disc.getPosition().distanceTo(this.players[this.player_id].getPosition()) > 8) return;

        this.log('catching disc')
        this.players[this.player_id].catchDisc();

        this.catchDisc(this.player_id);
    }


    catchDisc(pid){
        this.disc.state.location = 'hand';
        this.disc.state.playerID = pid;
    }

    groundDisc(){
        this.disc.state.location = 'ground'
        this.disc.state.playerID = null;
    }

    throwDisc(){
        this.disc.throw(this.throw_data);
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


}


export {GameState};
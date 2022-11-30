import * as THREE from 'three'
import { AnimationMixer, Vector2, Vector3 } from 'three'


class BroadcastCamera {
    constructor(position, look, scene){
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.lookAt(look);

        this.look = look;

        scene.add(this.camera);

        document.addEventListener('keydown',e=>{
            if(e.key == '+') {this.camera.fov -= 1;this.camera.updateProjectionMatrix()}
            if(e.key == '-') {this.camera.fov += 1;this.camera.updateProjectionMatrix()}
        })
    }

    update(pos){
        this.camera.position.z = pos.z * 0.65;
        // this.camera.lookAt(this.look.x, this.look.y, pos.z * 0.75);

    }
}



class ThirdPersonCamera {
    constructor(scene){
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.camera.position.y = 15
        scene.add(this.camera)

        this.angle_offset = 0;

        this.mouse = new THREE.Vector2();

        // document.addEventListener('mousemove',e=>{
        //     this.mouse[0] = (e.clientX / window.innerWidth) - 0.5
        //     this.mouse[1] = (e.clientY / window.innerHeight) - 0.5
        // })

        this.aimx=0;
        this.aimy=0;



        
    }

    updateMovement(inp){
        let aimx = 0, aimy = 0;
        let r = inp['KeyD'], l = inp['KeyA'], d = inp['KeyS'], u = inp['KeyW'];

        if(u) aimy = -0.4

        if(d){
            if(r || l)
                aimx = 0.5
            else
                aimy = u ? aimy : 0.2
        }
        else if(r || l)
            aimx = 0.25
        
        if(l) aimx *= -1



        this.mouse.lerp(new THREE.Vector2(aimx,aimy), 0.1)

        let change = false;
        if(aimx != this.aimx || aimy != this.aimy)
            change = true;
        // if(change) console.log('aim changed')
        this.aimx = aimx;
        this.aimy = aimy;

        return change;
        

    }

    update(rot, pos, thrower=false){
        this.angle_offset = this.mouse.x * Math.PI * -1.8

        let ang = rot;
        let y_look = 5;
        let y_pos = 12;
        let dist_from_player = 20;
        let forward_look = 5

        if(!thrower){
            ang = rot + this.angle_offset;
            y_look = 20 * (0.3 - this.mouse.y);
            y_pos = 15 + this.mouse.y * 30;
            dist_from_player = 10 + 50 * (0.5 - Math.abs(this.mouse.y));
            forward_look = 0;
        }

        let x_comp = Math.sin(ang)
        let z_comp = Math.cos(ang)

        let temp = new Vector3()
        temp.x = pos.x - x_comp * dist_from_player
        temp.z = pos.z - z_comp * dist_from_player
        temp.y = y_pos

        if(thrower) this.camera.position.lerp(temp,0.1)
        else this.camera.position.lerp(temp,0.05)


        let ltemp = pos.clone()
        ltemp.y = y_look
        ltemp.x += forward_look * x_comp
        ltemp.z += forward_look * z_comp

        this.camera.lookAt(ltemp);

        return [this.aimx,this.aimy];
    }
}


export {BroadcastCamera, ThirdPersonCamera};

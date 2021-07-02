import * as THREE from 'three'
import { AnimationMixer, Vector2, Vector3 } from 'three'


class BroadcastCamera {
    constructor(position, look, scene){
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.lookAt(look);

        this.look = look;

        scene.add(this.camera);
    }

    update(pos){
        this.camera.position.z = pos.z * 0.65;
        // this.camera.lookAt(this.look.x, this.look.y, pos.z * 0.75);

    }
}


export {BroadcastCamera};

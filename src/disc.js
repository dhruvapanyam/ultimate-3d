

import './style.css'
import { Vector3 } from 'three'
import {loadModel} from './loaders'


const sin = Math.sin;
const cos = Math.cos;
const sqrt = Math.sqrt;

class DiscEntity {
    constructor(scene){

        this.scene
        
        // Model
        // asset_loaders['disc'] = 20;
        this.loading = true;
        this.scene = scene;

        loadModel('disc1',(model) => {

            // console.log('LoadModel::callback (disc)')
            // console.log('Received model:',model)
            this.mesh = model;
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.mesh.scale.set(0.005,0.005,0.005)
            this.scene.add(this.mesh)
            
            this.mesh.position.set(0,5,0)
            this.mesh.rotation.set(-Math.PI/2,0,0)
            // Flight params
    
            this.velocity = new Vector3();
    
            this.angle_of_incidence = 0;
            this.angle_of_tilt = 0;
    
            this.spin_force = 1;
    
            this.throw_x = 0;
            this.throw_z = 0;
    
            this.throw_side = 0;

            this.spin = 1;  // BH = 1, FH = -1
    
            // State
    
            this.state = {
                location: 'ground',
                playerID: null
            }

            this.loading = false;
            // asset_loaders['disc'] = 100;

        })

        
    }

    OI(){
        return (this.spin > 0) == (this.angle_of_tilt > 0)
    }


    getPosition(){
        if(this.mesh == undefined) return new Vector3();
        return this.mesh.position
    }

    updatePosition(t, follow_bone=null){
        t *= 3
        if(this.state.location == 'hand'){
            
            follow_bone.getWorldPosition(this.mesh.position);
            follow_bone.getWorldQuaternion(this.mesh.quaternion);


            // offsetting the center of the disc so the edge is in the hand
            this.mesh.translateY(1.5)
            this.mesh.translateZ(0.3)
        }

        else if(this.state.location == 'ground'){

        }
        else{
            
            let v = this.velocity;
            let p = this.mesh.position;

            let W = v.length() // velocity magnitude


            let AOI = this.angle_of_incidence;
            let AOM = this.velocity.angleTo(new Vector3(v.x, 0, v.z))

            let AOT = this.angle_of_tilt           // angle of tilt
            // if(AOT < -Math.PI/2 || AOT > Math.PI/2){
                
            // }


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

            const C1 = 0.25;

            switch(flight_case){
                
                case 1:
                    f1 = W * sin(AOI - AOM);
                    h = W * cos(AOI - AOM);
                    f2 = C1 * h;

                    
                    break;
                
                case 2:
                    f1 = - W * sin(AOM - AOI);
                    h = W * Math.cos(AOM - AOI);
                    f2 = C1 * h;

                    break;
                
                case 3:
                    // // console.log('3')
                    f1 = W * sin(AOI + AOM);
                    h = W * cos(AOI + AOM);
                    f2 = C1 * h;

                    break;
                
                case 4:
                    // // console.log('4')
                    f1 = W * sin(Math.PI - (AOI + AOM));
                    h = W * cos(Math.PI - (AOI + AOM));
                    f2 = C1 * h;

                    break;
                
                
            }

            l1 = f1 * cos(AOI);
            d1 = Math.abs(f1 * sin(AOI));
            
            l2 = f2 * cos(AOI);
            d2 = f2 * sin(AOI);

            let lift = l1 + l2;
            let drag = d1 + d2;

            // if(flight_case == 3) {
            //     // // console.log('3')
            //     lift *= 4;
            // }

            // // console.log(flight_case)


            let P = new Vector3(); // new position
            let V = new Vector3();

            let translation = 2 * sin(AOT);

            let side_x_comp = -this.throw_z;
            let side_z_comp = this.throw_x;

            this.throw_side += translation * t;

            V.x = v.x - ( (drag * t) * this.throw_x ) //+ ( this.throw_side * side_x_comp);
            V.z = v.z - ( (drag * t) * this.throw_z ) //+ ( this.throw_side * side_z_comp);


            
            // update velocity

                // s = ut + Ft^2/2
                // F = G + L
            let F = -7 + lift;
            let s = (v.y * t) + (t*t*F/2)

                // v^2 = 2Fs + u^2
            // // console.log(s)
            if(s < 0.1){
                let factor = this.OI() ? 0.3 : 1
                if(Math.abs(this.angle_of_tilt) > Math.PI/5){
                    this.throw_side /= 1.001
                    factor /= 2
                }
                if(this.angle_of_tilt < 0){
                    this.angle_of_tilt = Math.min(this.angle_of_tilt + 0.02*factor, 0)
                }
                else{
                    this.angle_of_tilt = Math.max(this.angle_of_tilt - 0.02*factor, 0)
                }
            }

            if(s > 0){
                // still moving upwards, so +ve
                V.y = Math.sqrt(2*F*s + (v.y * v.y))
            }
            else{
                // moving downwards => -ve 
                
                V.y = -Math.sqrt(2*F*s + (v.y * v.y)) * 0.99
                if(!this.OI()){
                    if(V.y < -7)
                    {
                        V.y = -7;
                    }
                }
                else{
                    // // console.log('blade')
                    if(V.y < -15)
                    {
                        V.y = -15
                    }
                }
                
            }

            if(V.x == 0 && V.z == 0){
                // // // console.log('Became Zero!')
            }
            // // // console.log(V.y)
            this.velocity = V
            // this.velocity.y = V.y


            // update position



            P.x = (p.x + (V.x * t) + this.throw_side * t * side_x_comp);
            P.y = (p.y + (V.y * t));
            P.z = (p.z + (V.z * t) + this.throw_side * t * side_z_comp);

            // // // console.log('old position:',p.x,p.y,p.z)
            // // // console.log('new position:',P.x,P.y,P.z)

            this.mesh.position.x = P.x
            this.mesh.position.y = P.y
            this.mesh.position.z = P.z


            let look_vector = new Vector3();
            if(AOI == 0) look_vector.set(0,1,0);
            else{
                look_vector.set(-this.throw_x, 1/Math.tan(AOI), -this.throw_z);
            } 
            // // // console.log('looking at:',look_vector.x,look_vector.y,look_vector.z);
            look_vector.x += this.mesh.position.x
            look_vector.y += this.mesh.position.y
            look_vector.z += this.mesh.position.z

            // add side vector based on AOT

            // change lookvactor's X-Z values by moving them to the side
            let side_look = Math.tan(AOT);
            // if(AOT == 0) // console.log('up')
            look_vector.x += side_look * side_x_comp
            look_vector.z += side_look * side_z_comp

            this.mesh.lookAt(look_vector)
            // this.mesh.rotateOnAxis(new Vector3(0,1,1).normalize(), -AOT)
            // this.mesh.rotation.set(Math.PI/2,Math.PI/2,0)

            // this.mesh.rotation.y = Math.PI/2


            



        }


        
    }

    prepareThrow(){
        let arc = computeArc(true);
        THROW.direction = arc.direction;
        THROW.upward_speed = arc.y;
    }

    throw(THROW){
        // // // console.log('throwing')

        // console.log('Throwing disc:',THROW)
        

        this.spin = THROW.spin;
        
        let angle = THROW.direction;
        let y_force = THROW.upward_speed;
        let speed = THROW.forward_speed / 5 + 10;
        this.angle_of_incidence = THROW.AOI;
        this.angle_of_tilt = THROW.AOT;


        this.throw_x = Math.sin(angle)
        this.throw_z = Math.cos(angle)

        // this.angle_of_incidence = disc_flight_params.theta * Math.PI / 180;

        this.velocity.x = speed * this.throw_x;
        this.velocity.y = y_force;
        this.velocity.z = speed * this.throw_z;

        // setVector(this.mesh.position, start_pos)

        this.state.location = 'air'
        this.state.playerID = null;

        // this.mesh.rotation.set(-Math.PI/2,0,Math.PI/2)
        // if(this.velocity.x == 0 && this.velocity.z == 0){
        //     // this.throw_x = disc_flight_params.throw_direction_x;
        //     // this.throw_z = disc_flight_params.throw_direction_z;
        // }
        // else{
        //     this.throw_x = this.velocity.x / sqrt(Math.pow(this.velocity.x,2) + Math.pow(this.velocity.z,2))
        //     this.throw_z = this.velocity.z / sqrt(Math.pow(this.velocity.x,2) + Math.pow(this.velocity.z,2))

        //     disc_flight_params.throw_direction_x = this.throw_x;
        //     disc_flight_params.throw_direction_z = this.throw_z;
        // }

        // // // console.log('throwing to:',this.throw_x,this.throw_z)


        this.throw_side = 0;

    }


    // getArc(){
    //     let ang = -PLAYER.entity.rotation.y + Math.PI/2;
        
    //     // // // console.log('Init angle:',ang)

    //     let res = {}
    //     let i=0;
    //     arcPoints = [];
    //     for(let t = ang - 5*Math.PI/12; t <= ang + 5*Math.PI/12; t += Math.PI/48){
    //         // // // console.log('computing for angle:',(t-ang)*180/Math.PI)
    //         let v = new Vector2(cos(t),sin(t)).multiplyScalar(10);
    //         let v3 = new Vector3(v.x,0,v.y).add(this.mesh.position.clone().setY(3))//(PLAYERS[this.state.playerID].center_bone.getWorldPosition(new Vector3()));
    //         // // // console.log(v3)
    //         res[t] = screenXY(v3,PLAYER.camera.camera)

    //         arcPoints[i] = v3;
    //         i++;
    //     }
    //     return {
    //         init: ang,
    //         res: res
    //     };
    // }
}


export {DiscEntity};
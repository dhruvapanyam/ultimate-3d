import * as THREE from 'three'

class MiniMap {
    constructor(canvas, size, fieldLength){
        // size = % of screen width
        this.canvas = canvas;
        this.canvas.style.border = '1px solid white'
        this.canvas.width = window.innerWidth * size
        this.canvas.height = this.canvas.width * 0.37
        this.cw = this.canvas.width
        this.ch = this.canvas.height
        this.canvas.style.marginLeft = String((1 - size) * 50)+'%';
        this.canvas.style.marginTop = String(window.innerHeight - this.ch * 1.1) + 'px'
        
        this.ctx = this.canvas.getContext('2d');

        this.scale = this.canvas.width / fieldLength;

    }

    update(players,disc){
        this.ctx.fillStyle = 'rgba(100,100,100, 0.7)'
        this.ctx.fillRect(0,0,this.cw,this.ch);

        this.ctx.beginPath()
        this.ctx.moveTo(0,0)
        this.ctx.lineTo(0,this.ch)
        this.ctx.lineTo(this.cw,this.ch)
        this.ctx.lineTo(this.cw,0)
        this.ctx.lineTo(0,0)
        this.ctx.closePath()
        this.ctx.strokeStyle = 'white'
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.moveTo(this.cw * 0.18, 0)
        this.ctx.lineTo(this.cw * 0.18, this.ch)
        this.ctx.closePath()
        this.ctx.stroke()

        this.ctx.beginPath()
        this.ctx.moveTo(this.cw * 0.82, 0)
        this.ctx.lineTo(this.cw * 0.82, this.ch)
        this.ctx.closePath()
        this.ctx.stroke()

        for(let player of players){
            this.ctx.strokeStyle = 'red'
            this.ctx.fillStyle = 'red'
            this.ctx.beginPath();
            this.ctx.arc(this.cw/2 + player[0] * this.scale, this.ch/2 + player[1] * this.scale, 2, 0, Math.PI * 2);
            this.ctx.closePath()
            this.ctx.stroke();
            this.ctx.fill()
        }

        this.ctx.strokeStyle = 'blue'
        this.ctx.fillStyle = 'blue'
        this.ctx.beginPath();
        this.ctx.arc(this.cw/2 + this.scale * disc[0], this.ch/2 + this.scale * disc[1], 2, 0, Math.PI * 2);
        this.ctx.closePath()
        this.ctx.stroke()
        this.ctx.fill()
    }


}

class ThrowData {
    constructor(canvas, size){
        // size = % of screen width
        this.canvas = canvas;
        // this.canvas.style.border = '1px solid black'
        this.canvas.width = window.innerWidth * size
        this.canvas.height = this.canvas.width * 0.07 * 3
        this.cw = this.canvas.width
        this.ch = this.canvas.height
        // this.canvas.style.marginLeft = String((1 - size) * 50)+'%';
        this.canvas.style.marginTop = String(window.innerHeight - this.ch * 1.5) + 'px'
        this.canvas.style.marginLeft = String(window.innerWidth - this.cw * 1.1) + 'px'
        
        this.ctx = this.canvas.getContext('2d');

        // this.visible = false;
        this.canvas.style.display = 'none';

        this.ph = this.cw * 0.07;

    }

    display(){this.canvas.style.display = 'block'}
    hide(){this.canvas.style.display = 'none'}

    update(throw_data){
        if(this.canvas.style.display == 'none') return;

        let speed = throw_data.forward_speed;
        let tilt = throw_data.AOT;

        this.ctx.fillStyle = 'black'
        this.ctx.fillRect(0,0,this.cw,this.ph);
        var grd = this.ctx.createLinearGradient(0, 0, this.cw, this.ph);
        grd.addColorStop(0, "green");
        grd.addColorStop(0.6, "green");
        grd.addColorStop(0.8, "yellow");
        grd.addColorStop(1, "red");
        this.ctx.fillStyle = grd
        this.ctx.fillRect(this.cw/200, this.cw/200, speed/100 * (this.cw - this.cw/100), this.ph - this.cw/100);


        this.ctx.fillStyle = 'black'
        this.ctx.fillRect(0,this.ph*2,this.cw,this.ph);

        this.ctx.beginPath()
        // console.log(tilt)
        this.ctx.arc((tilt + Math.PI/3) / (Math.PI/3) * this.cw/2, this.ph*2 + this.ph/2, 0.8*this.ph/2, 0, 2*Math.PI);
        this.ctx.closePath()
        this.ctx.fillStyle = 'blue'
        this.ctx.fill();
    }

    
}



class DiscThrowArc {
    constructor(scene){
        this.scene = scene;

        this.arc_points = []
        this.geometry = new THREE.BufferGeometry().setFromPoints( this.arc_points );
        this.material = new THREE.LineBasicMaterial({color:'white'});
        this.arc = new THREE.Line(this.geometry,this.material)
        this.visible = false;


        this.height = 0.5;

        this.throw_dir = 0;

    }
    update(center, ang, inp){
        if(!this.visible) return;
        
        

        this.arc_points = []
        let num_points = 24;
        let u=inp['ArrowUp'],l=inp['ArrowLeft'],d=inp['ArrowDown'],r=inp['ArrowRight'];

        let old_dir = this.throw_dir;

        if(l) this.throw_dir = Math.max(-num_points+1, this.throw_dir - 1);
        else if(r) this.throw_dir = Math.min(num_points-1, this.throw_dir + 1);

        if(u) this.height = Math.min(10, this.height + 0.3)
        else if(d) this.height = Math.max(-3, this.height - 0.3)

        let extent = Math.PI/3;

        for(let i=-num_points, a = extent; a >= -extent; i++, a -= extent / num_points){
            let rot = ang + a;
            let x = Math.sin(rot), z = Math.cos(rot);
            if(i == this.throw_dir)
                this.arc_points.push(new THREE.Vector3(10*x,this.height,10*z).add(center));
            else
                this.arc_points.push(new THREE.Vector3(10*x,0,10*z).add(center));


        }
        this.scene.remove(this.arc)
        this.geometry = new THREE.BufferGeometry().setFromPoints( this.arc_points );
        this.arc = new THREE.Line(this.geometry,this.material);
        this.scene.add(this.arc);

        return [(this.throw_dir) / num_points, old_dir != this.throw_dir];
    }

    display(){
        this.visible = true;
    }

    hide(){
        this.visible = false;
        this.scene.remove(this.arc);
    }
}


export {MiniMap, DiscThrowArc, ThrowData}
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


export {MiniMap}
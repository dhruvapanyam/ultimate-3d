

function randomizeUserName(){
    let s = 'user'
    for(let i=0;i<3;i++)
        s += String(parseInt(Math.random() * 10))

    return s;
}

class App {
    constructor(socket){
        this.mode = 'main_menu';
        this.socket = socket;
        this.menu_camera = {
            display: true,
            rotate: true
        };

        this.menu = true;

        this.canvas = document.querySelector('canvas.webgl')
        this.main_menu_DOM = document.getElementById('main-menu');

        this.mainMenu();



        this.current_rooms = {};

        this.username = randomizeUserName();

        this.inGame = false;

    }

    update(){}

    updateUserName(u){this.username = u}

    updateRooms(rooms){
        this.current_rooms = {...rooms};
        this.viewRooms()
    }

    hideCanvases(){
        document.getElementById('minimap-canvas').style.display = 'none'
        document.getElementById('speed-canvas').style.display = 'none'
        // this.canvas.style.webkitFilter = "blur(3px)"
        // this.canvas.style.opacity = 0.5
        // this.canvas.style.cursor = 'pointer'

    }

    showCanvases(){
        document.getElementById('minimap-canvas').style.display = 'block'
        document.getElementById('speed-canvas').style.display = 'block'
        this.canvas.style.webkitFilter = "blur(0px)"
        this.canvas.style.opacity = 1
        // this.canvas.style.cursor = 'none'
    }

    _createMainMenu(){

        let btns = [
            ['Live Rooms', ()=>this._fetchRooms()],
            ['Create Room', ()=>this.createRoomMenu()],
            ['Settings', ()=>this.openSettings()]
        ]


        let btnWidth = 0.3 * window.innerWidth;
        let btnHeight = 0.2 * btnWidth;
        let marginHeight = 0.3

        this.main_menu_DOM.style.marginLeft = String((window.innerWidth - btnWidth)/2) + 'px'
        this.main_menu_DOM.style.marginTop = String((window.innerHeight - (btns.length + (btns.length-1)*marginHeight) * btnHeight)/2) + 'px'
        
        let s = ''
        for(let i=0;i<btns.length;i++){
            s += '<button style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="mm-'+i+'">'+btns[i][0]+'</button><br>'
        }

        this.main_menu_DOM.innerHTML = s;
        for(let i=0;i<btns.length;i++) document.getElementById('mm-'+i).onclick = btns[i][1];


    }

    mainMenu(){
        this.menu = true;
        // this.inGame = false;
        this.hideCanvases()
        this.main_menu_DOM.style.display = 'block';
        
        
        this._createMainMenu();
    }

    viewRooms(){
        console.log(this.current_rooms);

        let btns = []
        for(let rid in this.current_rooms){
            btns.push([rid, () => {this._requestRoomEntry(rid)}]);
        }

        btns.push(['Main Menu', () => {this.mainMenu()}])


        let btnWidth = 0.3 * window.innerWidth;
        let btnHeight = 0.2 * btnWidth;
        let marginHeight = 0.3

        this.main_menu_DOM.style.marginLeft = String((window.innerWidth - btnWidth)/2) + 'px'
        this.main_menu_DOM.style.marginTop = String((window.innerHeight - (btns.length + (btns.length-1)*marginHeight) * btnHeight)/2) + 'px'
        
        let s = ''
        for(let i=0;i<btns.length-1;i++){
            s += '<button style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="lr-'+i+'">Room #'+btns[i][0]+': <b>'+this.current_rooms[btns[i][0]].room_name +'</b></button><br>'
        }
        s += '<button style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="lr-'+String(btns.length-1)+'">Main Menu</button><br>'

        this.main_menu_DOM.innerHTML = s;
        for(let i=0;i<btns.length;i++) document.getElementById('lr-'+i).onclick = btns[i][1];        
    }

    _fetchRooms(){
        this.socket.emit('getRooms',{});
    }

    _requestRoomEntry(rid){
        this.socket.emit('enterRoom',{roomID:rid});
    }

    enterRoom(rid, name){
        console.log('Entering room:',rid)
        document.getElementById('room-value').innerHTML = name
        this.enterGame();
    }

    leaveRoom(){
        this.socket.emit('leaveRoom',{});
        this.inGame = false;
        document.getElementById('room-value').innerHTML = ''
        document.getElementById('current-room').style.display = 'none'
        document.getElementById('players-online').style.display = 'none'
        this.mainMenu();
    }

    createRoom(){
        let rn = document.getElementById('cr-roomname').value;
        let pwd = document.getElementById('cr-password').value;

        this.socket.emit('createRoom', {room_name: rn, password: pwd});
        // this.enterRoom(rn)
    }

    createRoomMenu(){
        console.log('create room')

        let btns = [
            [],
            [],
            ['Create Room', () => {this.createRoom()}]
        ]

        btns.push(['Main Menu', () => {this.mainMenu()}])


        let btnWidth = 0.3 * window.innerWidth;
        let btnHeight = 0.2 * btnWidth;
        let marginHeight = 0.3

        this.main_menu_DOM.style.marginLeft = String((window.innerWidth - btnWidth)/2) + 'px'
        this.main_menu_DOM.style.marginTop = String((window.innerHeight - (btns.length + (btns.length-1)*marginHeight) * btnHeight)/2) + 'px'
        
        let s = ''
        s += '<input style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="cr-roomname" placeholder="Room Name..."><br>'
        s += '<input style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="cr-password" placeholder="Password..."><br>'
        for(let i=2;i<btns.length;i++){
            s += '<button style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="s-'+i+'">'+btns[i][0]+'</button><br>'
        }

        this.main_menu_DOM.innerHTML = s;
        for(let i=2;i<btns.length;i++) document.getElementById('s-'+i).onclick = btns[i][1];   
    }

    openSettings(){
        console.log('settings')

        let btns = [
            [],
            ['Change Username', () => {this.updateUserName(document.getElementById('s-username').value)}]
        ]

        btns.push(['Main Menu', () => {this.mainMenu()}])


        let btnWidth = 0.3 * window.innerWidth;
        let btnHeight = 0.2 * btnWidth;
        let marginHeight = 0.3

        this.main_menu_DOM.style.marginLeft = String((window.innerWidth - btnWidth)/2) + 'px'
        this.main_menu_DOM.style.marginTop = String((window.innerHeight - (btns.length + (btns.length-1)*marginHeight) * btnHeight)/2) + 'px'
        
        let s = ''
        s += '<input style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="s-username" value="'+this.username+'"><br>'
        for(let i=1;i<btns.length;i++){
            s += '<button style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="s-'+i+'">'+btns[i][0]+'</button><br>'
        }

        this.main_menu_DOM.innerHTML = s;
        for(let i=1;i<btns.length;i++) document.getElementById('s-'+i).onclick = btns[i][1];     
    }

    changeUsername(){

    }

    chooseCharacter(char){

    }

    enterGame(){
        this.menu = false;
        this.inGame = true;
        this.main_menu_DOM.style.display = 'none';
        document.getElementById('current-room').style.display = 'block'
        document.getElementById('players-online').style.display = 'block'
        this.showCanvases();
    }

    gameMenu(){
        console.log('game Menu')

        this.mainMenu()
        let btns = [
            ['Controls', ()=>{}],
            ['Game Settings', ()=>{}],
            ['Leave Room', ()=>this.leaveRoom()]
        ]


        let btnWidth = 0.3 * window.innerWidth;
        let btnHeight = 0.2 * btnWidth;
        let marginHeight = 0.3

        this.main_menu_DOM.style.marginLeft = String((window.innerWidth - btnWidth)/2) + 'px'
        this.main_menu_DOM.style.marginTop = String((window.innerHeight - (btns.length + (btns.length-1)*marginHeight) * btnHeight)/2) + 'px'
        
        let s = ''
        for(let i=0;i<btns.length;i++){
            s += '<button style="width:'+btnWidth+'px; height:'+btnHeight+'px; margin-bottom:'+btnHeight*marginHeight+'px;" id="gm-'+i+'">'+btns[i][0]+'</button><br>'
        }

        this.main_menu_DOM.innerHTML = s;
        for(let i=0;i<btns.length;i++) document.getElementById('gm-'+i).onclick = btns[i][1];
    }


}



export {App};

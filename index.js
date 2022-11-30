const http = require('http');
const express = require('express');
const cors = require('cors');
const socketIo = require('socket.io');
const path = require('path');
 
 
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
    }
});

function setHeaders (res, path) {
    const splits = path.split('/');
    const fileName = splits[splits.length - 1];
    console.log(fileName);
    if(fileName === 'shannon.fbx')
        res.setHeader('Cache-Control', 'public, max-age=31536000')
    
}

if(process.env.NODE_ENV === 'production') {    
    app.use(express.static(path.join(__dirname, 'dist'), {
        'setHeaders': setHeaders
    }));
}

 
app.use(cors());


var gamestate = {
    players: {},
    disc: {
        state: {
            location: 'ground',
            playerID: null
        },
        position: {
            x: 0,
            y: 0,
            z: 0
        }
    },
    throw_data: {},
}


var rooms = {};
var roomID = '0';

var ids = {};
var room_map = {};

var userID = 0;

io.on('connection', (client) => {

    userID++;

    ids[client.id] = userID;

    console.log(userID,'has connected!')




    client.on('createRoom', data => {
        // data: {room_name, password}
        roomID = String(parseInt(roomID) + 1);
        rooms[roomID] = {
            id: roomID,
            room_name: data.room_name,
            password: data.password,
            gamestate: {
                players: {},
                disc: {
                    state: {
                        location: 'ground',
                        playerID: null
                    },
                    position: {
                        x: 0,
                        y: 0,
                        z: 0
                    }
                },
                throw_data: {},
            },

            host: ids[client.id]
        }

        console.log('Created room:',rooms[roomID]);
        console.log(ids[client.id],'has joined room (host):',roomID);
        client.join(roomID);
        room_map[client.id] = roomID;
        client.emit('enterRoom', {roomID: roomID});
        client.emit('init',{roomID: roomID, room_name: rooms[roomID].room_name, players: rooms[roomID].gamestate.players, disc: rooms[roomID].gamestate.disc, id: ids[client.id]})
    })


    client.on('enterRoom', data => {
        // data: {roomID}
        if(!(data.roomID in rooms)) return;

        room_map[client.id] = data.roomID;
        console.log(ids[client.id],'has joined room:',data.roomID);
        client.join(String(data.roomID))
        // console.log('client\'s rooms:',client.rooms)
        client.emit('init',{roomID: data.roomID, room_name: rooms[data.roomID].room_name, players: rooms[data.roomID].gamestate.players, disc: rooms[data.roomID].gamestate.disc, id: ids[client.id]})    
        

    })

    client.on('newPlayer',function(data){
        let rid = room_map[client.id];
        // console.log('new player in room:',rid,'(All rooms):',rooms)
        if(!(rid in rooms)) return;
        rooms[rid].gamestate.players[data.id] = {
            id: data.id,
            position: {x:0,y:0,z:0},
            rotation: 0,
            velocity: [0,0],
            state: 'idle',
            current_anim: 'idle_offence'
        };

        console.log('[Room #'+String(rid)+']:','new player:',data.id)

        client.to(rid).emit('newPlayer',{id:data.id});
    })

    client.on('playerState', function(data){
        // data: {id, state}
        let rid = room_map[client.id];
        if(!(rid in rooms)) return;
        if(!(data.id in rooms[rid].gamestate.players)) return;
        rooms[rid].gamestate.players[data.id].rotation = data.state.rotation;
        rooms[rid].gamestate.players[data.id].velocity = data.state.velocity;
        rooms[rid].gamestate.players[data.id].state = data.state.state;
        rooms[rid].gamestate.players[data.id].current_anim = data.state.current_anim;

        client.to(String(rid)).emit('playerState', data);
    })

    client.on('playerPosition', function(data){
        // data: {id, position}
        let rid = room_map[client.id];
        if(!(rid in rooms)) return;
        if(!(data.id in rooms[rid].gamestate.players)) return;
        rooms[rid].gamestate.players[data.id].position = data.position;

        client.to(String(rid)).emit('playerPosition',data);
    })

    client.on('turnNeck', function(data){
        let rid = room_map[client.id];
        if(!(rid in rooms)) return;
        client.to(String(rid)).emit('turnNeck', data)
    })


    

    client.on('discThrow',function(data){
        let rid = room_map[client.id];
        if(!(rid in rooms)) return;
        // console.log('disc has been thrown!',data)
        client.to(String(rid)).emit('discThrow',{...data});
    })

    client.on('discState',function(data){
        // console.log('disc has been thrown!')
        let rid = room_map[client.id];
        if(!(rid in rooms)) return;
        client.to(String(rid)).emit('discState',data);
    })

    client.on('log',function(data){
        console.log('[user'+ids[client.id]+']: ',...data.data)
    })


    for(let event of ['disconnect','leaveRoom'])
        client.on(event,function(data){
            let rid = room_map[client.id];
            console.log(ids[client.id],'has left the room!')
            if(rid in rooms)
                if(rooms[rid].gamestate.disc.state.playerID == ids[client.id]){
                    rooms[rid].gamestate.disc.state.location = 'air'
                    rooms[rid].gamestate.disc.state.playerID = null
                }
            // console.log(players)
            io.to(String(rid)).emit('removePlayer',{id:ids[client.id]})

            if(rid in rooms) {
                client.leave(rid)
                delete rooms[rid].gamestate.players[ids[client.id]];
            }
            if(event == 'disconnect') delete ids[client.id];
            delete room_map[client.id];

            
            if(rid in rooms) {
                let num_left = Object.keys(rooms[rid].gamestate.players).length
                if(num_left == 0){
                    console.log('Deleting room #'+rid)
                    delete rooms[rid];
                }
                console.log('Players remaining (room #'+String(rid)+'):',);
            }
            // console.log(players)
        })


    client.on('getRooms',function(data){
        let r = {}
        for(let rid in rooms){
            r[rid] = {
                room_name: rooms[rid].room_name,
                host: rooms[rid].host
            }
        }
        client.emit('getRooms',r)
    })




    client.on('ping',function(data){
        client.emit('ping',data);
    })



})

server.listen(process.env.PORT || 8000, ()=>{console.log('Listening on port 8000...')})
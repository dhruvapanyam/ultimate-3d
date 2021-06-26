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
 
if(process.env.NODE_ENV === 'production')
    app.use(express.static(path.join(__dirname, 'dist')));

 
app.use(cors());


var players = {};
var disc = {
    position: {x:0,y:0,z:0},
    rotation: {x:0,y:0,z:0},
    state: {
        location: 'ground',
        playerID: null
    }
};
var throw_data = {};

var ids = {};

var userID = 0;

io.on('connection', (client) => {
    console.log(`${client.id} connected`);

    userID++;

    ids[client.id] = userID;

    client.emit('init',{players: players, disc: disc, id: userID})

    client.on('newPlayer',function(data){
        players[data.id] = {
            id: userID,
            position: {x:0,y:0,z:0},
            rotation: 0,
            velocity: 0,
            state: 'idle'
        };

        client.broadcast.emit('newPlayer',{id:userID});
    })


    client.on('playerVelocity',function(data){
        if(players[data.id] != undefined) players[data.id].velocity = data.velocity;
        client.broadcast.emit('playerVelocity',{id:data.id,velocity:data.velocity})
    })

    client.on('playerPosition',function(data){
        console.log('changing position of',data.id)
        if(players[data.id] != undefined) players[data.id].position = data.velocity;
        console.log(data.position)
        client.broadcast.emit('playerPosition',{id:data.id,position:data.position})
    })

    client.on('playerRotation',function(data){
        if(players[data.id] != undefined) players[data.id].rotation = data.rotation;
        client.broadcast.emit('playerRotation',{id:data.id,rotation:data.rotation})
    })

    client.on('playerState',function(data){
        console.log('changing state of:',data)
        players[data.id].state = data.state;
        client.broadcast.emit('playerState',{id:data.id,state:data.state})
    })


    client.on('discState',function(data){
        disc.state.location = data.location;
        if(data.playerID!=undefined) disc.state.playerID = data.playerID;
        client.broadcast.emit('discState',disc.state)
    })

    

    client.on('throw',function(data){
        console.log('disc has been thrown!')
        client.broadcast.emit('throw',data);
    })


    client.on('disconnect',function(data){
        console.log(ids[client.id],'has disconnected!')
        if(disc.state.location == 'hand' && disc.state.playerID == ids[client.id]){
            disc.state.location = 'air'
            disc.state.playerID = null
        }
        // console.log(players)
        io.emit('removePlayer',{id:ids[client.id]})

        delete players[ids[client.id]];
        delete ids[client.id];

        console.log(players)
    })




    client.on('ping',function(data){
        client.emit('ping',data);
    })



})

server.listen(process.env.PORT || 8000, ()=>{console.log('Listening on port 8000...')})
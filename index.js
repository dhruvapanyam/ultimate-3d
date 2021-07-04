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
    throw_data: {}
}

var ids = {};

var userID = 0;

io.on('connection', (client) => {

    userID++;

    ids[client.id] = userID;

    console.log(userID,'has connected!')
    client.emit('init',{players: gamestate.players, disc: gamestate.disc, id: ids[client.id]})

    client.on('newPlayer',function(data){
        gamestate.players[data.id] = {
            id: data.id,
            position: {x:0,y:0,z:0},
            rotation: 0,
            velocity: [0,0],
            state: 'idle',
            current_anim: 'idle_offence'
        };

        client.broadcast.emit('newPlayer',{id:data.id});
    })

    client.on('playerState', function(data){
        // data: {id, state}
        if(!(data.id in gamestate.players)) return;
        gamestate.players[data.id].rotation = data.state.rotation;
        gamestate.players[data.id].velocity = data.state.velocity;
        gamestate.players[data.id].state = data.state.state;
        gamestate.players[data.id].current_anim = data.state.current_anim;

        client.broadcast.emit('playerState', data);
    })

    client.on('playerPosition', function(data){
        // data: {id, position}
        if(!(data.id in gamestate.players)) return;
        gamestate.players[data.id].position = data.position;

        client.broadcast.emit('playerPosition',data);
    })

    client.on('turnNeck', function(data){
        client.broadcast.emit('turnNeck', data)
    })


    

    client.on('discThrow',function(data){
        console.log('disc has been thrown!',data)
        client.broadcast.emit('discThrow',{...data});
    })

    client.on('discState',function(data){
        // console.log('disc has been thrown!')
        client.broadcast.emit('discState',data);
    })

    client.on('log',function(data){
        console.log('[user'+ids[client.id]+']: ',...data.data)
    })


    client.on('disconnect',function(data){
        console.log(ids[client.id],'has disconnected!')
        if(gamestate.disc.state.playerID == ids[client.id]){
            gamestate.disc.state.location = 'air'
            gamestate.disc.state.playerID = null
        }
        // console.log(players)
        io.emit('removePlayer',{id:ids[client.id]})

        delete gamestate.players[ids[client.id]];
        delete ids[client.id];

        console.log('Players remaining:',Object.keys(gamestate.players).length);
        // console.log(players)
    })




    client.on('ping',function(data){
        client.emit('ping',data);
    })



})

server.listen(process.env.PORT || 8000, ()=>{console.log('Listening on port 8000...')})
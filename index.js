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
 
if(process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
}
else {
    app.use(express.static(path.join(__dirname, 'client/public')));
}
 
app.use(cors());

server.listen(8000, ()=>{console.log('Listening on port 8000...')})
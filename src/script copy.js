import io from 'socket.io-client';
console.log(process.env.NODE_ENV)
const socket = process.env.NODE_ENV === 'production' ? io() : io('http://localhost:8000/');

// ------------------------------ THREE.JS -------------------------------

import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import gsap from 'gsap'
import { AnimationMixer, Vector2, Vector3 } from 'three'
import {downloads} from './loaders'

const log = (...args) => {
    socket.emit('log',{data:args});
}

console.log('scriptcopy.js')
// // console.log(OrbitControls)
// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')
canvas. style. webkitFilter = "blur(3px)"

// Scene
const scene = new THREE.Scene()
// scene.fog = new THREE.Fog(0xffffff, 10, 800);

const textureLoader = new THREE.TextureLoader()

const grass = textureLoader.load('/textures/grass.jpg')
grass.wrapS = THREE.RepeatWrapping;
grass.wrapT = THREE.RepeatWrapping;
grass.repeat.set(512,512);


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const init_width = window.innerWidth
const init_height = window.innerHeight
// console.log(init_width, init_height)

// Lights

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(-100,100,0)

directionalLight.castShadow = true;
directionalLight.shadow.camera.top = 500;
directionalLight.shadow.camera.left = 500;
directionalLight.shadow.camera.bottom = -500;
directionalLight.shadow.camera.right = -500;

directionalLight.shadow.mapSize.set(2048,2048)

scene.add(directionalLight)

const hemisphereLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1 );
scene.add( hemisphereLight );

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.x = -120
camera.position.y = 50
camera.position.z = 0
scene.add(camera)
var cam_rot_ang = 0;
camera.lookAt(-50,0,0)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true;
renderer.setClearColor('#79e8e6',0.7)


// var controls = new OrbitControls(camera, renderer.domElement)
// controls.target.set(0,0,0)
// controls.enableDamping = true
// controls.maxPolarAngle = Math.PI / 2 - 0.1
// controls.zoomSpeed = 0.5

// Objects
// --------------------------------------------------------------------------------------------------------

const PLANE = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000,1000), new THREE.MeshStandardMaterial({map: grass}))
PLANE.rotation.x = - Math.PI/2
PLANE.receiveShadow = true;
scene.add(PLANE)


const fieldLength = 500
const fieldWidth = 185
const endZone = 90

const fieldPoints = [
    new Vector3(-fieldWidth / 2, 0, -fieldLength / 2),
    new Vector3(-fieldWidth / 2, 0, fieldLength / 2),
    new Vector3(fieldWidth / 2, 0, fieldLength / 2),
    new Vector3(fieldWidth / 2, 0, -fieldLength / 2),
    new Vector3(-fieldWidth / 2, 0, -fieldLength / 2),
    new Vector3(-fieldWidth / 2, 0, -fieldLength / 2 + endZone),
    new Vector3(fieldWidth / 2, 0, -fieldLength / 2 + endZone),
    new Vector3(fieldWidth / 2, 0, fieldLength / 2 - endZone),
    new Vector3(-fieldWidth / 2, 0, fieldLength / 2 - endZone),
]

const fieldGeometry = new THREE.BufferGeometry().setFromPoints(fieldPoints);
const fieldLineMaterial = new THREE.LineBasicMaterial({linewidth: 4, color: 'white'})

const FIELD = new THREE.Line(fieldGeometry, fieldLineMaterial)
scene.add(FIELD)


// -------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------ APP MODE ----------------------------------------

import {App} from './app_control';

const APP = new App(socket);



// ------------------------------------ GAMESTATE ---------------------------------------

import {GameState} from './gamestate'

const GAME = new GameState(socket, scene, document.getElementById('minimap-canvas'), [fieldLength, fieldWidth], document.getElementById('speed-canvas'));


// Events
// --------------------------------------------------------------------------------------------------------

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // console.log('new width:',sizes.width)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const clock = new THREE.Clock()
let prev = 0

let fps = []
for(let i=0;i<60;i++) fps.push(1/60);
let fpssum = 1;
let counter = 0;


let ass = document.getElementById('ass-value');


var inGame = false;
const tick = () =>
{
    // console.log('hi')
    const elapsedTime = clock.getElapsedTime()
    let delta = elapsedTime - prev
    prev = elapsedTime

    fpssum += delta - fps[counter]
    fps[counter] = delta;
    counter = (counter+1) % 60;

    document.getElementById('fps-value').innerHTML = Math.round(60 / fpssum);

    if(APP.menu){

        cam_rot_ang += Math.PI/1000;
        let dist = 150;
        camera.position.set(dist*Math.sin(cam_rot_ang), 100, dist*Math.cos(cam_rot_ang));
        camera.lookAt(0,0,0);

        renderer.render(scene, camera);

        if(!APP.inGame && GAME.ready == true){
            console.log('stopping game');
            GAME.reset();
        }


    }

    else{
        GAME.update(delta);

        document.getElementById('users-value').innerHTML = Object.keys(GAME.players).length;

        renderer.render(GAME.scene, GAME.cams[GAME.camera_type].camera)
    }



    if(Object.keys(downloads).length > 0){
        document.getElementById('download-assets').style.display = 'block'
        ass.innerHTML = ''
        for(let asset in downloads){
            ass.innerHTML += '<br>' + asset + ': ' + Math.round(100 * downloads[asset][0] / downloads[asset][1]) + '%'
        }
    }
    else{
        document.getElementById('download-assets').style.display = 'none'
    }

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

document.addEventListener('keydown', e => {
    if(e.code == 'Escape'){
        if(APP.menu == false){
            APP.gameMenu();
        }
        else{
            if(APP.inGame){
                APP.enterGame();
            }
        }
    }
})



// ------------------------- USER CONTROLS


// ------------------------- SOCKET HANDLING


socket.on('init', data => {
    // data: {myId, players, disc}

    log('init',data.id)
    console.log('readying game')
    GAME.reset()
    GAME.initializeLoaders();
    GAME.ready = true;
    APP.enterRoom(data.roomID, data.room_name);

    log('adding own player:',data.id)
    GAME.addPlayer(data.id, true);

    socket.emit('newPlayer',{id:data.id})

    for(let pid in data.players){
        log('init new player:',pid)
        GAME.addPlayer(pid);
    }

    GAME.initializeDisc(data.disc);
})

socket.on('newPlayer', data => {
    // data: {id}
    log('adding new player:',data.id)
    GAME.addPlayer(data.id)
})


socket.on('playerState', data => {
    // log('updating player state:',data.id)
    GAME.changePlayerState(data.id, data.state)
})

socket.on('playerPosition', data => {
    GAME.movePlayer(data.id, data.position);
})

socket.on('turnNeck', data => {
    GAME.turnNeck(data.id, data.look, data.tilt);
})

socket.on('discThrow', data => {
    log('throwing:',data)
    GAME.throwDisc(data);
})

socket.on('discState', data => {
    log('disc:',data)
    GAME.changeDiscState(data)
})


socket.on('removePlayer', data => {
    GAME.removePlayer(data.id)
})



socket.on('ping', data => {
    document.getElementById('ping-value').innerHTML = new Date().getTime() - data.time;
})

setInterval(()=>{
    socket.emit('ping',{time: new Date().getTime()})
},3000)





















socket.on('getRooms', data => {
    APP.updateRooms(data);
})

socket.on('enterRoom', data => {
    APP.enterRoom(data.roomID);
})
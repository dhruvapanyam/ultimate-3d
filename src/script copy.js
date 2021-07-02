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

const log = (...args) => {
    socket.emit('log',{data:args});
}


// // console.log(OrbitControls)
// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

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



// ------------------------------------ GAMESTATE ---------------------------------------

import {GameState} from './gamestate'

const GAME = new GameState(socket, scene, document.getElementById('minimap-canvas'), [fieldLength, fieldWidth]);


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

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();



const clock = new THREE.Clock()
let prev = 0

const tick = () =>
{

    const elapsedTime = clock.getElapsedTime()
    let delta = elapsedTime - prev
    prev = elapsedTime


    GAME.update(delta);

    renderer.render(GAME.scene, GAME.cam.camera)
    


    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()



// ------------------------- USER CONTROLS

window.addEventListener('keydown', e => {
    if(e.code == 'KeyC'){
        GAME.tryCatchingDisc();
    }
})

// ------------------------- SOCKET HANDLING


socket.on('init', data => {
    // data: {myId, players, disc}

    // log('init',data.id)

    log('adding own player:',data.id)
    GAME.addPlayer(data.id, true);

    socket.emit('newPlayer',{id:data.id})

    for(let pid in data.players){
        log('adding new player:',pid)
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
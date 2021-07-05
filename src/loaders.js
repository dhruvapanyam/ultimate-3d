import { CompressedPixelFormat } from 'three'
import {Skeleton} from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import localforage from 'localforage'
import { player_animations } from './state_manager'
const fbxLoader = new FBXLoader()
const gltfLoader = new GLTFLoader()

const downloads = {}

var ANIMATIONS = {};
var MODELS = {};

var shannon = null;


async function loadModelFBX(model_path, onLoad) {
    const file = `/models/${model_path}.fbx`;
    // console.log(localStorage)
    // console.log('loadModelFBX:',file)
    const path = '/models'
    if(localStorage.getItem(file + 'temp') === null) {
        downloads[model_path] = [0,0];
        let response = await fetch(file);
        // console.log(response)
        const reader = response.clone().body.getReader();

        const contentLength = response.clone().headers.get('Content-Length');
        downloads[model_path][1] = contentLength
        // console.log('content length:',contentLength)

        // infinite loop while the body is downloading
        let val;
        while(true) {
            // done is true for the last chunk
            // value is Uint8Array of the chunk bytes
            const {done, value} = await reader.read();
            if(value != undefined) val = value;

            if (done) {
                // console.log('Done', response.arrayBuffer())
                const buf = await response.arrayBuffer();
                localStorage.setItem(file + 'temp', 'ok');
                localforage.setItem(file, buf)
                // console.log(buf, downloads[model_path][0])
                onLoad(fbxLoader.parse(buf, path));
                break;
            }

            
            downloads[model_path][0] += value.length;
            if(contentLength == downloads[model_path][0]) delete downloads[model_path]
                // console.log(`Received ${value.length} bytes`)
        }




        
        // fetch(file)
        // .then(res => res.arrayBuffer())
        // .then(async res => {
        //     localStorage.setItem(file + 'temp', 'yay');
        //     localforage.setItem(file, res)
        //     onLoad(fbxLoader.parse(res, path));
        // })
        // .catch(err => {
        //     // console.log(err);
        // })
    } else {
        console.log('Loading from cache...')
        localforage.getItem(file)
            .then(res => {
                // console.log(res);
                onLoad(fbxLoader.parse(res, path));
            })        
        // console.log("hello");
    }                
}

function loadModel(model_path, callback){
    if(model_path == 'shannon' && shannon != null){
        console.log('bypassing for shannon')
        callback(shannon)
        return;
    }
    const onLoad = (obj) => {
        // // console.log(model_path,obj)
        // console.log('loadModel::onLoad. Received:',obj)
        obj.scale.set(0.05,0.05,0.05)
        obj.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}})

        if(model_path == 'shannon')
        {
            console.log('saving shannon')
            shannon = cloneFbx(obj)
        }
        callback(obj)
    }

    loadModelFBX(model_path, onLoad);
}

function loadAnimation(anim_set, callback){
    const onLoad = (obj) => {
        // console.log('loadAnimation::onLoad. Received:',obj)
        let anims = {}
        for(let clip of obj.animations){
            let cname = clip.name.split('Armature|')[1];
            if(anim_set.has(cname)){
                // // console.log('Extracting animations clip:',cname,clip)
                anims[cname] = clip;
            }
        }
        callback(anims)
    }

    loadModelFBX('animations/mannequin/animations', onLoad)
}



function initializeLoaders(){
    console.log('Loading models!')
    loadModel('shannon', model => {
        MODELS['shannon'] = model;
    })

    loadAnimation(player_animations, anims => {
        for(let cname in anims){
            ANIMATIONS[cname] = anims[cname];
        }
    })
}


const cloneFbx = (fbx) => {
    const clone = fbx.clone(true)
    clone.animations = fbx.animations
    clone.skeleton = { bones: [] }

    const skinnedMeshes = {}

    fbx.traverse(node => {
        if (node.isSkinnedMesh) {
            skinnedMeshes[node.name] = node
        }
    })

    const cloneBones = {}
    const cloneSkinnedMeshes = {}

    clone.traverse(node => {
        if (node.isBone) {
            cloneBones[node.name] = node
        }

        if (node.isSkinnedMesh) {
            cloneSkinnedMeshes[node.name] = node
        }
    })

    for (let name in skinnedMeshes) {
        const skinnedMesh = skinnedMeshes[name]
        const skeleton = skinnedMesh.skeleton
        const cloneSkinnedMesh = cloneSkinnedMeshes[name]

        const orderedCloneBones = []

        for (let i=0; i<skeleton.bones.length; i++) {
            const cloneBone = cloneBones[skeleton.bones[i].name]
            orderedCloneBones.push(cloneBone)
        }

        cloneSkinnedMesh.bind(
            new Skeleton(orderedCloneBones, skeleton.boneInverses),
            cloneSkinnedMesh.matrixWorld)

        // For animation to work correctly:
        clone.skeleton.bones.push(cloneSkinnedMesh)
        clone.skeleton.bones.push(...orderedCloneBones)
    }

    return clone
}

export {loadModel, MODELS, ANIMATIONS, loadAnimation, downloads, cloneFbx, initializeLoaders}
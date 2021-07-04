import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const fbxLoader = new FBXLoader()
const gltfLoader = new GLTFLoader()

import {player_animations} from './state_manager'

var ANIMATIONS = {};
var MODELS = {};


function init_assets(character){
    // asset_loaders[character] = 0
    loadModel(character, model=>{MODELS[character] = model;})
}

for(let character of ['shannon']){
    init_assets(character)
}

loadAnimation(player_animations, anims=>{for(let a in anims) ANIMATIONS[a] = anims[a];});



function loadModel(model_path, callback){
    if(0 && model_path == 'shannon'){
        gltfLoader.load(
            './models/'+model_path+'.gltf',
            function(obj){
                console.log(model_path,obj)
                console.log('loadModel')
                obj.scale.set(0.05,0.05,0.05)
                obj.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}})
                callback(obj)
            }
        )
    }
    else{
        console.log('loading fbx:',model_path)
        fbxLoader.load(
            './models/'+model_path+'.fbx',
            function(obj){
                // console.log(model_path,obj)
                console.log('loadModel')
                obj.scale.set(0.05,0.05,0.05)
                obj.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}})
                callback(obj)
            }
        )
    }
}

function loadAnimation(anim_set, callback){
    fbxLoader.load(
        './models/animations/mannequin/animations.fbx',
        function(obj){
            console.log('loadAnimation')
            let anims = {}
            for(let clip of obj.animations){
                let cname = clip.name.split('Armature|')[1];
                if(anim_set.has(cname)){
                    // console.log('Extracting animations clip:',cname,clip)
                    anims[cname] = clip;

                }
            }
            callback(anims)

        }
    )
}

loadModel('disc1', model=>{MODELS['disc'] = model})

export {loadModel, MODELS, ANIMATIONS, init_assets}
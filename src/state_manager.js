

var _idle = 'idle_offence'
var _idle_defence = 'idle_defence'
var _jogging = 'jogging'
var _jog_backwards = 'jogging_backwards'
var _shuffle_left = 'shuffle_left'
var _shuffle_right = 'shuffle_right'
var _running = 'running'
var _jump = 'shuffle_left'
var _dive_left = 'diving_left'
var _dive_right = 'diving_right'
var _hold_center = 'holding_disc_center'
var _hold_fore = 'holding_disc_forehand'
var _hold_back = 'holding_disc_backhand'
var _throw_fore = 'throwing_disc_forehand'
var _throw_back = 'throwing_disc_backhand'
var _turn_back = 'turn_back'




const keys = {
    q: 'KeyQ',
    w: 'KeyW',
    e: 'KeyE',
    r: 'KeyR',
    a: 'KeyA',
    s: 'KeyS',
    d: 'KeyD',
    f: 'KeyF',
    z: 'KeyZ',
    x: 'KeyX',
    c: 'KeyC',
    v: 'KeyV',
    space: 'Space',
    Lshift: 'ShiftLeft',
    Rshift: 'ShiftRight',
    h: 'KeyH',
    t: 'KeyT',
    j: 'KeyJ',
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',

    catch_disc: 'catch_disc',
    throw_disc: 'throw_disc',
    threw_disc: 'threw_disc',

    tab: 'Tab',
    d1: 'Digit1',
    d2: 'Digit2',
    d3: 'Digit3',
    d4: 'Digit4',
    d5: 'Digit5',
}

const rotation_handler = {
    'pov':{
        'cutter':{
            left: keys.left,
            right: keys.right
        },
        'thrower':{
            left: keys.a,
            right: keys.d
        },
    },
    'broadcast':{
        'cutter':{
            left: keys.left,
            right: keys.right
        },
        'thrower':{
            left: keys.a,
            right: keys.d
        },
    }
}



const player_states = {
    // state_name: [anim_name, timeout]

    'idle': [_idle, null],
    'idle_defence': [_idle_defence, null],
    'jogging': [_jogging, null],
    'jog_backwards': [_jog_backwards, null],
    'shuffle_left': [_shuffle_left, null],
    'shuffle_right': [_shuffle_right, null],
    'running': [_running, null],
    'turning_back': [_turn_back, [0.6,'running']],
    'idle_vertical': [_jump, [1.2, 'idle']],
    'jogging_vertical': [_jump, [1.2, 'jogging']],

    'dive_left': [_dive_left, [2.3, 'idle']],
    'dive_right': [_dive_right, [2.3, 'idle']],
    // 'running_vertical': ['jump_catch', [2, 'running']],
    
    'holding_disc_center': [_hold_center, null],
    'holding_disc_forehand': [_hold_fore, null],
    'holding_disc_backhand': [_hold_back, null],
    'throwing_disc_forehand': [_throw_fore, [1, 'holding_disc_forehand']],
    'throwing_disc_backhand': [_throw_back, [1.2, 'holding_disc_backhand']],
    // 'throwing_disc_backhand': ['throwing_disc_backhand',

}

const player_animations = new Set();
for(let s in player_states) player_animations.add(player_states[s][0])

const player_transitions = {
    'pov': [
        ['idle', {true: [keys.d2], false: []}, 'idle_defence'],
        ['idle_defence', {true: [keys.d1], false: []}, 'idle'],
        ['idle', {true: [keys.up], false: []}, 'jogging'],
        ['idle', {true: [keys.down], false: []}, 'jog_backwards'],
        ['idle', {true: [keys.up,keys.Lshift], false: []}, 'running'],
        ['idle', {true: [keys.q], false: []}, 'dive_left'],
        ['idle', {true: [keys.e], false: []}, 'dive_right'],
        ['idle', {true: [keys.space], false: [keys.up,keys.Lshift]}, 'idle_vertical'],

        ['idle', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['jogging', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['jog_backwards', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['running', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['running', {true: [keys.r], false: []}, 'turning_back'],
        ['dive_right', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['dive_left', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['idle_vertical', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['jogging_vertical', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],

        // ['idle', {true: [keys.space,keys.Lshift], false: [keys.up]}, 'throwing_disc_forehand'],

        ['jogging', {true: [keys.up,keys.Lshift], false: []}, 'running'],
        ['jogging', {true: [keys.up,keys.space], false: []}, 'jogging_vertical'],
        ['jogging', {true: [], false: [keys.up]}, 'idle'],
        ['jogging', {true: [keys.q], false: []}, 'dive_left'],
        ['jogging', {true: [keys.e], false: []}, 'dive_right'],
        ['jog_backwards', {true: [], false: [keys.down]}, 'idle'],

        ['running', {true: [keys.up], false: [keys.Lshift]}, 'jogging'],
        ['running', {true: [], false: [keys.up]}, 'idle'],
        ['running', {true: [keys.q], false: []}, 'dive_left'],
        ['running', {true: [keys.e], false: []}, 'dive_right'],
        
        // ['idle_vertical', {true: [], false: [keys.space]}, 'idle'],

        ['idle', {true: [keys.h], false: [keys.up,keys.Lshift,keys.space]}, 'holding_disc_center'],
        // ['holding_disc_center', {true: [keys.j], false: [keys.q,keys.e]}, 'idle'],
        
        ['holding_disc_center', {true: [keys.e], false: [keys.q]}, 'holding_disc_forehand'],
        ['holding_disc_center', {true: [keys.q], false: [keys.e]}, 'holding_disc_backhand'],
        
        ['holding_disc_forehand', {true: [keys.w], false: [keys.q]}, 'holding_disc_center'],
        ['holding_disc_forehand', {true: [keys.q], false: [keys.w]}, 'holding_disc_backhand'],

        ['holding_disc_backhand', {true: [keys.e], false: [keys.w]}, 'holding_disc_forehand'],
        ['holding_disc_backhand', {true: [keys.w], false: [keys.e]}, 'holding_disc_center'],

        ['holding_disc_forehand', {true: [keys.space], false: []}, 'throwing_disc_forehand'],
        ['throwing_disc_forehand', {true: [keys.threw_disc], false: []}, 'idle'],

        ['holding_disc_backhand', {true: [keys.space], false: []}, 'throwing_disc_backhand'],
        ['throwing_disc_backhand', {true: [keys.threw_disc], false: []}, 'idle'],


        // ['throwing_disc_forehand', {true: [keys.throw_disc], false: []}, 'idle'],
        // ['throwing_disc_backhand', {true: [keys.throw_disc], false: []}, 'idle'],
        // ['holding_disc_center', {true: [keys.throw_disc], false: []}, 'idle'],


    ],
    'broadcast': [
        ['idle', {true: [keys.d2], false: []}, 'idle_defence'],
        ['idle_defence', {true: [keys.d1], false: []}, 'idle'],
        ['idle', {true: [keys.w], false: []}, 'jogging'],
        ['idle', {true: [keys.s], false: []}, 'jog_backwards'],
        ['idle', {true: [keys.f], false: []}, 'shuffle_right'],
        ['shuffle_right', {true: [], false: [keys.f]}, 'idle'],
        ['idle', {true: [keys.w,keys.Lshift], false: []}, 'running'],
        ['idle', {true: [keys.q], false: []}, 'dive_left'],
        ['idle', {true: [keys.e], false: []}, 'dive_right'],
        ['idle', {true: [keys.space], false: [keys.up,keys.Lshift]}, 'idle_vertical'],

        ['idle', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['jogging', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['jog_backwards', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['running', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['running', {true: [keys.r], false: []}, 'turning_back'],
        ['dive_right', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['dive_left', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['idle_vertical', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],
        ['jogging_vertical', {true: [keys.catch_disc], false: []}, 'holding_disc_center'],

        // ['idle', {true: [keys.space,keys.Lshift], false: [keys.up]}, 'throwing_disc_forehand'],

        ['jogging', {true: [keys.w,keys.Lshift], false: []}, 'running'],
        ['jogging', {true: [keys.w,keys.space], false: []}, 'jogging_vertical'],
        ['jogging', {true: [], false: [keys.w]}, 'idle'],
        ['jogging', {true: [keys.q], false: []}, 'dive_left'],
        ['jogging', {true: [keys.e], false: []}, 'dive_right'],
        ['jog_backwards', {true: [], false: [keys.s]}, 'idle'],

        ['running', {true: [keys.w], false: [keys.Lshift]}, 'jogging'],
        ['running', {true: [], false: [keys.w]}, 'idle'],
        ['running', {true: [keys.q], false: []}, 'dive_left'],
        ['running', {true: [keys.e], false: []}, 'dive_right'],
        
        // ['idle_vertical', {true: [], false: [keys.space]}, 'idle'],

        ['idle', {true: [keys.h], false: [keys.up,keys.Lshift,keys.space]}, 'holding_disc_center'],
        // ['holding_disc_center', {true: [keys.j], false: [keys.q,keys.e]}, 'idle'],
        
        ['holding_disc_center', {true: [keys.e], false: [keys.q]}, 'holding_disc_forehand'],
        ['holding_disc_center', {true: [keys.q], false: [keys.e]}, 'holding_disc_backhand'],
        
        ['holding_disc_forehand', {true: [keys.w], false: [keys.q]}, 'holding_disc_center'],
        ['holding_disc_forehand', {true: [keys.q], false: [keys.w]}, 'holding_disc_backhand'],

        ['holding_disc_backhand', {true: [keys.e], false: [keys.w]}, 'holding_disc_forehand'],
        ['holding_disc_backhand', {true: [keys.w], false: [keys.e]}, 'holding_disc_center'],

        ['holding_disc_forehand', {true: [keys.throw_disc], false: []}, 'throwing_disc_forehand'],
        ['throwing_disc_forehand', {true: [keys.threw_disc], false: []}, 'idle'],

        ['holding_disc_backhand', {true: [keys.throw_disc], false: []}, 'throwing_disc_backhand'],
        ['throwing_disc_backhand', {true: [keys.threw_disc], false: []}, 'idle'],


        // ['throwing_disc_forehand', {true: [keys.throw_disc], false: []}, 'idle'],
        // ['throwing_disc_backhand', {true: [keys.throw_disc], false: []}, 'idle'],
        // ['holding_disc_center', {true: [keys.throw_disc], false: []}, 'idle'],


    ]
}


const velocity_handler = {
    'idle': function(args){
        let {cur_vel} = args;
        return Math.max(0, cur_vel - 0.5);
    },

    'jogging': function(args){
        let {cur_vel} = args;
        return Math.min(15, cur_vel + 0.25)
    },

    'running': function(args){
        let {cur_vel} = args;
        return Math.min(30, Math.abs(cur_vel) + 2)
    },

    'turning_back': function(args){
        let {cur_vel,anim_time} = args;
        if(anim_time > 0.3) return -10
        return 0
    },

    'dive_left': function(args){
        let {cur_vel, anim_time} = args;
        if(anim_time < 0.4)
            return Math.max(0,cur_vel - 0.6)
        if(anim_time < 1)
            return cur_vel;
        
        return Math.max(0, cur_vel - 0.5)
    },

    'dive_right': function(args){
        return velocity_handler['dive_left'](args)
    },

    'jogging_vertical': function(args){
        let {cur_vel, anim_time} = args;
        if(anim_time < 0.6)
            // return Math.max(0,cur_vel - 0.007)
            return 7

        
        return 15;
    },

    'holding_disc_center': function(args){
        let {cur_vel} = args;
        return Math.max(0, cur_vel - 2.5)
    }, 

    'holding_disc_forehand': function(args){return 0;},
    'holding_disc_backhand': function(args){return 0;},

    'jog_backwards': function(args){
        let {cur_vel} = args;
        return Math.max(-10, cur_vel - 1)
    },    
    
}

const side_velocity_handler = {
    'dive_left': function(args){
        let {cur_vel,anim_time} = args;
        if(anim_time < 0.3)
            return 8
        if(anim_time < 1)
            return 12
        
        return Math.max(0, cur_vel - 0.5)
    },

    'dive_right': function(args){
        return -side_velocity_handler['dive_left'](args)
    },

    'holding_disc_center': function(args){return 0;},
    'holding_disc_forehand': function(args){return 0;},
    'holding_disc_backhand': function(args){return 0;},
}


export {keys, player_states, player_transitions, velocity_handler, player_animations, side_velocity_handler, rotation_handler};
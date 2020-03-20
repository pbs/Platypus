/**
 * This component plays audio using the SpringRoll VOPlayer instance. Audio is played by triggering specific messages defined in the audio component definition.
 *
 * @namespace platypus.components
 * @class AudioVO
 * @uses platypus.Component
 * @since 0.6.0
 */
/*global platypus */
import Data from '../Data.js';
import {arrayCache} from '../utils/array.js';
import createComponentClass from '../factory.js';

export default (function () {
    var sortByTime = function (a, b) {
            return a.time - b.time;
        },
        addEvents = function (fromList, toList) {
            var i = 0;
            
            for (i = 0; i < fromList.length; i++) {
                toList.push(Data.setUp(
                    'event', fromList[i].event,
                    'time', fromList[i].time || 0,
                    'message', fromList[i].message
                ));
            }
            
            if (i) {
                toList.sort(sortByTime);
            }
            
            return toList;
        },
        offsetEvents = function (fromList, toList, player) {
            var i = 0,
                offset = player.getElapsed();
            
            for (i = 0; i < fromList.length; i++) {
                toList.push(Data.setUp(
                    'event', fromList[i].event,
                    'time', (fromList[i].time || 0) + offset,
                    'message', fromList[i].message || null
                ));
            }
            
            if (i) {
                toList.sort(sortByTime);
            }
        },
        setupEventList = function (sounds, eventList, player) { // This function merges events from individual sounds into a full list queued to sync with the SpringRoll voPlayer.
            var i = 0,
                soundList = arrayCache.setUp();
            
            // Create alias-only sound list.
            for (i = 0; i < sounds.length; i++) {
                if (sounds[i].sound) {
                    if (sounds[i].events) {
                        soundList.push(offsetEvents.bind(this, sounds[i].events, eventList, player));
                    }
                    soundList.push(sounds[i].sound);
                } else {
                    soundList.push(sounds[i]);
                }
            }
            return soundList;
        },
        onComplete = function (completed, soundList) {
            this.playingAudio = false;
            if (!this.owner.destroyed) {
                this.checkTimeEvents(true, completed);
                this.player.unloadSound(); // Do this after, so sound times are still referenceable in line above.
                
                /**
                 * When an audio sequence is finished playing, this event is triggered.
                 *
                 * @event sequence-complete
                 */
                this.owner.triggerEvent('sequence-complete');
            } else {
                this.player.unloadSound();
            }
            arrayCache.recycle(soundList);
        };
    
    return createComponentClass({
        id: 'AudioVO',
        
        properties: {
            /**
             * Use the audioMap property object to map messages triggered with audio clips to play. At least one audio mapping should be included for audio to play. Here is an example audioMap object:
             *
             *       {
             *           "message-triggered": "audio-id",
             *           // This simple form is useful to listen for "message-triggered" and play "audio-id" using default audio properties.
             *
             *           "another-message": {
             *           // To specify audio properties, instead of mapping the message to an audio id string, map it to an object with one or more of the properties shown below. Many of these properties directly correspond to SoundJS play parameters.
             *
             *               "sound": "another-audio-id",
             *               // Required. This is the audio clip to play when "another-message" is triggered.
             *
             *               "events": [{
             *                   "event": "walk-to-the-left",
             *                   "time": 1500
             *               }]
             *               // Optional. Used to specify a list of events to play once the VO begins.
             *           }
             *       }
             *
             * @property audioMap
             * @type Object
             * @default null
             */
            audioMap: null
        },
            
        initialize: function () {
            var key = '';
            
            this.eventList = arrayCache.setUp();
    
            this.playingAudio = false;
            this.player = platypus.game.voPlayer;
    
            if (this.audioMap) {
                for (key in this.audioMap) {
                    if (this.audioMap.hasOwnProperty(key)) {

                        /**
                         * Listens for messages specified by the `audioMap` and on receiving them, begins playing corresponding audio clips.
                         *
                         * @method '*'
                         * @param [message.events] {Array} Used to specify the list of events to trigger while playing this audio sequence.
                         */
                        this.addEventListener(key, this.playSound.bind(this, this.audioMap[key]));
                    }
                }
            }
            
            this.paused = false;
        },

        events: {
            /**
             * On each `handle-render` message, this component checks its list of playing audio clips and stops any clips whose play length has been reached.
             *
             * @method 'handle-render'
             */
            "handle-render": function () {
                if (!this.paused) {
                    this.checkTimeEvents(false);
                }
            },

            "play-voice-over": function (vo) {
                this.playSound(vo);
            },

            /**
             * On receiving this message, audio will stop playing.
             *
             * @method 'stop-audio'
             */
            "stop-audio": function () {
                this.player.stop();
                this.player.voList = []; // Workaround to prevent a Springroll bug wherein stopping throws an error due to `voList` being `null`.
            }
        },
        
        methods: {
            checkTimeEvents: function (finished, completed) {
                var event = null,
                    events = this.eventList,
                    currentTime = 0,
                    owner = this.owner;
                
                if (events && events.length) {
                    currentTime = finished ? Infinity : this.player.getElapsed();

                    while (events.length && (events[0].time <= currentTime)) {
                        event = events.shift();
                        if (!finished || completed || !event.interruptable) {
                            owner.trigger(event.event, event.message);
                        }
                        event.recycle();
                    }
                }
            },

            destroy: function () {
                if (this.playingAudio) {
                    this.player.stop();
                    this.player.voList = []; // Workaround to prevent a Springroll bug wherein stopping throws an error due to `voList` being `null`.
                }
                arrayCache.recycle(this.eventList);
                this.eventList = null;
            },

            playSound: function (soundDefinition, value) {
                var soundList = null,
                    eventList = arrayCache.setUp(),
                    player = this.player;
    
                if (typeof soundDefinition === 'string') {
                    soundList = arrayCache.setUp(soundDefinition);
                } else if (Array.isArray(soundDefinition)) {
                    soundList = setupEventList(soundDefinition, eventList, player);
                } else {
                    if (soundDefinition.events) {
                        addEvents(soundDefinition.events, eventList);
                    }
                    if (Array.isArray(soundDefinition.sound)) {
                        soundList = setupEventList(soundDefinition.sound, eventList, player);
                    } else {
                        soundList = arrayCache.setUp(soundDefinition.sound);
                    }
                }
                
                if (value && value.events) {
                    addEvents(value.events, eventList);
                }
    
                player.play(soundList, onComplete.bind(this, true, soundList), onComplete.bind(this, false, soundList));
    
                // Removing `this.eventList` after play call since playing a VO clip could be stopping a currently playing clip with events in progress.
                arrayCache.recycle(this.eventList);
                this.eventList = eventList;
                this.playingAudio = true;
            }
        }
    });
}());

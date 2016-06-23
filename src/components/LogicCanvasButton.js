/**
 * Provides button functionality for a RenderSprite component.
 *
 * @namespace platypus.components
 * @class LogicCanvasButton
 * @uses platypus.Component
 */
/*global platypus */
(function () {
    'use strict';
    
    return platypus.createComponentClass({

        id: 'LogicCanvasButton',

        properties: {
            /**
             * The event to trigger when pressed.
             *
             * @property onPress
             * @type String
             * @default ""
             */
            "onPress": "",

            /**
             * The event to trigger when released.
             *
             * @property onRelease
             * @type String
             * @default ""
             */
            "onRelease": "",

            /**
             * The event to trigger when cancelled.
             *
             * @property onCancel
             * @type String
             * @default ""
             */
            "onCancel": "",

            /**
             * Whether this button's actions should be limited to the initial press/release.
             *
             * @property useOnce
             * @type Boolean
             * @default false
             */
            "useOnce": false,

            /**
             * Whether this button should start disabled.
             *
             * @property disabled
             * @type Boolean
             * @default false
             */
            "disabled": false
        },

        publicProperties: {
            /**
             * This sets the distance in world units from the bottom of the camera's world viewport. If set, it will override the entity's y coordinate. This property is accessible on the entity as `entity.bottom`.
             *
             * @property bottom
             * @type Number
             * @default null
             */
            "bottom": null,

            /**
             * This sets the distance in world units from the left of the camera's world viewport. If set, it will override the entity's x coordinate. This property is accessible on the entity as `entity.left`.
             *
             * @property bottom
             * @type Number
             * @default null
             */
            "left": null,

            /**
             * This sets the distance in world units from the right of the camera's world viewport. If set, it will override the entity's x coordinate. This property is accessible on the entity as `entity.right`.
             *
             * @property bottom
             * @type Number
             * @default null
             */
            "right": null,

            /**
             * This sets the distance in world units from the top of the camera's world viewport. If set, it will override the entity's y coordinate. This property is accessible on the entity as `entity.top`.
             *
             * @property bottom
             * @type Number
             * @default null
             */
            "top": null
        },

        constructor: function () {
            var state = this.owner.state;
            
            this.state = state;
            state.set('disabled', this.disabled);
            state.set('down', false);
            state.set('highlighted', false);
            this.owner.buttonMode = !this.disabled;
            this.cancelled = false;
            this.usedPress = false;
            this.usedRelease = false;
            this.last = null;
        },

        events: {
            /**
             * This component listens for camera updates to reposition the entity if its bottom, left, right, or top properties have been set.
             *
             * @method 'camera-update'
             * @param camera {platypus.Data} Camera update information
             * @param camera.viewport {platypus.AABB} The bounding box describing the camera viewport location in the world.
             */
            "camera-update": function (camera) {
                var vp = camera.viewport;

                if (typeof this.left === 'number') {
                    this.owner.x = vp.left + this.left;
                } else if (typeof this.right === 'number') {
                    this.owner.x = vp.right - this.right;
                }

                if (typeof this.top === 'number') {
                    this.owner.y = vp.top + this.top;
                } else if (typeof this.bottom === 'number') {
                    this.owner.y = vp.bottom - this.bottom;
                }
            },

            /**
             * Handles `disabled` state changes.
             *
             * @method 'handle-logic'
             */
            "handle-logic": function () {
                var eq = (this.disabled === this.state.get('disabled'));
                
                if (this.last !== eq) {
                    this.last = eq;
                }
            },

            /**
             * Triggers events per the component's definition when a press is made.
             *
             * @method 'mousedown'
             */
            "mousedown": function (eventData) {
                this.state.set('down', true);
                if (!this.state.get('disabled') && !(this.useOnce && this.usedPress)) {
                    if (this.onPress) {
                        this.owner.trigger(this.onPress);
                        this.usedPress = true; //Doing this prevents the Release/Cancel calls from occurring. Need to find a way to let the up and down both call for one use buttons.
                    }
                    eventData.pixiEvent.stopPropagation();
                }
            },

            /**
             * Triggers events per the component's definition when a press is released.
             *
             * @method 'pressup'
             */
            "pressup": function (eventData) {
                if (!this.state.get('disabled') && !(this.useOnce && this.usedRelease)) {
                    if (this.cancelled) {
                        if (this.onCancel) {
                            this.owner.trigger(this.onCancel);
                            this.usedRelease = true;
                        }
                    } else if (this.onRelease) {
                        this.owner.trigger(this.onRelease);
                        this.usedRelease = true;
                    }
                    eventData.pixiEvent.stopPropagation();
                }

                this.state.set('down', false);
                this.cancelled = false;
            },

            /**
             * If a press moves over the button, it's not cancelled.
             *
             * @method 'mouseover'
             */
            "mouseover": function () {
                if (this.state.get('down')) {
                    this.cancelled = false;
                }
            },

            /**
             * If a press moves off of the button, it's cancelled.
             *
             * @method 'mouseout'
             */
            "mouseout": function () {
                if (this.state.get('down')) {
                    this.cancelled = true;
                }
            },
            
            /**
             * Disables the entity.
             *
             * @method 'disable'
             */
            "disable": function () {
                this.state.set('disabled', true);
                this.owner.buttonMode = false;
            },
            
            /**
             * Enables the entity.
             *
             * @method 'enable'
             */
            "enable": function () {
                this.state.set('disabled', false);
                this.owner.buttonMode = true;
            },

            /**
             * Toggles whether the entity is disabled.
             *
             * @method 'toggle-disabled'
             */
            "toggle-disabled": function () {
                var value = this.state.get('disabled');
                
                this.owner.buttonMode = value;
                this.state.set('disabled', !value);
            },
            
            /**
             * Sets the entity's highlighted state to `true`.
             *
             * @method 'highlight'
             * @since 0.8.6
             */
            "highlight": function () {
                this.state.set('highlighted', true);
            },
            
            /**
             * Sets the entity's highlighted state to `false`.
             *
             * @method 'unhighlight'
             * @since 0.8.6
             */
            "unhighlight": function () {
                this.state.set('highlighted', false);
            },
            
            /**
             * Toggles the entity's highlighted state.
             *
             * @method 'toggle-highlight'
             * @since 0.8.6
             */
            "toggle-highlight": function () {
                this.state.set('highlighted', !this.state.get('highlighted'));
            }
        },
        
        methods: {
            destroy: function () {
                this.state = null;
            }
        }
    });
}());

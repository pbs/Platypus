/**
# COMPONENT **HandlerRenderCreateJS**
A component that handles updating rendering for components that are rendering via createjs. Each tick it calls all the entities that accept 'handle-render' messages.

## Dependencies
- **Needs a 'tick' or 'render' call** - This component doesn't need a specific component, but it does require a 'tick' or 'render' call to function. It's usually used as a component of an action-layer.
- [createjs.EaselJS][link1] - This component requires the EaselJS library to be included for canvas functionality.

## Messages

### Listens for:
- **child-entity-added** - Called when a new entity has been added to the parent and should be considered for addition to the handler. If the entity has a 'handle-render' or 'handle-render-load' message id it's added to the list of entities. Entities are sent a reference to the stage that we're rendering to, so they can add their display objects to it. 
  - @param entity (Object) - The entity that is being considered for addition to the handler.
- **tick, render** - Sends a 'handle-render' message to all the entities the component is handling. If an entity does not handle the message, it's removed it from the entity list. This function also sorts the display objects in the stage according to their z value. We detect when new objects are added by keeping track of the first element. If it changes the list gets resorted. Finally the whole stage is updated by CreateJS.
  - @param resp (object) - An object containing delta which is the time passed since the last tick. 
- **camera-update** - Called when the camera moves in the world, or if the window is resized. This function sets the canvas size and the stage transform.
  - @param cameraInfo (object) - An object containing the camera information. 

### Local Broadcasts:
- **mousedown** - This component captures this event on the canvas and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  
- **mouseup** - This component captures this event on the canvas and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  
- **mousemove** - This component captures this event on the canvas and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  

### Child Broadcasts:
- **handle-render** - Sent to entities to run their render for the tick.
  - @param object (object) - An object containing a delta variable that is the time that's passed since the last tick.
- **handle-render-load** - Sent to entities when they are added to the handler. Sends along the stage object so the entity can add its display objects. It also sends the parent DOM element of the canvas.
  - @param object.stage ([createjs.Stage][link2]) - The createjs stage object.
  - @param object.parentElement (object) - The DOM parent element of the canvas. 

## JSON Definition
    {
      "type": "HandlerRenderCreateJS",
      
      "acceptInput": {
          //Optional - What types of input the object should take. This component defaults to not accept any input.
          "touch": false, // Whether to listen for touch events (triggers mouse events)
          "click": false, // Whether to listen for mouse events
          "camera": false, // Whether camera movement while the mouse (or touch) is triggered should result in a mousemove event
          "movement": false // Whether to capture mouse movement even when there is no mouse-down.
      },
      "autoClear": false, //By default this is set to false. If true the canvas will be cleared each tick.
      "canvasId": "bob"   //Sets the id of the canvas. The canvas defaults to having no id.
    }
    
[link1]: http://www.createjs.com/Docs/EaselJS/module_EaselJS.html
[link2]: http://createjs.com/Docs/EaselJS/Stage.html
*/
/*global createjs */
/*global platypus */
/*jslint plusplus:true */
(function () {
    "use strict";

    var uagent   = navigator.userAgent.toLowerCase(),
        android4 = (uagent.indexOf('android 4.1') > -1) || (uagent.indexOf('android 4.2') > -1) || false, // This is used to detect and fix the duplicate rendering issue on certain native Android browsers.
        dpr      = window.devicePixelRatio || 1;
    
    return platypus.createComponentClass({

        id: "HandlerRenderCreateJS",
        
        constructor: function (definition) {
            var self = this;
            
            this.canvas = this.owner.canvas = document.createElement('canvas');
            this.canvas.id = definition.canvasId || '';
            this.owner.canvasParent = null;
            if (this.owner.element) {
                this.owner.canvasParent = this.owner.element;
                this.owner.element.appendChild(this.canvas);
            } else {
                this.owner.canvasParent = this.owner.rootElement;
                this.owner.rootElement.appendChild(this.canvas);
                this.owner.element = this.canvas;
            }
            
            this.stage = new createjs.Stage(this.canvas);
            
            if (definition.autoClear !== true) {
                this.stage.autoClear = false; //since most tile maps are re-painted every time, the canvas does not require clearing.
            }
            
            // The following appends necessary information to displayed objects to allow them to receive touches and clicks
            if (definition.acceptInput) {
                if (definition.acceptInput.click || definition.acceptInput.touch) {
                    this.setupInput(definition.acceptInput.touch, definition.acceptInput.movement, definition.acceptInput.camera);
                }
            }
            
            this.camera = {
                left: 0,
                top: 0,
                width: 0,
                height: 0
            };
            
            this.timeElapsed = {
                name: 'Render',
                time: 0
            };
            
            this.renderMessage = {
                delta: 0,
                stage:  this.stage
            };
            
            this.handleChildren = true;
            this.extraContent = false;
        },
        
        events: {
            "load": function () {
                var i = 0,
                    last = null;
                
                // Check for parallel render handlers. A bit gross, but viable until we find a better way - DDD
                for (i = 0; i < this.owner.components.length; i++) {
                    if ((this.owner.components[i] === this) || (this.owner.components[i].type.substring(0, 14) === 'handler-render')) {
                        last = this.owner.components[i];
                    }
                }
                
                if (last !== this) {
                    this.handleChildren = false;
                } else {
                    this.addEventListener("handle-render-addition", function (addition) {
                        var i = '';
                        
                        if (!this.extraContent) {
                            this.extraContent = {};
                        }

                        for (i in addition) {
                            if (addition.hasOwnProperty(i)) {
                                this.extraContent[i] = addition[i];
                            }
                        }
                    });
                }
            },
            
            "child-entity-added": function (entity) {
                var self = this;
                
                entity.triggerEvent('handle-render-load', {
                    stage: self.stage,
                    parentElement: self.owner.rootElement
                });
            },
            "pause-render": function (resp) {
                if (resp && resp.time) {
                    this.paused = resp.time;
                } else {
                    this.paused = -1;
                }
            },
            "unpause-render": function () {
                this.paused = 0;
            },
            "tick": (function () {
                var sort = function (a, b) {
                    return a.z - b.z;
                };
                
                return function (resp) {
                    var i = '',
                        x = 0,
                        child   = null,
                        time    = new Date().getTime(),
                        message = this.renderMessage,
                        bounds  = null;
                    
                    message.delta = resp.delta;

                    if (this.paused > 0) {
                        this.paused -= resp.delta;
                        if (this.paused < 0) {
                            this.paused = 0;
                        }
                    }

                    if (this.handleChildren) {
                        if (this.extraContent) {
                            for (i in this.extraContent) {
                                if (this.extraContent.hasOwnProperty(i)) {
                                    message[i] = this.extraContent[i];
                                }
                            }
                        }
                        if (this.owner.triggerEventOnChildren) {
                            this.owner.triggerEventOnChildren('handle-render', message);
                        }
                        if (this.extraContent) {
                            for (i in this.extraContent) {
                                if (this.extraContent.hasOwnProperty(i)) {
                                    delete this.extraContent[i];
                                    delete message[i];
                                }
                            }
                        }
                    } else {
                        this.owner.triggerEvent('handle-render-addition', message);
                    }
                    
                    if (this.stage) {
                        for (x = this.stage.children.length - 1; x > -1; x--) {
                            child = this.stage.children[x];
                            if (child.hidden) {
                                if (child.visible) {
                                    child.visible = false;
                                }
                            } else if (child.name !== 'entity-managed') {
                                bounds = child.getTransformedBounds();
                                if (!bounds || ((bounds.x + bounds.width >= this.camera.x) && (bounds.x <= this.camera.x + this.camera.width) && (bounds.y + bounds.height >= this.camera.y) && (bounds.y <= this.camera.y + this.camera.height))) {
                                    if (!child.visible) {
                                        child.visible = true;
                                    }
                                } else {
                                    if (child.visible) {
                                        child.visible = false;
                                    }
                                }
                            }
                            
                            if (child.visible) {
                                if (child.paused && !this.paused) {
                                    child.paused = false;
                                } else if (this.paused) {
                                    child.paused = true;
                                }
                            }
                        }

                        if (this.stage.reorder) {
                            this.stage.reorder = false;
                            this.stage.sortChildren(sort);
                        }
                        
                        this.timeElapsed.name = 'Render-Prep';
                        this.timeElapsed.time = new Date().getTime() - time;
                        platypus.game.currentScene.trigger('time-elapsed', this.timeElapsed);
                        time += this.timeElapsed.time;

                        this.stage.update(resp);
                        
                        // This is a fix for the Android 4.1 and 4.2 native browser where it duplicates the canvas. Also set "overflow: hidden" on the canvas's parent to bypass this rendering issue. - DDD
                        if (android4 && this.stage.autoClear) {
                            this.canvas.style.opacity = 0.99;

                            setTimeout(function () {
                                this.canvas.style.opacity = 1;
                            }, 0);
                        }
                        
                        this.timeElapsed.name = 'Render';
                        this.timeElapsed.time = new Date().getTime() - time;
                        platypus.game.currentScene.trigger('time-elapsed', this.timeElapsed);
                    }
                };
            }()),
            "camera-update": function (cameraInfo) {
                var dpr             = (window.devicePixelRatio || 1),
                    viewportCenterX = cameraInfo.viewportLeft + cameraInfo.viewportWidth / 2,
                    viewportCenterY = cameraInfo.viewportTop + cameraInfo.viewportHeight / 2;
                
                this.camera.x = cameraInfo.viewportLeft;
                this.camera.y = cameraInfo.viewportTop;
                this.camera.width = cameraInfo.viewportWidth;
                this.camera.height = cameraInfo.viewportHeight;
                
                this.canvas.width  = this.canvas.offsetWidth * dpr;
                this.canvas.height = this.canvas.offsetHeight * dpr;
                this.stage.setTransform((cameraInfo.viewportWidth / 2) * cameraInfo.scaleX * dpr, (cameraInfo.viewportHeight / 2) * cameraInfo.scaleY * dpr, cameraInfo.scaleX * dpr, cameraInfo.scaleY * dpr, (cameraInfo.orientation || 0) * 180 / Math.PI, 0, 0, viewportCenterX, viewportCenterY);

                if (this.moveMouse) {
                    this.moveMouse(cameraInfo);
                }
            }
        },
        methods: {
            setupInput: (function () {
                return function (enableTouch, triggerOnAllMovement, cameraMovementMovesMouse) {
                    var self = this,
                        originalEvent   = null,
                        x        = 0,
                        y        = 0,
                        setXY   = function (event) {
                            originalEvent = event;
                            x  = (event.stageX / dpr) / self.stage.scaleX + self.camera.x;
                            y  = (event.stageY / dpr) / self.stage.scaleY + self.camera.y;
                        },
                        mousedown = function (event) {
                            setXY(event);
                            self.owner.trigger('mousedown', {
                                event: event.nativeEvent,
                                x: x,
                                y: y,
                                entity: self.owner
                            });

                            // This function is used to trigger a move event when the camera moves and the mouse is still triggered.
                            if (cameraMovementMovesMouse) {
                                self.moveMouse = function () {
                                    setXY(originalEvent);
                                    self.owner.trigger('mousemove', {
                                        event: event.nativeEvent,
                                        x: x,
                                        y: y,
                                        entity: self.owner
                                    });
                                };
                            }
                        },
                        mouseup = function (event) {
                            setXY(event);
                            self.owner.trigger('mouseup', {
                                event: event.nativeEvent,
                                x: x,
                                y: y,
                                entity: self.owner
                            });
                            if (cameraMovementMovesMouse) {
                                self.moveMouse = null;
                            }
                        },
                        mousemove = function (event) {
                            setXY(event);
                            if (triggerOnAllMovement || event.nativeEvent.which || event.nativeEvent.touches) {
                                self.owner.trigger('mousemove', {
                                    event: event.nativeEvent,
                                    x: x,
                                    y: y,
                                    entity: self.owner
                                });
                            }
                        };
                    
                    if (enableTouch) {
                        createjs.Touch.enable(this.stage);
                    }

                    this.stage.addEventListener('stagemousedown', mousedown);
                    this.stage.addEventListener('stagemouseup', mouseup);
                    this.stage.addEventListener('stagemousemove', mousemove);
                    
                    this.removeStageListeners = function () {
                        this.stage.removeEventListener('stagemousedown', mousedown);
                        this.stage.removeEventListener('stagemouseup', mouseup);
                        this.stage.removeEventListener('stagemousemove', mousemove);
                    };
                };
            }()),
            
            destroy: function () {
                if (this.removeStageListeners) {
                    this.removeStageListeners();
                }
                this.stage = undefined;
                this.owner.canvasParent.removeChild(this.canvas);
                this.owner.canvasParent = null;
                this.owner.element = null;
                this.canvas = undefined;
            }
        },
        
        publicMethods: {
            getWorldPointFromScreen: function (sp) {
                //document.title = ((sp.y * dpr) / this.stage.scaleY + this.camera.y) + ', ' + ((sp.y / dpr) * this.stage.scaleY + this.camera.y) + ', ' + ((sp.y * dpr) * this.stage.scaleY + this.camera.y) + ', ';
                
                return {
                    x: (sp.x * dpr) / this.stage.scaleX + this.camera.x,
                    y: (sp.y * dpr) / this.stage.scaleY + this.camera.y
                };
            }
        }
    });
}());
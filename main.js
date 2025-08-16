import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { gsap } from 'gsap';
import ParticleSystem from './ParticleSystem.js';

// EventEmitter class - copied exactly from working project
class EventEmitter {
    constructor() {
        this.callbacks = {}
        this.callbacks.base = {}
    }

    on(_names, callback) {
        const that = this

        if(typeof _names === 'undefined' || _names === '') {
            console.warn('wrong names')
            return false
        }

        if(typeof callback === 'undefined') {
            console.warn('wrong callback')
            return false
        }

        const names = this.resolveNames(_names)

        names.forEach(function(_name) {
            const name = that.resolveName(_name)

            if(!(that.callbacks[ name.namespace ] instanceof Object))
                that.callbacks[ name.namespace ] = {}

            if(!(that.callbacks[ name.namespace ][ name.value ] instanceof Array))
                that.callbacks[ name.namespace ][ name.value ] = []

            that.callbacks[ name.namespace ][ name.value ].push(callback)
        })

        return this
    }

    trigger(_name, _args) {
        if(typeof _name === 'undefined' || _name === '') {
            console.warn('wrong name')
            return false
        }

        const that = this
        let finalResult = null
        let result = null

        const args = !(_args instanceof Array) ? [] : _args

        let name = this.resolveNames(_name)
        name = this.resolveName(name[ 0 ])

        if(name.namespace === 'base') {
            for(const namespace in that.callbacks) {
                if(that.callbacks[ namespace ] instanceof Object && that.callbacks[ namespace ][ name.value ] instanceof Array) {
                    that.callbacks[ namespace ][ name.value ].forEach(function(callback) {
                        result = callback.apply(that, args)

                        if(typeof finalResult === 'undefined') {
                            finalResult = result
                        }
                    })
                }
            }
        }

        return finalResult
    }

    resolveNames(_names) {
        let names = _names
        names = names.replace(/[^a-zA-Z0-9 ,/.]/g, '')
        names = names.replace(/[,/]+/g, ' ')
        names = names.split(' ')

        return names
    }

    resolveName(name) {
        const newName = {}
        const parts = name.split('.')

        newName.original  = name
        newName.value     = parts[ 0 ]
        newName.namespace = 'base'

        if(parts.length > 1 && parts[ 1 ] !== '') {
            newName.namespace = parts[ 1 ]
        }

        return newName
    }
}

// Loader class - copied exactly from working project
class Loader extends EventEmitter {
    constructor() {
        super()

        this.setLoaders()

        this.toLoad = 0
        this.loaded = 0
        this.items = {}
    }

    setLoaders() {
        this.loaders = []

        // Images
        this.loaders.push({
            extensions: ['jpg', 'png'],
            action: (_resource) => {
                const image = new Image()

                image.addEventListener('load', () => {
                    this.fileLoadEnd(_resource, image)
                })

                image.addEventListener('error', () => {
                    this.fileLoadEnd(_resource, image)
                })

                image.src = _resource.source
            }
        })

        // Draco
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('draco/')
        dracoLoader.setDecoderConfig({ type: 'js' })

        // GLTF
        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)

        this.loaders.push({
            extensions: ['glb', 'gltf'],
            action: (_resource) => {
                gltfLoader.load(_resource.source, (_data) => {
                    this.fileLoadEnd(_resource, _data)
                }, undefined, (error) => {
                    console.error('GLTF loading failed with DRACO, trying without DRACO:', error);
                    
                    // Try without DRACO
                    const fallbackLoader = new GLTFLoader();
                    fallbackLoader.load(_resource.source, (_data) => {
                        console.log('Model loaded successfully without DRACO');
                        this.fileLoadEnd(_resource, _data)
                    }, undefined, (fallbackError) => {
                        console.error('Model loading completely failed:', fallbackError);
                        // Still call fileLoadEnd to continue the loading process
                        this.fileLoadEnd(_resource, null)
                    });
                })
            }
        })
    }

    load(_resources = []) {
        for(const _resource of _resources) {
            this.toLoad++
            const extensionMatch = _resource.source.match(/\.([a-z]+)$/)

            if(typeof extensionMatch[1] !== 'undefined') {
                const extension = extensionMatch[1]
                const loader = this.loaders.find((_loader) => _loader.extensions.find((_extension) => _extension === extension))

                if(loader) {
                    loader.action(_resource)
                } else {
                    console.warn(`Cannot found loader for ${_resource}`)
                }
            } else {
                console.warn(`Cannot found extension of ${_resource}`)
            }
        }
    }

    fileLoadEnd(_resource, _data) {
        this.loaded++
        this.items[_resource.name] = _data

        this.trigger('fileEnd', [_resource, _data])

        if(this.loaded === this.toLoad) {
            this.trigger('end')
        }
    }
}

// Resources class - copied exactly from working project
class Resources extends EventEmitter {
    constructor(_assets) {
        super()

        this.items = {}

        this.loader = new Loader()

        this.groups = {}
        this.groups.assets = [..._assets]
        this.groups.loaded = []
        this.groups.current = null
        this.loadNextGroup()

        // Loader file end event
        this.loader.on('fileEnd', (_resource, _data) => {
            let data = _data

            // Convert to texture
            if(_resource.type === 'texture') {
                if(!(data instanceof THREE.Texture)) {
                    data = new THREE.Texture(_data)
                }
                data.needsUpdate = true
            }

            this.items[_resource.name] = data

            // Progress and event
            this.groups.current.loaded++
            this.trigger('progress', [this.groups.current, _resource, data])
        })

        // Loader all end event
        this.loader.on('end', () => {
            this.groups.loaded.push(this.groups.current)
            
            // Trigger
            this.trigger('groupEnd', [this.groups.current])

            if(this.groups.assets.length > 0) {
                this.loadNextGroup()
            } else {
                this.trigger('end')
            }
        })
    }

    loadNextGroup() {
        this.groups.current = this.groups.assets.shift()
        this.groups.current.toLoad = this.groups.current.items.length
        this.groups.current.loaded = 0

        this.loader.load(this.groups.current.items)
    }
}

// Assets definition - copied exactly from working project
const assets = [
    {
        name: 'base',
        data: {},
        items: [
            { name: 'googleHomeLedMaskTexture', source: '/assets/googleHomeLedMask.png', type: 'texture' },
            { name: 'googleHomeLedsModel', source: '/assets/googleHomeLedsModel.glb', type: 'model' },
            { name: 'loupedeckButtonsModel', source: '/assets/loupedeckButtonsModel.glb', type: 'model' },
            { name: 'topChairModel', source: '/assets/topChairModel.glb', type: 'model' },
            { name: 'coffeeSteamModel', source: '/assets/coffeeSteamModel.glb', type: 'model' },
            { name: 'elgatoLightModel', source: '/assets/elgatoLightModel.glb', type: 'model' },
            { name: 'threejsJourneyLogoTexture', source: '/assets/threejsJourneyLogo.png', type: 'texture' },
            { name: 'pcScreenModel', source: '/assets/pcScreenModel.glb', type: 'model' },
            { name: 'macScreenModel', source: '/assets/macScreenModel.glb', type: 'model' },
            { name: 'bakedDayTexture', source: '/assets/bakedDay.jpg', type: 'texture' },
            { name: 'bakedNightTexture', source: '/assets/bakedNight.jpg', type: 'texture' },
            { name: 'bakedNeutralTexture', source: '/assets/bakedNeutral.jpg', type: 'texture' },
            { name: 'lightMapTexture', source: '/assets/lightMap.jpg', type: 'texture' },
            { name: 'roomModel', source: '/assets/roomModel.glb' },
        ]
    }
];

// Global variables
let scene, camera, renderer;
let heroScene, heroCamera, heroRenderer;
let particles = [];
let roomObjects = [];
let isLoaded = false;
let mouseX = 0, mouseY = 0;

// David's room system
let roomModel, bakedDayTexture, bakedNightTexture, bakedNeutralTexture, lightMapTexture;
let roomMaterial;

// Initialize the application
class Portfolio3D {
    constructor() {
        try {
            console.log('Portfolio3D constructor called');
            this.init();
        } catch (error) {
            console.error('Error in Portfolio3D constructor:', error);
        }
    }

    init() {
        try {
            console.log('Portfolio3D init started');
            
            // Check if loading screen exists
            const loadingScreen = document.getElementById('loading-screen');
            console.log('Loading screen element found:', !!loadingScreen);
            
            // Initialize hero scene directly
            this.initHeroScene();
            
            // Initialize resources system (copied from working project)
            this.resources = new Resources(assets);
            
            // Wait for resources to load before creating the room
            this.resources.on('groupEnd', (group) => {
                if(group.name === 'base') {
                    console.log('All assets loaded, creating room...');
                    this.setupDavidRoom();
                }
            });
            
            // Add timeout fallback in case loading gets stuck
            setTimeout(() => {
                if (!isLoaded) {
                    console.warn('Loading timeout reached, checking what assets loaded...');
                    console.log('Loaded assets:', Object.keys(this.resources.items));
                    this.setupDavidRoom();
                }
            }, 15000); // 15 second timeout
            
            // Initialize other systems
            this.initScrollAnimations();
            this.initNavigation();
            this.initParticles();
            this.initMouseTracking();
            
            console.log('Portfolio3D init completed successfully');
        } catch (error) {
            console.error('Error in Portfolio3D init:', error);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('Found loading screen, starting hide process...');
            loadingScreen.style.opacity = '0';
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                console.log('Loading screen completely hidden');
            }, 500);
            console.log('Loading screen fade out started');
        } else {
            console.warn('Loading screen element not found');
        }
    }

    initHeroScene() {
        try {
            console.log('Looking for hero-canvas element...');
            const container = document.getElementById('hero-canvas');
            if (!container) {
                console.error('Hero canvas container not found!');
                console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
                return;
            }
            console.log('Hero canvas container found:', container);

            // Scene setup
            heroScene = new THREE.Scene();
            heroScene.fog = new THREE.Fog(0x000000, 50, 150);
            
            heroCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 1000);
            heroRenderer = new THREE.WebGLRenderer({ 
                antialias: true, 
                alpha: true 
            });
            
            heroRenderer.setSize(container.clientWidth, container.clientHeight);
            heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            heroRenderer.setClearColor(0x000000, 0);
            heroRenderer.shadowMap.enabled = true;
            heroRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(heroRenderer.domElement);
            console.log('3D renderer setup complete. Canvas size:', container.clientWidth, 'x', container.clientHeight);

            // Professional isometric view - perfect angle and distance for design
            heroCamera.position.set(-10, 10, 8);
            heroCamera.lookAt(0, 0, 0)
            heroCamera.rotation.x = THREE.MathUtils.degToRad(-47); 
            // Handle resize
            window.addEventListener('resize', () => this.onHeroResize());
            
            console.log('Hero scene initialization completed successfully');
        } catch (error) {
            console.error('Error in initHeroScene:', error);
        }
    }

    setupDavidRoom() {
        console.log('Setting up David\'s exact room...');
        
        try {
            // Get loaded assets from resources (exactly like working project)
            if (!this.resources.items.roomModel) {
                console.error('Room model failed to load');
                return;
            }
            
            roomModel = this.resources.items.roomModel.scene.children[0];
            bakedDayTexture = this.resources.items.bakedDayTexture;
            bakedNightTexture = this.resources.items.bakedNightTexture;
            bakedNeutralTexture = this.resources.items.bakedNeutralTexture;
            lightMapTexture = this.resources.items.lightMapTexture;
            
            // Check if all required assets loaded
            if (!roomModel || !bakedDayTexture || !bakedNightTexture || !bakedNeutralTexture || !lightMapTexture) {
                console.error('Some required assets failed to load:', {
                    roomModel: !!roomModel,
                    bakedDayTexture: !!bakedDayTexture,
                    bakedNightTexture: !!bakedNightTexture,
                    bakedNeutralTexture: !!bakedNeutralTexture,
                    lightMapTexture: !!lightMapTexture
                });
                return;
            }
            
            // Set texture properties (exactly like working project)
            bakedDayTexture.encoding = THREE.sRGBEncoding;
            bakedDayTexture.flipY = false;
            bakedNightTexture.encoding = THREE.sRGBEncoding;
            bakedNightTexture.flipY = false;
            bakedNeutralTexture.encoding = THREE.sRGBEncoding;
            bakedNeutralTexture.flipY = false;
            lightMapTexture.flipY = false;
            
            // Create David's exact material system
            this.createDavidMaterial();
            
            // Apply material to room model
            roomModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.material = roomMaterial;
                }
            });
            
            // Add room to scene
            heroScene.add(roomModel);
            console.log('David\'s room added to scene');
            
            // Load individual models
            this.loadIndividualModels();
            
            // Setup TV screen with video
            this.setupTVScreen();
            
            // Create football logo screensaver
            this.createFootballScreensaver();
            
            // Create David's exact lighting
            this.createDavidLighting();
            
            // Add floating gaming elements
            this.createFloatingGamingElements();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Make sure hero section is visible
            const heroSection = document.querySelector('.hero-section');
            if (heroSection) {
                heroSection.style.visibility = 'visible';
                heroSection.style.opacity = '1';
                console.log('Hero section made visible');
            }
            
            // Start the render loop
            this.startRenderLoop();
            
            console.log('David\'s room setup complete');
            isLoaded = true;
        } catch (error) {
            console.error('Error in setupDavidRoom:', error);
        }
    }

    loadIndividualModels() {
        console.log('Loading individual models...');
        
        // Load chair model
        const chairModel = this.resources.items.topChairModel.scene.children[0];
        chairModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = roomMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        heroScene.add(chairModel);
        
        // Load PC screen model with video
        const pcScreenModel = this.resources.items.pcScreenModel.scene.children[0];
        this.setupVideoScreen(pcScreenModel, '/assets/videoPortfolio.mp4');
        heroScene.add(pcScreenModel);
        
        // Load Mac screen model with video
        const macScreenModel = this.resources.items.macScreenModel.scene.children[0];
        this.setupVideoScreen(macScreenModel, '/assets/videoStream.mp4');
        heroScene.add(macScreenModel);
        
        // Load other models
        const loupedeckModel = this.resources.items.loupedeckButtonsModel.scene.children[0];
        loupedeckModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = roomMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        heroScene.add(loupedeckModel);
        
        const elgatoModel = this.resources.items.elgatoLightModel.scene.children[0];
        elgatoModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = roomMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        heroScene.add(elgatoModel);
        
        const googleHomeModel = this.resources.items.googleHomeLedsModel.scene.children[0];
        googleHomeModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = roomMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        heroScene.add(googleHomeModel);
        
        const coffeeSteamModel = this.resources.items.coffeeSteamModel.scene.children[0];
        coffeeSteamModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = roomMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        heroScene.add(coffeeSteamModel);
        
        console.log('All individual models loaded and added to scene');
    }
    
    setupVideoScreen(mesh, videoPath) {
        console.log('Setting up video screen with:', videoPath);
        
        // Create video element
        const videoElement = document.createElement('video');
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.controls = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.src = videoPath;
        
        // Try to play the video
        videoElement.play().catch(error => {
            console.warn('Video autoplay failed:', error);
        });
        
        // Create video texture
        const videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.encoding = THREE.sRGBEncoding;
        
        // Create material with video texture
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture
        });
        
        // Apply video material to the mesh
        mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = videoMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        console.log('Video screen setup complete');
    }
    
    setupTVScreen() {
        console.log('Setting up TV screen...');
        
        // Find the TV screen mesh in the room model
        let tvScreenMesh = null;
        let meshCount = 0;
        
        roomModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                meshCount++;
                console.log(`Mesh ${meshCount}:`, {
                    name: child.name || 'unnamed',
                    position: child.position,
                    material: child.material ? 'has material' : 'no material'
                });
                
                // Look for a mesh that might be the TV screen
                if (child.geometry.boundingBox) {
                    const size = new THREE.Vector3();
                    child.geometry.boundingBox.getSize(size);
                    
                    console.log(`Mesh ${meshCount} size:`, size);
                    
                    // TV screens are usually large and flat
                    // Try different size criteria to find the TV
                    if ((size.x > 1.5 && size.y > 0.8 && size.z < 0.2) || 
                        (size.x > 2 && size.y > 1 && size.z < 0.3) ||
                        (size.x > 1 && size.y > 0.6 && size.z < 0.1)) {
                        console.log('Found potential TV screen mesh:', child.name || 'unnamed', 'with size:', size);
                        tvScreenMesh = child;
                    }
                }
            }
        });
        
        console.log(`Total meshes found: ${meshCount}`);
        
        if (tvScreenMesh) {
            console.log('Setting up video texture for TV screen');
            
            // Create video element for TV
            const tvVideoElement = document.createElement('video');
            tvVideoElement.muted = true;
            tvVideoElement.loop = true;
            tvVideoElement.controls = true;
            tvVideoElement.playsInline = true;
            tvVideoElement.autoplay = true;
            tvVideoElement.src = '/assets/videoPortfolio.mp4'; // Same video as monitor
            
            // Try to play the video
            tvVideoElement.play().catch(error => {
                console.warn('TV video autoplay failed:', error);
            });
            
            // Create video texture
            const tvVideoTexture = new THREE.VideoTexture(tvVideoElement);
            tvVideoTexture.encoding = THREE.sRGBEncoding;
            
            // Create material with video texture
            const tvVideoMaterial = new THREE.MeshBasicMaterial({
                map: tvVideoTexture
            });
            
            // Apply video material to the TV screen mesh
            tvScreenMesh.material = tvVideoMaterial;
            
            console.log('TV screen setup complete with video');
        } else {
            console.log('No TV screen mesh found, trying alternative approach...');
            
            // Alternative: try to find any large mesh and apply video to it
            let largestMesh = null;
            let largestArea = 0;
            
            roomModel.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry.boundingBox) {
                    const size = new THREE.Vector3();
                    child.geometry.boundingBox.getSize(size);
                    const area = size.x * size.y;
                    
                    if (area > largestArea && size.z < 0.5) { // Flat mesh
                        largestArea = area;
                        largestMesh = child;
                    }
                }
            });
            
            if (largestMesh) {
                console.log('Using largest flat mesh as TV screen:', largestMesh.name || 'unnamed');
                this.applyVideoToMesh(largestMesh, '/assets/videoPortfolio.mp4');
            } else {
                console.log('No suitable TV screen mesh found');
            }
        }
    }
    
    applyVideoToMesh(mesh, videoPath) {
        console.log('Applying video to mesh:', videoPath);
        
        // Create video element
        const videoElement = document.createElement('video');
        videoElement.muted = true;
        videoElement.loop = true;
        videoElement.controls = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        videoElement.src = videoPath;
        
        // Try to play the video
        videoElement.play().catch(error => {
            console.warn('Video autoplay failed:', error);
        });
        
        // Create video texture
        const videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.encoding = THREE.sRGBEncoding;
        
        // Create material with video texture
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture
        });
        
        // Apply video material to the mesh
        mesh.material = videoMaterial;
        
        console.log('Video applied to mesh successfully');
    }
    
    createFootballScreensaver() {
        console.log('Creating ZAID\'S PORTFOLIO text screensaver...');
        
        // Create a group for the text - using EXACT positioning from working project
        this.portfolioText = new THREE.Group();
        this.portfolioText.position.x = 4.2;  // Exact X position from working project
        this.portfolioText.position.y = 2.717; // Exact Y position from working project
        this.portfolioText.position.z = 1.630; // Exact Z position from working project
        heroScene.add(this.portfolioText);
        
        // Create canvas for MASSIVE "ZAID" text - 400% bigger
        const canvas = document.createElement('canvas');
        canvas.width = 2000; // Extra wide for massive text
        canvas.height = 800; // Extra tall for massive text
        const ctx = canvas.getContext('2d');
        
        // Set transparent background
        ctx.clearRect(0, 0, 2000, 800);
        
        // Create MASSIVE "ZAID" text - 400% bigger than before
        ctx.font = 'bold 720px Arial'; // 400% bigger: 180px * 4 = 720px
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // NO SHADOWS - just clean, crisp text
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw CRISP white text first (background) - make it thicker
        ctx.fillStyle = '#FFFFFF'; // Pure white
        ctx.fillText('ZAID', 1000, 400);
        
        // Draw CRISP bright yellow text on top
        ctx.fillStyle = '#FFFF00'; // Bright yellow
        ctx.fillText('ZAID', 1000, 400);
        
        // Add THICK black outline for maximum visibility and crispness
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 20; // Much thicker outline for massive text
        ctx.strokeText('ZAID', 1000, 400);
        
        // Add white outline for extra visibility
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 10; // Much thicker white outline
        ctx.strokeText('ZAID', 1000, 400);
        
        // Create texture from canvas
        const textTexture = new THREE.CanvasTexture(canvas);
        textTexture.encoding = THREE.sRGBEncoding;
        
        // Create plane geometry - using EXACT dimensions from working project
        const textGeometry = new THREE.PlaneGeometry(4, 1, 1, 1);
        textGeometry.rotateY(- Math.PI * 0.5); // Exact rotation from working project
        
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            premultipliedAlpha: true
        });
        
        this.portfolioTextMesh = new THREE.Mesh(textGeometry, textMaterial);
        this.portfolioTextMesh.scale.y = 0.359; // Exact scale from working project
        this.portfolioTextMesh.scale.z = 0.424; // Exact scale from working project
        this.portfolioText.add(this.portfolioTextMesh);
        
        // Animation properties - using EXACT limits and speeds from working project
        this.textAnimation = {
            z: 0,
            y: 0,
            limits: {
                z: { min: -1.076, max: 1.454 }, // Exact limits from working project
                y: { min: -1.055, max: 0.947 }  // Exact limits from working project
            },
            speed: {
                z: 0.00122, // 2x faster than before (0.00061 * 2)
                y: 0.00074  // 2x faster than before (0.00037 * 2)
            }
        };
        
        console.log('Portfolio text screensaver created at exact position:', this.portfolioText.position);
        console.log('Using exact animation limits and speeds from working project');
    }

    createDavidMaterial() {
        // David's exact material system with his colors
        const colors = {
            tv: '#ff115e',
            desk: '#ff6700',
            pc: '#0082ff'
        };

        // Create David's exact shader material
        roomMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uBakedDayTexture: { value: bakedDayTexture },
                uBakedNightTexture: { value: bakedNightTexture },
                uBakedNeutralTexture: { value: bakedNeutralTexture },
                uLightMapTexture: { value: lightMapTexture },

                uNightMix: { value: 1 },
                uNeutralMix: { value: 0 },

                uLightTvColor: { value: new THREE.Color(colors.tv) },
                uLightTvStrength: { value: 1.47 },
                uLightTvOff: { value: 0.12 },

                uLightDeskColor: { value: new THREE.Color(colors.desk) },
                uLightDeskStrength: { value: 1 },
                uLightDeskOff: { value: 0.18 },

                uLightPcColor: { value: new THREE.Color(colors.pc) },
                uLightPcStrength: { value: 1 },
                uLightPcOff: { value: 0.15 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uBakedDayTexture;
                uniform sampler2D uBakedNightTexture;
                uniform sampler2D uBakedNeutralTexture;
                uniform sampler2D uLightMapTexture;

                uniform float uNightMix;
                uniform float uNeutralMix;

                uniform vec3 uLightTvColor;
                uniform float uLightTvStrength;
                uniform float uLightTvOff;

                uniform vec3 uLightDeskColor;
                uniform float uLightDeskStrength;
                uniform float uLightDeskOff;

                uniform vec3 uLightPcColor;
                uniform float uLightPcStrength;
                uniform float uLightPcOff;

                varying vec2 vUv;

                void main() {
                    vec4 bakedDayColor = texture2D(uBakedDayTexture, vUv);
                    vec4 bakedNightColor = texture2D(uBakedNightTexture, vUv);
                    vec4 bakedNeutralColor = texture2D(uBakedNeutralTexture, vUv);
                    vec4 lightMapColor = texture2D(uLightMapTexture, vUv);

                    vec4 bakedColor = mix(bakedDayColor, bakedNightColor, uNightMix);
                    bakedColor = mix(bakedColor, bakedNeutralColor, uNeutralMix);

                    vec3 lightTv = uLightTvColor * uLightTvStrength * lightMapColor.r;
                    vec3 lightDesk = uLightDeskColor * uLightDeskStrength * lightMapColor.g;
                    vec3 lightPc = uLightPcColor * uLightPcStrength * lightMapColor.b;

                    vec3 finalColor = bakedColor.rgb + lightTv + lightDesk + lightPc;

                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
        
        console.log('David\'s material created successfully');
    }

    createDavidLighting() {
        // Create ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        heroScene.add(ambientLight);

        // Create directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5);
        heroScene.add(directionalLight);

        // Create TV light
        const tvLight = new THREE.PointLight(0xff115e, 1, 10);
        tvLight.position.set(0, 2, -5);
        heroScene.add(tvLight);

        // Create desk light
        const deskLight = new THREE.PointLight(0xff6700, 1, 10);
        deskLight.position.set(-2, 1, 0);
        heroScene.add(deskLight);

        // Create PC light
        const pcLight = new THREE.PointLight(0x0082ff, 1, 10);
        pcLight.position.set(2, 1, 0);
        heroScene.add(pcLight);

        // Static lighting - no animation
        console.log('Static lighting created');
    }

    createFloatingGamingElements() {
        // Simple static elements - no animation
        console.log('Static gaming elements created');
    }

    initParticles() {
        const particleContainer = document.getElementById('particles');
        if (!particleContainer) return;

        // Create floating particles
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: ${Math.random() > 0.5 ? '#FFD700' : '#FFA500'};
                border-radius: 50%;
                opacity: ${Math.random() * 0.6 + 0.4};
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                pointer-events: none;
                animation: float-particle ${Math.random() * 10 + 10}s linear infinite;
            `;
            
            particleContainer.appendChild(particle);
            particles.push(particle);
        }

        // Add CSS animation for particles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float-particle {
                0% { transform: translateY(0px) translateX(0px); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
                    // Initialize interactive particle system (keeping existing particles)
            this.initInteractiveParticles();
    }

    initInteractiveParticles() {
        try {
            // Create full-screen particle effect with small yellow dots
            this.particleSystem = new ParticleSystem({
                particleCount: 50, // More small particles
                particleColor: '#FFFF00', // Yellow color for small dots
                particleSize: { min: 3, max: 8 }, // Bigger size for better visibility
                trailLength: 25,
                trailOpacity: 0.8,
                particleSpeed: 0.4, // Slightly faster movement
                connectionDistance: 120, // Closer connections
                connectionOpacity: 0.3 // More visible connections
            });
            
            // Initialize custom cursor
            this.initCustomCursor();
            
            console.log('Interactive particle system initialized');
        } catch (error) {
            console.error('Error initializing interactive particles:', error);
        }
    }

    initCustomCursor() {
        try {
            // Create custom cursor element
            this.customCursor = document.createElement('div');
            this.customCursor.className = 'custom-cursor';
            this.customCursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
            document.body.appendChild(this.customCursor);
            
            // Track mouse movement for custom cursor
            document.addEventListener('mousemove', (e) => {
                if (this.customCursor) {
                    this.customCursor.style.left = e.clientX + 'px';
                    this.customCursor.style.top = e.clientY + 'px';
                }
            });
            
            console.log('Custom cursor initialized');
        } catch (error) {
            console.error('Error initializing custom cursor:', error);
        }
    }

    initMouseTracking() {
        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        });
    }

    initScrollAnimations() {
        // Parallax scrolling effect
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.parallax');
            
            parallaxElements.forEach(element => {
                const speed = element.dataset.speed || 0.5;
                element.style.transform = `translateY(${scrolled * speed}px)`;
            });

            // Animate 3D scene based on scroll
            if (roomObjects && roomObjects.length > 0) {
                roomObjects.forEach((object, index) => {
                    const scrollProgress = scrolled / (document.body.scrollHeight - window.innerHeight);
                    const offset = object.userData.originalPosition;
                    
                    if (object.userData.floatSpeed) {
                        object.position.y = offset.y + Math.sin(scrollProgress * Math.PI * 2 + index) * 1;
                    }
                });
            }
        });

        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Observe all sections
        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });
    }

    initNavigation() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Mobile navigation toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
    }

    onHeroResize() {
        const container = document.getElementById('hero-canvas');
        if (!container) return;

        heroCamera.aspect = container.clientWidth / container.clientHeight;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(container.clientWidth, container.clientHeight);
    }

    // Simple render method - no animation loop
    render() {
        try {
            if (heroRenderer && heroScene && heroCamera) {
                heroRenderer.render(heroScene, heroCamera);
            } else {
                console.warn('3D elements not ready for rendering:', {
                    heroRenderer: !!heroRenderer,
                    heroScene: !!heroScene,
                    heroCamera: !!heroCamera
                });
            }
        } catch (error) {
            console.error('Error in render method:', error);
        }
    }
    
    startRenderLoop() {
        console.log('Starting render loop with 3D elements:', {
            heroRenderer: !!heroRenderer,
            heroScene: !!heroScene,
            heroCamera: !!heroCamera
        });
        
        const animate = () => {
            this.render();
            this.updateFootballAnimation();
            requestAnimationFrame(animate);
        };
        animate();
        console.log('Render loop started successfully');
    }
    
    updateFootballAnimation() {
        if (this.portfolioText && this.textAnimation) {
            // Update animation values using EXACT speeds from working project
            this.textAnimation.z += this.textAnimation.speed.z;
            this.textAnimation.y += this.textAnimation.speed.y;
            
            // Bounce off limits using EXACT limits from working project
            if (this.textAnimation.z > this.textAnimation.limits.z.max) {
                this.textAnimation.z = this.textAnimation.limits.z.max;
                this.textAnimation.speed.z *= -1;
            }
            if (this.textAnimation.z < this.textAnimation.limits.z.min) {
                this.textAnimation.z = this.textAnimation.limits.z.min;
                this.textAnimation.speed.z *= -1;
            }
            if (this.textAnimation.y > this.textAnimation.limits.y.max) {
                this.textAnimation.y = this.textAnimation.limits.y.max;
                this.textAnimation.speed.y *= -1;
            }
            if (this.textAnimation.y < this.textAnimation.limits.y.min) {
                this.textAnimation.y = this.textAnimation.limits.y.min;
                this.textAnimation.speed.y *= -1;
            }
            
            // Apply animation to text position
            this.portfolioTextMesh.position.z = this.textAnimation.z;
            this.portfolioTextMesh.position.y = this.textAnimation.y;
            
            // Debug: log position every 60 frames (about once per second)
            if (Math.random() < 0.016) { // 1/60 chance
                console.log('Portfolio text position:', {
                    x: this.portfolioText.position.x,
                    y: this.portfolioText.position.y + this.textAnimation.y,
                    z: this.portfolioText.position.z + this.textAnimation.z
                });
            }
        }
    }

    destroy() {
        // Clean up Three.js resources
        if (heroRenderer) {
            heroRenderer.dispose();
        }
        
        // Clear room objects
        if (roomObjects) {
            roomObjects.length = 0;
        }
        
        console.log('Portfolio3D destroyed and cleaned up');
    }
}

// Initialize the portfolio when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating Portfolio3D instance...');
    window.portfolio3D = new Portfolio3D();
    console.log('Portfolio3D instance created:', window.portfolio3D);
});

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // Here you would typically send the data to a server
            console.log('Form submitted:', { name, email, message });
            
            // Show success message
            alert('Thank you for your message! I\'ll get back to you soon.');
            
            // Reset form
            contactForm.reset();
        });
    }
});

// Handle button clicks
document.addEventListener('DOMContentLoaded', () => {
    const viewWorkBtn = document.querySelector('.btn-primary');
    const getInTouchBtn = document.querySelector('.btn-secondary');
    
    if (viewWorkBtn) {
        viewWorkBtn.addEventListener('click', () => {
            document.querySelector('#portfolio').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    if (getInTouchBtn) {
        getInTouchBtn.addEventListener('click', () => {
            document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.portfolio3D) {
        window.portfolio3D.destroy();
    }
});

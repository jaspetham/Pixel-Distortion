import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'
import * as dat from 'dat.gui';
// import gsap from 'gsap';
import cool from './assets/cool2.jpg'
// import cool from './assets/car.jpg'


export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1); 
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    var frustumSize = 1;
    var aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera( frustumSize  / - 2, frustumSize / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2);
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    this.isPlaying = true;

    this.mouse = {
      x:0,
      y:0,
      prevX:0,
      prevY:0,
      vX:0,
      vY:0
    }
    
    this.addObjects();
    this.resize();
    this.render();
    this.setupResize();
    // this.settings();
    this.mouseEvents();
  }

  mouseEvents(){
    window.addEventListener('mousemove',(e) => {
      this.mouse.x = e.clientX / this.width;
      this.mouse.y = e.clientY / this.height;

      this.mouse.vX = this.mouse.x - this.mouse.prevX
      this.mouse.vY = this.mouse.y - this.mouse.prevY

      this.mouse.prevX = this.mouse.x
      this.mouse.prevY = this.mouse.y

    })
  }

  settings() {
    let that = this;
    this.settings = {
      maxDist: 8,
    };
    this.gui = new dat.GUI();
    this.gui.add(this.settings, "maxDist", 0, 50, 1);
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    // image cover
    this.imageAspect = 1./1.7;
    let a1; let a2;
    if(this.height/this.width>this.imageAspect) {
      a1 = (this.width/this.height) * this.imageAspect ;
      a2 = 1;
    } else{
      a1 = 1;
      a2 = (this.height/this.width) / this.imageAspect;
    }

    this.material.uniforms.resolution.value.x = this.width;
    this.material.uniforms.resolution.value.y = this.height;
    this.material.uniforms.resolution.value.z = a1;
    this.material.uniforms.resolution.value.w = a2;
    
    
    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    this.size = 256;
    // create a buffer with color data

    const width = this.size;
    const height = this.size;

    const size = width * height;
    const data =new Float32Array( 4 * size );

    for ( let i = 0; i < size; i ++ ) {
      let r = Math.random() * 255;
      const stride = i * 4;
      // const stride = i * 3;
      data[ stride ] = r;
      data[ stride + 1 ] = r;
      data[ stride + 2 ] = r;
      data[ stride + 3 ] = 255;
    }

    // used the buffer to create a DataTexture

    this.texture = new THREE.DataTexture( data, width, height, THREE.RGBAFormat, THREE.FloatType);
    this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter
    this.texture.needsUpdate = true


    let that = this;
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        resolution: { type: "v4", value: new THREE.Vector4() },
        uTexture : {value: new THREE.TextureLoader().load(cool)},
        uDataTexture : {value: this.texture},
       
      },
      vertexShader: vertex,
      fragmentShader: fragment
    });
    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if(!this.isPlaying){
      this.render()
      this.isPlaying = true;
    }
  }

  updateDataTexture(){
    let data = this.texture.image.data;
    for (let i = 0; i < data.length; i+=4) {
      data[i] *= 0.92
      data[i+1] *= 0.92
    }

    let gridMouseX = this.size * this.mouse.x
    let gridMouseY = this.size * (1- this.mouse.y)
    // let maxDist = this.settings.maxDist
    let maxDist = this.size/16

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        let distance = (gridMouseX - i) ** 2 + (gridMouseY - j) ** 2
        let maxDistSq = maxDist ** 2

        if(distance < maxDistSq){
          let index = 4 * (i  + this.size * j)

          let power = maxDist/ Math.sqrt(distance) 
          if(distance < 1) power = 1;
          // power = 1;
          data[index] +=  100 * (this.mouse.vX * 5) * power;
          data[index + 1] -= 100 * (this.mouse.vY * 5) * power;
        }
      }
    }

    this.mouse.vX *= 0.92;
    this.mouse.vY *= 0.92;


    this.texture.needsUpdate = true

  }

  render() {
    if (!this.isPlaying) return;
    this.time += 0.05;
    this.updateDataTexture();
    this.material.uniforms.time.value = this.time;
    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}

new Sketch({
  dom: document.getElementById("container")
});


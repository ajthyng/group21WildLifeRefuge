import { getCapiInstance } from "../utils/CAPI/capi";
import { random } from "../utils/helpers";
import { getSceneManager } from "./SceneManager";
const THREE = require("three");

export const NAME = "redtailHawk";
export const TYPE = "Hawk";

var TWEEN = require('@tweenjs/tween.js');


var tween3 = {};
var hare_x = 0;
var hare_y = 0;
var hare_z = 0;
function Hawk (scene) {
  this.hare_x =0;
  this.hare_y = 0;
  this.hare_z = 0;


  console.log("Added another Hawk");
  const size = 3;
  const color = "#db7093";

  const geometry = new THREE.CubeGeometry(size, size * 5, size);
  const material = new THREE.MeshBasicMaterial({ color });
  const cube = new THREE.Mesh(geometry, material);

  const SceneManager = getSceneManager();
  const widthBound = (0.95 * SceneManager.groundSize.x) / 2;
  const heightBound = (0.95 * SceneManager.groundSize.y) / 2;

  const x = random(-widthBound, widthBound);
  const y = 100;
  const z = random(-heightBound, heightBound);
  const position = { x, y, z };

  cube.position.set(position.x, position.y, position.z);
  cube.userData = {
    selectable: true,
    color: {
      original: color,
      highlight: "#f7ff6d",
      selected: "#808080"
    },
    name: NAME
  };
  cube.name = NAME;

  cube.type = TYPE;
  scene.add(cube);
  const tween1 = new TWEEN.Tween(cube.position)
      .to({ x: 500, y: 100, z: -100 }, 10000);


  const tween2 = new TWEEN.Tween(cube.position)
      .to({ x: -500, y: 100, z: 100 }, 10000)
      .start();
function checkForHare() {
  for(let i = 4; i < getSceneManager().subjects.length; i ++){
    console.log("length : " + getSceneManager().subjects.length );
    if(getSceneManager().subjects.length > 4){

      if(getSceneManager().subjects[i].model.name == "hare"){

        console.log(" I am created");
        tween3 = new TWEEN.Tween(cube.position)
            .to({ x: getSceneManager().subjects[i].model.position.x, y: getSceneManager().subjects[i].model.position.y,
              z: getSceneManager().subjects[i].model.position.z }, 10000)
        tween2.chain(tween3);
        tween3.chain(tween1);
      }
    }

  }
}



  tween1.chain(tween2);
  tween2.chain(tween1)


  function getX(){
    return this.hare_x;
  }
  function getY() {
    return this.hare_y;

  }
  function update () { //console.log("I am updated");
    checkForHare();

    /*
  //console.log(getSceneManager().subjects[5].model.name);
    hare_x = getSceneManager().subjects[5].model.position.x;
    hare_y = getSceneManager().subjects[5].model.position.y;
    hare_z = getSceneManager().subjects[5].model.position.z;
    console.log("x : " + hare_x);
    console.log("y : " + hare_y);
    console.log("z : " + hare_z);

*/


    TWEEN.update();

  }

  return {
    update,
    model: cube,
    created: new Date()
  };
}

export default Hawk;
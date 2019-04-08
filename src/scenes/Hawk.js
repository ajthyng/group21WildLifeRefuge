import { getSceneManager } from "./SceneManager";
import { getHawkObserver } from "./observer.js";
import { getHareID } from "./Hare.js";
import { random, randomInt } from "../utils/helpers";
import {
  hunger,
  gender,
  breed,
  label,
  pauseResume,
  death
} from "../utils/behavior";
import { getCapiInstance } from "../utils/CAPI/capi";
import ModelFactory from "./ModelFactory";

const THREE = require("three");

export const NAME = "redtailHawk";
export const TYPE = "Hawk";

var numberHawks = 0;
let TWEEN = require("@tweenjs/tween.js");

function Hawk (config) {
  let routineTweenStop = true;
  let hawkSpeed = 0.05;
  let isEating = false;
  let deathDelta = 0;
  const deathTimer = 60 * 60 * 24; // Eat within a day at max hunger or die
  const maxHunger = 10;
  const minHunger = 1;
  const size = 3;

  const genderBias = getCapiInstance().getValue({ key: "Hawk.maleBias" }) || 50;
  const hawkGender = gender({ bias: genderBias });
  const color = hawkGender === "female" ? "#db7093" : "#407093";

  // create a sphere or a hare
  const sphereGeometry = new THREE.SphereGeometry(6, 30, 30);
  const sphereMaterial = new THREE.MeshPhongMaterial({ color });
  const hareMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  hareMesh.name = "attachedHare";

  const geometry = new THREE.CubeGeometry(size, size * 5, size);
  const material = new THREE.MeshBasicMaterial({ color });
  const hawk = new THREE.Mesh(geometry, material);

  const SceneManager = getSceneManager();

  hawk.userData = {
    selectable: true,
    gender: hawkGender,
    color: {
      original: color,
      highlight: "#f7ff6d",
      selected: "#808080"
    },
    name: NAME
  };
  hawk.name = NAME;
  hawk.type = TYPE;

  const breedBehavior = breed({
    gender: hawkGender,
    type: TYPE,
    id: hawk.uuid,
    breedingHandler
  });

  function breedingHandler () {
    if (hawkGender === "female") {
      const babyHawk = ModelFactory.makeSceneObject({ type: "hawk" });
      SceneManager.addObject(babyHawk);
    }
  }

  const randomX = () => {
    const groundX = SceneManager.groundSize.x / 2;
    return random(-groundX, groundX);
  };

  const randomZ = () => {
    const groundZ = SceneManager.groundSize.y / 2;
    return random(-groundZ, groundZ);
  };
  hawk.position.x = randomX();
  hawk.position.z = randomZ();
  hawk.position.y = 100;

  let random_X = randomX();
  let random_Z = randomZ();
  let a = new THREE.Vector3(hawk.position.x, hawk.position.y, hawk.position.z);
  let b = new THREE.Vector3(random_X, 100, random_Z);
  let d = a.distanceTo(b);
  const tween1 = new TWEEN.Tween(hawk.position).to(
    { x: random_X, y: 100, z: random_Z },
    d / 0.05
  );
  random_X = randomX();
  random_Z = randomZ();
  a = new THREE.Vector3(hawk.position.x, hawk.position.y, hawk.position.z);
  b = new THREE.Vector3(random_X, 100, random_Z);
  d = a.distanceTo(b);

  const tween2 = new TWEEN.Tween(hawk.position).to(
    { x: random_X, y: 100, z: random_Z },
    d / hawkSpeed
  );
  random_X = randomX();
  random_Z = randomZ();
  a = new THREE.Vector3(hawk.position.x, hawk.position.y, hawk.position.z);
  b = new THREE.Vector3(random_X, 100, random_Z);
  d = a.distanceTo(b);
  var tween3 = new TWEEN.Tween(hawk.position).to(
    { x: random_X, y: 100, z: random_Z },
    d / hawkSpeed
  );
  // tween3.start();

  // hawk must track it's position and look for hares nearby as it flys
  getHawkObserver().subscribe(position => {
    // console.log("hawkObserver method called for Hawk: ");
  });
  let tweenChase = null;
  let chase = false;
  let newCycleChase = false;
  var myHawkID = numberHawks++;
  let selectedHareIndex = 0;
  let chaseSelectedHare = false;
  function checkForHare () {
    if (!isEating) {
      const hares = SceneManager.getSceneObjectsOf({ types: ["Hare"] });
      if (!chaseSelectedHare) {
        const hareIndex = randomInt(0, hares.length - 1);
        const randomHare = hares[hareIndex];
        selectedHareIndex = hareIndex;
        chaseSelectedHare = true;
      }
      if (!hares[selectedHareIndex]) {
        chaseSelectedHare = false;
        if (tweenChase != null) {
          tweenChase.stop();
        }
        routineFlying();
        return;
      }
      const selectedHare = hares[selectedHareIndex];
      tween3.stop();
      tween2.stop();
      tween1.stop();
      routineTweenStop = true;
      const a = new THREE.Vector3(
        hawk.position.x,
        hawk.position.y,
        hawk.position.z
      );
      const b = new THREE.Vector3(
        selectedHare.position.x,
        selectedHare.position.y,
        selectedHare.position.z
      );
      const d = a.distanceTo(b);
      tweenChase = new TWEEN.Tween(hawk.position).to(
        {
          x: selectedHare.position.x,
          y: selectedHare.position.y,
          z: selectedHare.position.z
        },
        d / 0.06
      );

      if (!chase) {
        tweenChase.start();
        chase = true;
      }
      tweenChase.onComplete(function () {
        if (isEating) {
          console.log("got hare");
          chase = false;
          tweenChase.stop();
          routineFlying();
        }
        if (!isEating) {
          chase = false;
        }
      });
    }
  }
  function routineFlying () {
    a = new THREE.Vector3(hawk.position.x, hawk.position.y, hawk.position.z);
    b = new THREE.Vector3(random_X, 100, random_Z);
    d = a.distanceTo(b);
    tween3 = new TWEEN.Tween(hawk.position).to(
      { x: random_X, y: 100, z: random_Z },
      d / hawkSpeed
    );
    if (routineTweenStop) {
      tween3.start();
      routineTweenStop = false;
    }
    tween1.chain(tween3);
    tween2.chain(tween1);
    tween3.chain(tween2);
  }

  var count = 1;
  const hawkHunger = hunger({
    maxHunger,
    minHunger,
    hungerTickRate: random(0.00001, 0.00005)
  });

  function get2DPosition () {
    SceneManager.camera.updateProjectionMatrix();
    const vector = hawk.position.clone().project(SceneManager.camera);
    vector.x = ((vector.x + 1) / 2) * SceneManager.screenDimensions.width - 14;
    vector.y = (-(vector.y - 1) / 2) * SceneManager.screenDimensions.height;
    return vector;
  }

  const hungerLabel = label({
    text: "Hunger\n",
    initialValue: hawkHunger.get().toFixed(1),
    type: TYPE,
    ...get2DPosition()
  });
  const shouldShowLabel = getCapiInstance().getValue({ key: "Hawk.label" });
  if (shouldShowLabel) hungerLabel.showLabel();

  const pauseResumeCleanup = pauseResume(pauseHawk, resumeHawk);

  function setLabelTo ({ visible }) {
    if (visible) hungerLabel.showLabel();
    else hungerLabel.hideLabel();
  }

  function onDestroy () {
    hungerLabel.destroy();
    pauseResumeCleanup();
  }

  function updateLabelPosition () {
    const position = get2DPosition();
    hungerLabel.update(position.x, position.y, hawkHunger.get().toFixed(1));
  }

  function pauseHawk () {
    tween3.stop();
  }

  function resumeHawk () {
    tween3.start();
  }
  routineFlying();
  let lastPositionBroadcast = null;
  const hawkObserver = getHawkObserver();

  const hawkDeathBehavior = death("Hawk");

  function update (elapsedTime, simulationTime) {
    count++;
    if (hawkGender === "female") {
      breedBehavior.signal(simulationTime);
    }

    hawkHunger.update(simulationTime, isEating);

    if (hawkDeathBehavior.isDead(simulationTime, hawkHunger, isEating)) {
      SceneManager.removeObject(hawk);
    }

    updateLabelPosition();
    // hungerLabel.update(position.x, position.y, hawkHunger.get().toFixed(1));

    if (hawkHunger.get() >= maxHunger * 0.75) {
      checkForHare();
    } else if (hawkHunger.get() <= minHunger) {
      hawk.remove(hareMesh);
      chase = false;
      isEating = false;
    }

    if (lastPositionBroadcast === null) lastPositionBroadcast = elapsedTime;
    if (elapsedTime - lastPositionBroadcast > 1) {
      lastPositionBroadcast = elapsedTime;
      hawkObserver.broadcast(hawk.position);
    }
    TWEEN.update();
  }

  function handleCollision (targets) {
    for (let i = 0; i < targets.length; i++) {
      if (targets[i].object.type === "Hare") {
        // added a hare when collision occur
        hawk.add(hareMesh);
        isEating = true;
        SceneManager.removeObject(targets[i].object);
        routineFlying();
      }
    }
  }

  return {
    update,
    setLabelTo,
    onDestroy,
    updateLabelPosition,
    model: hawk,
    created: new Date(),
    handleCollision
  };
}
export var getHawks = function () {
  return getSceneManager().getSceneObjectsOf({ types: ["Hawk"] });
};

export default Hawk;

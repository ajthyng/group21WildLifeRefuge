import { getSceneManager } from "./SceneManager";
import Hawk from "./Models/Hawk";
import Tree from "./Models/Tree";
import Hare from "./Models/Hare";
import Bush from "./Models/Bush";

function PreLoadModels ({ hawks, hares, cedars, bushes }) {
  const SceneManager = getSceneManager();
  for (let i = 0; i < cedars; i++) {
    SceneManager.addObject(new Tree(SceneManager.scene));
  }
  for (let i = 0; i < bushes; i++) {
    SceneManager.addObject(new Bush(SceneManager.scene));
  }
  for (let i = 0; i < hawks; i++) {
    SceneManager.addObject(new Hawk(SceneManager.scene));
  }
  for (let i = 0; i < hares; i++) {
    SceneManager.addObject(new Hare(SceneManager.scene));
  }

  function update () {}

  return {
    update
  };
}

export default PreLoadModels;

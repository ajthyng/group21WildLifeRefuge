const THREE = require("three");

export const NAME = "grass";
export const TYPE = "Grass";
function Cube (scene, config) {
  const {
    color = "#0080FF",
    size = 3,
    position = { x: 0, y: 0, z: 0 }
  } = config;

  const geometry = new THREE.CubeGeometry(size, size * 3, size);
  const material = new THREE.MeshBasicMaterial({ color });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(position.x, position.y, position.z);
  cube.userData = {
    selectable: true,
    color: {
      original: color,
      highlight: "#f7ff6d",
      selected: "#000"
    },
    name: NAME
  };
  cube.name = NAME;
  cube.type = TYPE;

  scene.add(cube);
  function update () {}

  return {
    update,
    model: cube,
    created: new Date()
  };
}

export default Cube;

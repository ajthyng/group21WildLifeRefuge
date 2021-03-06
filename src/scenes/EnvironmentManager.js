import {getSceneManager} from "./SceneManager";
import {getCapiInstance} from "../utils/CAPI/capi";
import {random} from "../utils/helpers";
import ModelFactory from "./ModelFactory";
import TargetedGrassField from "./TargetedGrassField";

// From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill#Polyfill
// Used to support Internet Explorer
if (!Array.prototype.fill) {
    Object.defineProperty(Array.prototype, "fill", {
        value: function(value) {

            // Steps 1-2.
            if (this == null) {
                throw new TypeError("this is null or not defined");
            }

            var O = Object(this);

            // Steps 3-5.
            var len = O.length >>> 0;

            // Steps 6-7.
            var start = arguments[1];
            var relativeStart = start >> 0;

            // Step 8.
            var k = relativeStart < 0 ?
                Math.max(len + relativeStart, 0) :
                Math.min(relativeStart, len);

            // Steps 9-10.
            var end = arguments[2];
            var relativeEnd = end === undefined ?
                len : end >> 0;

            // Step 11.
            var final = relativeEnd < 0 ?
                Math.max(len + relativeEnd, 0) :
                Math.min(relativeEnd, len);

            // Step 12.
            while (k < final) {
                O[k] = value;
                k++;
            }

            // Step 13.
            return O;
        }
    });
}

// From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
// Used to support Internet Explorer and Android Webviews
if (typeof Object.assign != "function") {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            if (target == null) { // TypeError if undefined or null
                throw new TypeError("Cannot convert undefined or null to object");
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource != null) { // Skip over if undefined or null
                    for (var nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

class EnvironmentManager {

    textureCanvas = null;
    sceneManager = null;
    localEnv = null;
    trackedObjects = [];
    weatherMod = 1.0;
    objectRemovalQueue = [];
    objectCreationQueue = [];
    envTime = 0;
    tickTock = true;

    //CAUTION! consumeKey objects will only be shallow copied
    defaultEnvironment = {
        water: 1.0,
        waterRegen: 0.001,
        waterFlow: 0.1,
        updateRate: 1,
        objectLimit: 1500,
        waterBalanceThreshold : 0.5,
        nutrients: 1.0,
        treeParams: [0.125, 0.125, 0.01, 2.0],
        grassParams: [0.01, 0.01, 0.01, 0.25],
        numAnimalParams: 1,
        hareParams: [1.0],
        hawkParams: [1.0],
        //TODO Document how the params are loaded into objects
        //TODO Detail necessary order of params
        envConsumeKeys: ["water", "nutrients"],
        auxEnvParams: ["germinationRate", "nutrientReturnOnDeath"],
        weatherTypes: ["Normal", "Rain", "Drought"],
        weatherModifiers: [1.0, 1.5, 0.5],
        weather: "Normal"
    };

    constructor(){

        this.initializeEnvironmentWithParams(this.defaultEnvironment);
        // Creates a THREE Texture using an HTML Canvas element
        var drawingCanvas = document.getElementById( "drawing-canvas" );
        var drawingContext = drawingCanvas.getContext( "2d" );
        drawingContext.fillStyle = "#996600";
        drawingContext.fillRect( 0, 0, this.sceneManager.groundSize.x, this.sceneManager.groundSize.y);

        this.textureCanvas = drawingCanvas;
        this.drawingContext = drawingContext;

        const capi = getCapiInstance();

        capi.getCapiAdapter().expose('env.weather', capi.capiModel,
            {allowedValues: capi.capiModel.get('env.weatherTypes')});

        capi.addListenerFor({
            key: "env.weather",
            callback: () => {
                this.updateWeatherModifier();
            }
        })

    }


    initializeEnvironmentWithParams(environmentObject) {

        this.defaultEnvironment = environmentObject;

        this.updateWeatherModifier();

        //Includes any parameters that we want in every environment tile,
        //other object values will simply be made available under the defaultEnvironment object
        const fillObject = environmentObject.envConsumeKeys.reduce(
            (o, key) => ({...o, [key]: environmentObject[key]}),
            {}
        );

        this.sceneManager = getSceneManager();

        //Added 1 to array size to handle odd ground sizes (1222 x 899) and objects at the absolute edge of the ground
        const groundX = Math.trunc(this.sceneManager.groundSize.x/10) + 1;
        const groundY = Math.trunc(this.sceneManager.groundSize.y/10) + 1;

        //Initializes an array shaped like our ground object, and fills it with a set of default environment conditions
        // CAUTION! Only does a shallow copy of the defaultEnvironment object
        this.localEnv = [...Array(groundX)].map(
            ()=>Array(groundY).fill().map(
                () => Object.assign({}, fillObject)
            ));
    }

    updateWeatherModifier(){

        const capi = getCapiInstance();

        const newWeather = capi.capiModel.get('env.weather');
        const weatherIdx = this.defaultEnvironment.weatherTypes.findIndex(type => type === newWeather);

        this.weatherMod = this.defaultEnvironment.weatherModifiers[weatherIdx];
        this.defaultEnvironment.weather = newWeather;

    }

    getEnvByXYPos(x, y){

        const pos = this.groundXYToCanvasXY(x, y);

        const envArrX = Math.trunc(pos.x/10);
        const envArrY = Math.trunc(pos.y/10);

        return this.localEnv[envArrX][envArrY];

    }

    canvasXYToGroundXY(x, y){

        const xPos = x - (this.sceneManager.groundSize.x / 2);
        const yPos = y - (this.sceneManager.groundSize.y / 2);

        return {x: xPos, y: yPos};
    }

    groundXYToCanvasXY(x, y){

        const xPos = x + (this.sceneManager.groundSize.x / 2);
        const yPos = y + (this.sceneManager.groundSize.y / 2);

        return {x: xPos, y: yPos};

    }


    prettyPrintEnvStateToConsole() {

        let output = "";
        let cssStyling = [];

        for (var i = 0; i < this.localEnv.length; i++){
            for (var j = 0; j < this.localEnv[0].length; j++){
                output += "%c█";

                let colorLightness = 100 - (50 * this.localEnv[j][i].water);
                let cssString = "color:hsl(204, 100%, " + colorLightness + "%)";
                cssStyling.push(cssString);
            }
            output += "\n";
        }

        console.clear();
        console.warn("CAUTION: USE SPARINGLY, THIS CLEARS THE CONSOLE AND PUTS A SIGNIFICANT"
                    + " BURDEN ON THE CONSOLE WINDOW");
        console.log(output, ...cssStyling);

    }

    drawOnCanvas(x, y, color = "#5b7aff", convertXY = true) {

        // If no value is passed for convertXY this assumes that you are giving it ground XY coordinates
        // that are centered on the object. This converts the xy to canvas coordinates and shifts the drawn
        // square so it will end up centered on the object
        let canvasPos = {x: x, y: y};
        if (convertXY){
            x -= 5;
            y -= 5;
            canvasPos = this.groundXYToCanvasXY(x, y);
        }

        const xPos = canvasPos.x;
        const yPos = canvasPos.y;

        this.drawingContext.fillStyle = color;

        this.drawingContext.fillRect(xPos, yPos, 10, 10 );
        if (this.sceneManager.ready){
            this.sceneManager.scene.children[3].material[2].map.needsUpdate = true;
        }

    }

    getAdjacentTiles(envArrX, envArrY) {

        let neighbors = [];

        const adjacencyMatrix = [[1,1], [0,1], [1,0], [-1,0], [0, -1], [-1,-1], [1,-1], [-1, 1]];

        const yBnd = this.localEnv.length;
        const xBnd = this.localEnv[0].length;


        for (var i = 0; i < adjacencyMatrix.length; i++) {
            let x = envArrX + adjacencyMatrix[i][0];
            let y = envArrY + adjacencyMatrix[i][1];

            if (((-1 < x && x < xBnd) && (-1 < y && y < yBnd))) {
                neighbors.push(this.localEnv[x][y]);
            }
        }

        return neighbors;
    }

    consume(object) {

        const pos = this.groundXYToCanvasXY(object.position.x, object.position.z);

        const envArrX = Math.trunc(pos.x/10);
        const envArrY = Math.trunc(pos.y/10);

        var neighbors = [];
        var groundTile = this.localEnv[envArrX][envArrY];

        if (object.type === 'Tree'){
            neighbors.push(...this.getAdjacentTiles(envArrX, envArrY));
        }

        for (var i=0; i < this.defaultEnvironment.envConsumeKeys.length; i++){

            let key = this.defaultEnvironment.envConsumeKeys[i];

            groundTile[key] -= object[key];

            if (neighbors.length > 0){
                let valid = neighbors.filter(tile => tile[key] >= 0);

                let balancedConsumption = object[key] / valid.length;
                for (var k=0; k < valid.length; k++){
                    valid[k][key] -= balancedConsumption;
                }
            }

        }

    }

    async createNearbyObject(object) {
        //create new object in radius
        if (this.trackedObjects.length < this.defaultEnvironment.objectLimit){
            //Will be updated for a proper radius later
            var newX = object.position.x + (random(-50, 50));
            var newY = object.position.z + (random(-50, 50));

            if (newX > 0){
                newX = Math.min(newX, (this.sceneManager.groundSize.x / 2) - 15);
            } else {
                newX = Math.max(newX, -(this.sceneManager.groundSize.x / 2) + 15);
            }

            if (newY > 0){
                newY = Math.min(newY, (this.sceneManager.groundSize.y / 2) - 15);
            } else {
                newY = Math.max(newY, -(this.sceneManager.groundSize.y / 2) + 15);
            }

            var newObject = null;
            switch (object.type) {
                case 'Tree':
                    newObject = ModelFactory.makeSceneObject(
                        {
                            type: "tree"
                        });
                    break;
                case 'Grass':
                    this.objectCreationQueue.push({x: newX, y: newY});
                    break;
                case 'Bush':
                    newObject = ModelFactory.makeSceneObject({ type: "bush" });
                    break;
                default:
                    break;
            }


            if (newObject !== null){
                newObject.model.position.x = newX;
                newObject.model.position.z = newY;
                this.sceneManager.addObject(newObject);
            }
        }

    }

    germinate(object) {
        //Checks if nutrients/water are high enough
        if (this.checkIfLiving(object)){

            if (object.germinationLevel >= 1.0){
                this.createNearbyObject(object);
                object.germinationLevel = 0;

            } else {
                //this makes it so that when it's sunnier, they will photosynthesize faster
                object.germinationLevel += (2 - this.weatherMod) * object.germinationRate
            }

        } else {
            this.sceneManager.removeObject(object);
        }
    }

    checkIfLiving(object) {
        const envAtObj = this.getEnvByXYPos(object.position.x, object.position.z);

        return this.defaultEnvironment.envConsumeKeys.every(key => envAtObj[key] > 0);
    }

    static getRandomByPercent(val, percentOffset){
        const offset = val * (percentOffset/100);

        return random(val - offset, val + offset);
    }


    registerTrackedObject(envObject) {


        const objectKey = this.getObjectParamKeyFromType(envObject.type);
        const targetArrLength = this.defaultEnvironment.envConsumeKeys.length + this.defaultEnvironment.auxEnvParams.length;

        //Checks that a match was found and that the array of parameters has the same length as our consumption keys
        //This section is for plant objects
        if (objectKey.length > 0 && this.defaultEnvironment[objectKey].length === targetArrLength){

            //Assigns consume key values from the object's capi Parameters. This assumes that the object parameters
            //and consume keys are in the same order.
            for (var i = 0; i < this.defaultEnvironment.envConsumeKeys.length; i++) {
                envObject[this.defaultEnvironment.envConsumeKeys[i]] = EnvironmentManager.getRandomByPercent(this.defaultEnvironment[objectKey][i], 20);
            }

            //Assigns auxiliary key values from the object's capi Parameters. This assumes that the object parameters
            //and auxiliary keys are in the same order.
            for (var j = 0; j < this.defaultEnvironment.auxEnvParams.length; j++) {
                //We use i+j because all object params are in an ordered shared array. So by starting at i + 0 we start at
                //the first object parameter after the envConsume keys
                envObject[this.defaultEnvironment.auxEnvParams[j]] = EnvironmentManager.getRandomByPercent(this.defaultEnvironment[objectKey][i+j], 20);
            }

            envObject["germinationLevel"] = 0.0;

            this.trackedObjects.push(envObject);

          //This next section is for animal environmental properties
        } else if (objectKey.length > 0 && this.defaultEnvironment[objectKey].length === this.defaultEnvironment.numAnimalParams) {

            const endOfAuxArr = this.defaultEnvironment.auxEnvParams.length - 1;

            for (var k = 0; k < this.defaultEnvironment.numAnimalParams; k++){
                envObject[this.defaultEnvironment.auxEnvParams[endOfAuxArr-k]] = EnvironmentManager.getRandomByPercent(this.defaultEnvironment[objectKey][k], 20);
            }

            //Animals are specifically not pushed into the tracked object array because they only have behaviors on death

        } else {
            console.warn("Object type: " + envObject.type + " is not currently supported by EnvironmentManger or\n" +
                "Object model parameters do not match environmentConsumeKeys length")
        }

    }

    getObjectParamKeyFromType(type){

        var findKey = Object.keys(this.defaultEnvironment).find(key => key.includes(type.toLowerCase()));

        return typeof findKey !== 'undefined' ? findKey : '';
    }

    onDeath(object){
        const pos = this.groundXYToCanvasXY(object.position.x, object.position.z);

        const envArrX = Math.trunc(pos.x/10);
        const envArrY = Math.trunc(pos.y/10);

        var tilesForReturn = [this.localEnv[envArrX][envArrY]];
        tilesForReturn.push(...this.getAdjacentTiles(envArrX, envArrY));

        tilesForReturn.forEach(tile => {
        tile.nutrients += object.nutrientReturnOnDeath;
        });

        //If the object is registered as a tracked object (all tracked objects have envConsumeKey properties)
        //then the object will be removed from the tracked object array
        if (object.hasOwnProperty(this.defaultEnvironment.envConsumeKeys[0])){
                this.objectRemovalQueue.push(object.uuid);
        }

    }

    //Creates a Generator iterator. This will iterate through the entire environment array with each call.
    //Use: localEnvGenerator.next() returns an object similar to {value: nextVal, done: false}
    //Google javascript generators to understand the functionality/uses better
    *localEnvGenerator () {
        for (var i = 0; i < this.localEnv.length; i++) {
            for (var j = 0; j < this.localEnv[0].length; j++) {
                yield {env: this.localEnv[j][i], x: j, y: i};
            }
        }
    }

    async toggleEnvironmentViewOnCanvasByParam(param) {

        for (var i = 0; i < this.localEnv.length; i++) {
            for (var j = 0; j < this.localEnv[0].length; j++) {
                let colorLightness = 100 - (50 * this.localEnv[j][i][param]);
                let titleColor = "hsl(204, 100%, " + colorLightness + "%)";
                this.drawOnCanvas(j * 10, i * 10, titleColor, false);
            }
        }

    }

    async balanceWaterTable() {

        const envGen = this.localEnvGenerator();
        let lowWater = [...envGen].filter(val => val.env.water < this.defaultEnvironment.waterBalanceThreshold);

        for (var i = 0; i < lowWater.length; i++) {

            //Will return valid adjacent env tiles
            let neighborsWithWater = this.getAdjacentTiles(lowWater[i].x, lowWater[i].y).filter(
                tile => tile.water > this.defaultEnvironment.waterBalanceThreshold);

            if (neighborsWithWater.length > 0) {
                let waterBalanced = this.defaultEnvironment.waterFlow / neighborsWithWater.length;
                for (var j = 0; j < neighborsWithWater.length; j++) {
                    neighborsWithWater[j].water -= waterBalanced;
                }

                lowWater[i].env.water += this.defaultEnvironment.waterFlow + (this.weatherMod * this.defaultEnvironment.waterRegen);
            }

        }

    }

    async update() {
        const simTime = this.sceneManager.getElapsedSimTime({ unit: "minutes" });

        //The update rate is tied to "hours" in simulation,
        //Update is called twice in the update rate period. Once for object consumption/germination
        //and again for balancing the water table. Each type of environment update will update at the
        //set cadence
        if( (simTime - this.envTime) > this.defaultEnvironment.updateRate * 30){

            //Removes objects that died during the last cycle
            for (var j = 0; j < this.objectRemovalQueue.length; j++){
                this.trackedObjects = this.trackedObjects.filter(obj => {
                    return obj.uuid !== this.objectRemovalQueue[j];
                })
            }

            this.objectRemovalQueue = [];

            if (this.tickTock){
                for (var i = 0; i < this.trackedObjects.length; i++) {
                    this.consume(this.trackedObjects[i]);
                    this.germinate(this.trackedObjects[i]);
                }

                this.tickTock = false;
            } else {
                this.balanceWaterTable();
                this.tickTock = true;
            }

            this.envTime = simTime;

            //Only for grass right now
            //Supports the efficient creation of a large number of grass objects
            if (this.objectCreationQueue.length > 0){

                if (this.objectCreationQueue.length > 50){
                    const tempQueue = this.objectCreationQueue.slice(0, 50);

                    const targetGrassField = await TargetedGrassField({
                        coords: tempQueue
                    });

                    for (var k = 0; k < targetGrassField.length; k++){
                        this.sceneManager.addObject(targetGrassField[k]);
                    }

                    this.objectCreationQueue = this.objectCreationQueue.slice(50);

                } else {
                    const targetGrassField = await TargetedGrassField({
                        coords: this.objectCreationQueue
                    });

                    for (var k = 0; k < targetGrassField.length; k++){
                        this.sceneManager.addObject(targetGrassField[k]);
                    }

                    this.objectCreationQueue = [];
                }

            }
        }

    }

}

export const getEnvironmentManager = () => {
    return EnvironmentManager.instance || null;
};

export default function (container) {
    if (!EnvironmentManager.instance) {
        EnvironmentManager.instance = new EnvironmentManager(container);
    }
    return EnvironmentManager.instance;
}
import React, { Component } from 'react';
import SimViewer from './SimViewer';
import { getSceneManager } from '../scenes/SceneManager';
import * as THREE from 'three';
import Cube from '../scenes/Cube';


import Dropdown from 'react-dropdown'
import 'react-dropdown/style.css'

class ElementButton extends Component {
  constructor (props) {
    super(props);



    // TODO: Need to add support for svg for custom button shapes
    if (this.props.hasOwnProperty('icon')) {
      var click;
      if (this.props.id === 'reset') {
        click = () => {
          SimViewer.scene.children[0].children = [];
        };
      } else {
        click = () => {
          alert('Clicked ' + this.props.id);
        };
      }

      this.button = (
        <button id={this.props.id} onClick={e => click()}>
          <img className={'ui-img'} alt='NOT LOADED' src={this.props.src} />
        </button>
      );
    } else {
      var onClick = () => {
        this.props.increment(this.props.name);

        var color;
        switch (this.props.model) {
          case 'tree':
            color = '#00C060';
            break;
          case 'hawk':
            color = 0xcc0000;
            break;
          case 'bush':
            color = 0x669900;
            break;
          case 'hare':
            color = 0xd9d9d9;
            break;
          default:
            break;
        }
        function random (min, max) {
          return Math.random() * (max - min) + min;
        }

        const SceneManager = getSceneManager();

        const widthBound = (0.95 * SceneManager.groundSize.x) / 2;
        const heightBound = (0.95 * SceneManager.groundSize.y) / 2;

        const x = random(-widthBound, widthBound);
        const y = 1.5;
        const z = random(-heightBound, heightBound);
        const position = { x, y, z };

        const cubeConfig = {
          size: 3,
          position,
          color
        };

        SceneManager.addObject(new Cube(SceneManager.scene, cubeConfig));
      };

      this.button = ( // TODO: Refactor to use an HTML button or other type of component, use of null anchor tags is highly discouraged
        <li className='dropdown1'>
          <a href='javascript:void(1)' className='dropbtn2'>
            {this.props.addText}
          </a>
          <div className='dropdown-content1'>
            <a onClick={e => onClick()} href='#'>
              {this.props.title}
            </a>
          </div>

        </li>
      );
    }
  }

  render () {


    return this.button;
  }
}
export default ElementButton;

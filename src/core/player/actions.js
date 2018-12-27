import UI from 'shared/ui';
import { merge } from 'lodash';
import bus from '../utilities/bus';
import config from '../../../config';
import Socket from '../../core/utilities/socket';
import actionList from './data/actions';

class Actions {
  constructor(data, tile, event, miscData) {
    this.player = data.player;
    this.event = event;
    this.background = data.background;
    this.foreground = data.foreground;
    this.npcs = data.npcs;
    this.droppedItems = data.map.droppedItems;

    // Viewport X,Y coordinates
    this.clicked = {
      x: tile.x,
      y: tile.y,
    };

    // Data relevant to the context
    this.miscData = miscData;

    // Coordinates on map where clicked
    this.coordinates = {
      x: (this.player.x - config.map.player.x) + this.clicked.x,
      y: (this.player.y - config.map.player.y) + this.clicked.y,
    };

    // Player coordinates
    this.playerCoordinates = {
      x: this.player.x,
      y: this.player.y,
    };

    this.foregroundObjects = this.getForegroundObjects();

    this.objectId = null;
  }

  /**
   * Look into the foreground for objects
   */
  getForegroundObjects() {
    const obj = this.foreground
      .filter(t => t > 0)
      .map(t => t - 252 - (1));
    console.log(obj);
  }

  /**
   * Execute the certain action by checking (if allowed)
   *
   * @param {object} data Information of tile, Action class and items
   * @param {object} queuedAction The action to take when a player reaches that tile
   */
  do(data, queuedAction = null) {
    const { item } = data;
    const clickedTile = data.tile;
    const doing = item.action.name.toLowerCase();

    const tile = UI.getTileOverMouse(
      this.background,
      this.player.x,
      this.player.y,
      clickedTile.x,
      clickedTile.y,
    );

    const tileWalkable = UI.tileWalkable(tile); // TODO: Add foreground.

    // If an action needs to be performed
    // after a player reaches their destination
    if (queuedAction && queuedAction.queueable) {
      const queuedActionSocket = merge(queuedAction, {
        player: {
          socket_id: this.player.socket_id,
        },
      });

      // Queue it up and tell the server.
      Socket.emit('player:queueAction', queuedActionSocket);
    }

    switch (doing) {
      // eslint-disable-next-line no-case-declarations
      case 'walk-here':
        // eslint-disable-next-line

        if (tileWalkable) {
          const coordinates = { x: clickedTile.x, y: clickedTile.y };

          const outgoingData = {
            id: this.player.uuid,
            coordinates,
          };

          Socket.emit('player:mouseTo', outgoingData);
        }
        break;

      // eslint-disable-next-line no-case-declarations
      case 'examine':
        bus.$emit('CHAT:MESSAGE', { type: 'normal', text: data.item.examine });

        break;

      case 'equip':
        Socket.emit('item:equip', {
          id: this.player.uuid,
          item: {
            id: data.item.id,
            uuid: data.item.uuid,
            slot: this.miscData.slot,
          },
        });
        break;

      case 'unequip':
        Socket.emit('item:unequip', {
          id: this.player.uuid,
          item: {
            id: data.item.id,
            uuid: data.item.uuid,
            slot: this.miscData.slot,
          },
        });
        break;

      case 'drop':
        Socket.emit('player:inventoryItemDrop', {
          id: this.player.uuid,
          item: {
            id: data.item.id,
            slot: data.item.miscData.slot,
            uuid: data.item.uuid,
          },
        });

        break;

      case 'take':
        if (tileWalkable) {
          const outgoingDataT = {
            id: this.player.uuid,
            coordinates: { x: clickedTile.x, y: clickedTile.y },
          };

          Socket.emit('player:mouseTo', outgoingDataT);
        }

        break;

      default:
      case 'cancel':
        break;
    }
  }
  /**
   * Build the context-menu list items
   *
   * @returns {promise}
   */
  build() {
    const self = this;

    return new Promise((resolve) => {
      let list = 0;
      const generateList = this.generateList();
      let actionableItems = [];
      const items = [];

      do {
        const action = generateList[list];
        actionableItems = self.check(action, items);
        list += 1;
      } while (list < generateList.length);

      resolve(actionableItems);
    }, this);
  }

  /**
   * Check to see if the list item is needed in list
   *
   * @param {string} action The item being checked
   * @returns {boolean}
   */
  async check(action) {
    // eslint-disable-next-line
    const getItems = this.droppedItems.filter(item => item.x === this.coordinates.x && item.y === this.coordinates.y);

    // eslint-disable-next-line
    const getNPCs = this.npcs.filter(npc => npc.x === this.coordinates.x && npc.y === this.coordinates.y);

    // const tile = UI.getTileOverMouse(
    //   this.background,
    //   this.player.x,
    //   this.player.y,
    //   this.clicked.x,
    //   this.clicked.y,
    // );


    // TODO
    // Abstract to global context-menu item template
    switch (action.name) {
      default:
        return false;
      // eslint-disable-next-line no-case-declarations
    }
  }

  /**
   * The list of actionable items that can appear
   *
   * @returns {array}
   */
  generateList() {
    const list = actionList;

    return list.filter(a => a.context.some(b => [...this.event.target.classList].includes(b)));
  }

  /**
   * See if the action allows to be clicked on from an appropriate class
   *
   * @param {object} target The element we are clicking on
   * @returns {boolean}
   */
  clickedOn(target) {
    return this.event.target.className.includes(target);
  }

  /**
   * See if incoming data has a certain object data
   *
   * @param {string} object The payload of the incoming menu item
   * @param {string} name The name of the objeect property we check for
   * @returns {boolean}
   */
  static hasProp(object, name) {
    return Object.prototype.hasOwnProperty.call(object, name);
  }
}

export default Actions;

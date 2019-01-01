import { RegisteredAreaHandler, RegisteredConnectorHandler } from './area/RegisteredHandler';

export interface AreaMatchHandlers {
  areaHandlers: Array<any>,
  connectorHandlers: Array<any>
}

import { ConnectorConstructor } from './area/Connector';
import { AreaConstructor } from './area/Area';

import { LocalPresence } from './presence/LocalPresence';
import { Presence } from './presence/Presence';

export class AreaMatchMaker {
  public handlers: {[id: string]: AreaMatchHandlers} = {};
  private presence: Presence;

  constructor(presence?: Presence) {
    this.presence = presence || new LocalPresence();
  }

  public async registerHandler(name: string, connectorKlass: ConnectorConstructor, areaKlass: AreaConstructor, options: any = {}) {
    options.name = name;
    const connectorCount = options.connectorCount || 1;
    const areaCount = options.areaCount || 1;
    // need at least 1 channel per area
    const channelCount = options.channelCount || areaCount;

    // make sure options are populated
    // with correct counts
    options.connectorCount = connectorCount;
    options.areaCount = areaCount;
    options.channelCount = channelCount;

    const connectorHandlers = [];
    const areaHandlers = [];

    for(let i = 0; i < connectorCount; i++) {
      connectorHandlers.push(new RegisteredConnectorHandler(connectorKlass, options))
    }

    for(let i = 0; i < areaCount; i++) {
      areaHandlers.push(new RegisteredAreaHandler(areaKlass, options))
    }

    this.handlers[ name ] = { areaHandlers, connectorHandlers};

   // await this.cleanupStaleRooms(name);

    return this.handlers[ name ];
  }
}
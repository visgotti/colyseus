import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { createTimeline, Timeline } from '@gamestdio/timeline';
import Clock from '@gamestdio/timer';
import { EventEmitter } from 'events';

import { Client } from '.';
import { Presence } from './../presence/Presence';

import { RemoteClient } from './presence/RemoteClient';
import { decode, Protocol, send, WS_CLOSE_CONSENTED } from './Protocol';
import { Deferred, logError, spliceOne } from './Utils';

import * as jsonPatch from 'fast-json-patch'; // this is only used for debugging patches
import { debugAndPrintError, debugPatch, debugPatchData } from './Debug';

const DEFAULT_PATCH_RATE = 1000 / 20; // 20fps (50ms)
const DEFAULT_SIMULATION_INTERVAL = 1000 / 60; // 60fps (16.66ms)

const DEFAULT_SEAT_RESERVATION_TIME = 3;

export type SimulationCallback = (deltaTime?: number) => void;

export type ConnectorConstructor<T= any> = new (presence?: Presence) => Connector<T>;

export interface RoomAvailable {
  roomId: string;
  clients: number;
  maxClients: number;
  metadata?: any;
}

import Room from '../Room';
import { Client } from '.';

import { FrontChannel } from '../../lib/CentrumChannels/FrontChannel';
import { Client as CentrumClient } from '../../lib/CentrumChannels/Client/Client';


export abstract class Connector<any> extends Room {
  private frontChannels: Array<FrontChannel>;

  constructor(presence?: Presence) {
    super();
    this.frontChannels = [];
  }

  // Abstract methods
  public abstract onMessage(client: Client, data: any): void;

  // Optional abstract methods
  public onChannelConnect?(client: Client, options?: any, auth?: any): void | Promise<any>;
  public onChannelLink?(client: Client, options?: any, auth?: any): void | Promise<any>;

  public requestChannelConnect(channelId: string, options: any, isNew?: boolean): number | boolean {
    return 1;
  }

  public requestChannelLink(channelId: string, options: any, isNew?: boolean): number | boolean {
    return 1;
  }

  public async connectAreaChannel(client: Client, channelId: number, options: any) {
    const frontChannel = this.frontChannels[channelId];
    await client.connectChannel(frontChannel);
  }

  private _onJoin(client: Client, options?: any, auth?: any) {
    // create remote client instance.
    if (client.remote) {
      client = (new RemoteClient(client, this.roomId, this.presence)) as any;
      this.remoteClients[client.sessionId] = client as any;
    }
    client.centrumClient = new CentrumClient(client.sessionId);

    this.clients.push( client );

    // delete seat reservation
    this.reservedSeats.delete(client.sessionId);
    if (this.reservedSeatTimeouts[client.sessionId]) {
      clearTimeout(this.reservedSeatTimeouts[client.sessionId]);
      delete this.reservedSeatTimeouts[client.sessionId];
    }

    // clear auto-dispose timeout.
    if (this._autoDisposeTimeout) {
      clearTimeout(this._autoDisposeTimeout);
      this._autoDisposeTimeout = undefined;
    }

    // lock automatically when maxClients is reached
    if (this.clients.length === this.maxClients) {
      this._maxClientsReached = true;
      this.lock.call(this, true);
    }

    // confirm room id that matches the room name requested to join
    send(client, [ Protocol.JOIN_ROOM, client.sessionId ]);

    // bind onLeave method.
    client.on('message', this._onMessage.bind(this, client));
    client.once('close', this._onLeave.bind(this, client));

    // send current state when new client joins the room
    if (this.state) {
      this.sendState(client);
    }

    const reconnection = this.reconnections[client.sessionId];
    if (reconnection) {
      reconnection.resolve(client);

    } else {
      // emit 'join' to room handler
      this.emit('join', client);
      return this.onJoin && this.onJoin(client, options, auth);
    }
  }

  /*
    Sends connector states to area servers
    for state to be processed and sent back.
   */
  protected broadcastConnectorStates(): boolean {
    for(let i = 0; i < this.frontChannels.length; i++) {
      this.frontChannels[i].broadcastPatch();
    }
  }

  protected broadcastConnectorState(areaIndex: number): boolean {
    if(!(this.frontChannels[areaIndex])) {
      return false;
    }
    this.frontChannels[areaIndex].broadcastPatch();
  }

  protected broadcastConnectorPatch(): boolean {
    // broadcast patches (diff state) to all clients,
    return this.broadcast( msgpack.encode([ Protocol.ROOM_STATE_PATCH, patches ]) );
  }

  protected broadcastConnectorPatches()  {
    for(let i = 0; i < this.frontChannels.length; i++) {
      this.frontChannels[i].broadcastPatch();
    }
  }

  // broadcasts needed linked area states to client
  protected broadcastClientAreaStates() {
    let numClients = this.clients.length;
    while (numClients--) {
      const client = this.clients[ numClients ];

      const state = client.getLinkedStates();

      if ( !state ) {
        debugPatch('trying to broadcast null state to client. Make sure you use requestAreaConnect and/or requestAreaLink');
        return false;
      }

      if (!(data instanceof Buffer)) {
        data = msgpack.encode([Protocol.ROOM_DATA, data]);
      }

      if ((!options || options.except !== client)) {
        send(client, data, false);
      }
    }
  }
}
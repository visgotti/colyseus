import Room from '../Room';
import { FrontChannel } from '../../lib/CentrumChannels/FrontChannel'

export type AreaConstructor<T= any> = new () => Area<T>;

export abstract class Area<any> {
  constructor() {
    super();
  }
  public onInit?(options: any): void;
  public onJoin?(client: Client, options?: any, auth?: any): void | Promise<any>;
  public onLeave?(client: Client, consented?: boolean): void | Promise<any>;
  public onDispose?(): void | Promise<any>;
  public requestJoin(options: any, isNew?: boolean): number | boolean {
    return 1;
  }
  public onAuth(options: any): boolean | Promise<any> {
    return true;
  }

  public async requestAreaConnect(client: Client, areaIndex: number, options: any) {
    const frontChannel = this.frontChannels[areaIndex];
    await client.connectChannel(frontChannel);
  }
}
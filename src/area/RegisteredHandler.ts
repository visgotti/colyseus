import { AreaConstructor } from './Area';
import { ConnectorConstructor } from './Connector';
import { RegisteredHandler } from '../matchmaker/RegisteredHandler';

export class RegisteredAreaHandler {
  public klass: AreaConstructor;
  public options: any;

  constructor(klass: AreaConstructor, options: any) {
    this.klass = klass;
    this.options = options;
  }
}

export class RegisteredConnectorHandler {
  public klass:  ConnectorConstructor;
  public options: any;

  constructor(klass: ConnectorConstructor, options: any) {
    this.klass = klass;
    this.options = options;
  }
}

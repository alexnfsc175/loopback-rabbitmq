import {BindingAddress, BindingKey} from '@loopback/core';
import {RabbitmqComponentConfig} from './interfaces';
import {RabbitmqComponent} from './rabbitmq.component';
import {RabbitmqServer} from './rabbitmq.server';

/**
 * Binding keys used by this component.
 */
export namespace RabbitmqBindings {
  /**
   * Binding key for `RabbitmqServer`
   */
  export const RABBITMQ_SERVER = BindingKey.create<RabbitmqServer>(
    'components.RabbitmqServer',
  );
  /**
   * Binding key for `RabbitmqComponent`
   */
  export const COMPONENT = BindingKey.create<RabbitmqComponent>(
    'components.RabbitmqComponent',
  );

  /**
   * Binding key for configuration of `RabbitmqComponent`.
   */
  export const CONFIG: BindingAddress<RabbitmqComponentConfig> = BindingKey.buildKeyForConfig<
    RabbitmqComponentConfig
  >(COMPONENT);
}

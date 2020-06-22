import {BindingAddress, BindingKey} from '@loopback/core';
import {RabbitmqComponentConfig} from './interfaces';
import {RabbitmqComponent} from './rabbitmq.component';
import {RabbitmqConsumer} from './rabbitmq.consumer';
import {RabbitmqProducer} from './rabbitmq.producer';

/**
 * Binding keys used by this component.
 */
export namespace RabbitmqBindings {
  /**
   * Binding key for `RabbitmqProducer`
   */
  export const RABBITMQ_PRODUCER = BindingKey.create<RabbitmqProducer>(
    'components.RabbitmqProducer',
  );

  /**
   * Binding key for `RabbitmqConsumer`
   */
  export const RABBITMQ_CONSUMER = BindingKey.create<RabbitmqConsumer>(
    'components.RabbitmqConsumer',
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

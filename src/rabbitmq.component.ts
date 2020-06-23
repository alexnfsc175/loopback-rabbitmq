import {
  bind,
  Binding,
  Component,
  ContextTags,
  createBindingFromClass,
  ProviderMap,
} from '@loopback/core';
import debugFactory from 'debug';
import {RabbitmqBindings} from './keys';
import {RabbitmqConsumer} from './rabbitmq.consumer';
import {RabbitmqProducer} from './rabbitmq.producer';
const debug = debugFactory('loopback:rabbitmq:component');

@bind({
  tags: {
    [ContextTags.KEY]: RabbitmqBindings.COMPONENT.key,
  },
})
export class RabbitmqComponent implements Component {
  providers?: ProviderMap = {};
  bindings?: Binding[];
  constructor() {
    debug('RabbitmqComponent::init');
    this.bindings = [
      createBindingFromClass(RabbitmqProducer, {
        key: RabbitmqBindings.RABBITMQ_PRODUCER,
      }),

      createBindingFromClass(RabbitmqConsumer, {
        key: RabbitmqBindings.RABBITMQ_CONSUMER,
      }),
    ];
  }
}

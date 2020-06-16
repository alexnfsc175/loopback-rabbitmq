import {
  Application,
  bind,
  Binding,
  Component,
  ContextTags,
  CoreBindings,
  createBindingFromClass,
  inject,
  ProviderMap
} from '@loopback/core';
import debugFactory from 'debug';
import {RabbitmqBindings} from './keys';
import {RabbitmqObserver} from './observers';
import {RabbitmqServer} from './rabbitmq.server';
const debug = debugFactory('loopback:rabbitmq:component');

@bind({
  tags: {
    [ContextTags.KEY]: RabbitmqBindings.COMPONENT.key,
  },
})
export class RabbitmqComponent implements Component {
  providers?: ProviderMap = {};
  bindings?: Binding[];
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: Application,
  ) {
    debug('RabbitmqComponent::init');
    this.bindings = [
      createBindingFromClass(RabbitmqServer, {
        key: RabbitmqBindings.RABBITMQ_SERVER,
      }),
    ];

    this.application.lifeCycleObserver(RabbitmqObserver);
  }
}

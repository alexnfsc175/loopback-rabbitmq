import {
  Application,
  bind,
  Binding,
  BindingScope,
  Component,
  config,
  Constructor,
  ContextTags,
  CoreBindings,
  createBindingFromClass,
  inject,
  LifeCycleObserver,
  ProviderMap,
} from '@loopback/core';
import debugFactory from 'debug';
import {ConfigDefaults, RabbitmqComponentConfig} from './interfaces';
import {RabbitmqBindings} from './keys';
import {RabbitmqConsumer} from './rabbitmq.consumer';
import {RabbitmqProducer} from './rabbitmq.producer';
const debug = debugFactory('loopback:rabbitmq:component');

@bind({
  tags: {[ContextTags.KEY]: RabbitmqBindings.COMPONENT.key},
  scope: BindingScope.SINGLETON,
})
export class RabbitmqComponent implements Component {
  providers?: ProviderMap = {};
  bindings?: Binding[];
  lifeCycleObservers?: Constructor<LifeCycleObserver>[];
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: Application,
    @config()
    private options: RabbitmqComponentConfig = ConfigDefaults,
  ) {
    debug('options: %o', options);
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

import {
  Application,
  Binding,
  BindingScope,
  Component,
  config,
  Constructor,
  ContextTags,
  CoreBindings,
  createBindingFromClass,
  extensionPoint,
  extensions,
  Getter,
  inject,
  LifeCycleObserver,
  ProviderMap,
} from '@loopback/core';
import {
  QueueComponentConfig,
  QueueConsumer,
  RabbitConsumeMetadataProvider,
} from '.';
import {QueueBindings, QUEUE_CONSUMER} from './keys';
import {QueueObserver} from './observers';

@extensionPoint(QUEUE_CONSUMER, {
  tags: {[ContextTags.KEY]: QueueBindings.COMPONENT.key},
  scope: BindingScope.SINGLETON,
})
export class QueueComponent implements Component {
  bindings?: Binding[];
  providers?: ProviderMap = {};
  lifeCycleObservers?: Constructor<LifeCycleObserver>[];

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: Application,
    @config()
    componentConfig: QueueComponentConfig = {},
    @extensions()
    private readonly getConsumers: Getter<QueueConsumer[]>,
  ) {
    this.bindings = [
      createBindingFromClass(RabbitConsumeMetadataProvider, {
        key: QueueBindings.RABBIT_CONSUME_METADATA,
      }),
    ];

    this.lifeCycleObservers = [QueueObserver];
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BindingScope,
  ContextTags,
  extensionPoint,
  extensions,
  Getter,
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  MetadataInspector
} from '@loopback/core';
import {RabbitmqBindings, RabbitmqConsumer} from '../..';
import {RabbitQueueMetadata} from '../../interfaces';
import {
  QueueBindings,
  QUEUE_CONSUMER,
  RABBIT_CONSUME_METADATA_ACCESSOR
} from '../keys';
import {QueueConsumer} from '../types';

@extensionPoint(QUEUE_CONSUMER, {
  tags: [{[ContextTags.KEY]: QueueBindings.COMPONENT.key}],
  scope: BindingScope.SINGLETON,
})
@lifeCycleObserver('webhook')
export class QueueObserver implements LifeCycleObserver {
  constructor(
    @inject.getter(QueueBindings.RABBIT_CONSUME_METADATA)
    private readonly getMetadata: Getter<RabbitQueueMetadata>,
    @inject(RabbitmqBindings.RABBITMQ_CONSUMER)
    private rabbitmqConsumer: RabbitmqConsumer,
    @extensions()
    private readonly getConsumers: Getter<QueueConsumer[]>,
  ) {}

  /**
   * This method will be invoked when the application starts
   */
  async start(): Promise<void> {
    await this.initConsumers();
    this.rabbitmqConsumer.on('re-established-connection', () => {
      this.initConsumers().then(
        () => {},
        () => {},
      );
    });
  }

  private async initConsumers() {
    const consumers = await this.getConsumers();

    const getMethods = <T, K extends string & keyof T>(instance: T): K[] => {
      const onlyFunctions = (property: K) =>
        typeof instance[property] === 'function' && property !== 'constructor';

      const propertyNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(instance),
      );

      return propertyNames.filter(onlyFunctions as any);
    };

    // Init all queue consumers
    for (const myConsumer of consumers) {
      for (const method of getMethods(myConsumer)) {
        const methodMetadata = MetadataInspector.getMethodMetadata(
          RABBIT_CONSUME_METADATA_ACCESSOR,
          Object.getPrototypeOf(myConsumer),
          method,
        );

        if (methodMetadata) {
          await this.rabbitmqConsumer.setupSubscriberChannel(
            myConsumer[method].bind(myConsumer),
            methodMetadata,
          );
        }
      }
    }
  }

  /**
   * This method will be invoked when the application stops
   */
  async stop(): Promise<void> {}
}

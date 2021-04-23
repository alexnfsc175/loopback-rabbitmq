import {BindingKey, MetadataAccessor} from '@loopback/core';
import {RabbitQueueMetadata} from '../interfaces';
import {QueueComponent} from './component';
import {ConsumerClass, QueueComponentConfig} from './types';

export namespace QueueBindings {
  export const CONSUMERS = 'queue.consumers';
  export const CONSUMER = 'queue.consumer';
  /**
   * Binding key for QueueComponent
   */
  export const COMPONENT = BindingKey.create<QueueComponent>(
    'components.QueueComponent',
  );
  /**
   * Binding key for configuration of QueueComponent.
   *
   */
  export const CONFIG = BindingKey.buildKeyForConfig<QueueComponentConfig>(
    COMPONENT,
  );

  /**
   * Binding key for the controller class resolved in the current request
   * context
   */
  export const CONSUMER_CLASS: BindingKey<ConsumerClass> = BindingKey.create<ConsumerClass>(
    'queue.consumer.current.ctor',
  );

  /**
   * Binding key for the consumer method resolved
   * context
   */
  export const CONSUMER_METHOD_NAME = BindingKey.create<string>(
    'queue.consumer.current.operation',
  );

  export const RABBIT_CONSUME_METADATA = BindingKey.create<
    RabbitQueueMetadata | undefined
  >('components.QueueComponent.operationMetadata');

  export const QUEUE_CONSUMER_NAMESPACE = 'queue.consumers';
}

export const QUEUE_CONSUMER = 'components.QueueComponent.consumer';

export const RABBIT_CONSUME_METADATA_ACCESSOR = MetadataAccessor.create<
  RabbitQueueMetadata,
  MethodDecorator
>('components.QueueComponent.rabbitConsume.operationMetadata');

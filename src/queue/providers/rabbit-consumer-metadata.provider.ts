import {
  Constructor,
  inject,
  MetadataInspector,
  Provider
} from '@loopback/context';
import {extensionPoint} from '@loopback/core';
import {RabbitQueueMetadata} from '../../interfaces';
import {
  QueueBindings,
  QUEUE_CONSUMER,
  RABBIT_CONSUME_METADATA_ACCESSOR
} from '../keys';

/**
 * An extension point for Queue Consumer
 */
@extensionPoint(QUEUE_CONSUMER)
export class RabbitConsumeMetadataProvider
  implements Provider<RabbitQueueMetadata | undefined> {
  constructor(
    @inject(QueueBindings.CONSUMER_CLASS, {optional: true})
    private readonly consumerClass: Constructor<{}>,
    @inject(QueueBindings.CONSUMER_METHOD_NAME, {optional: true})
    private readonly methodName: string,
  ) {}

  value(): RabbitQueueMetadata | undefined {
    if (!this.consumerClass || !this.methodName) return;
    return getRabbitConsumeMetadata(this.consumerClass, this.methodName);
  }
}

export function getRabbitConsumeMetadata(
  consumerClass: Constructor<{}>,
  methodName: string,
): RabbitQueueMetadata | undefined {
  return MetadataInspector.getMethodMetadata<RabbitQueueMetadata>(
    RABBIT_CONSUME_METADATA_ACCESSOR,
    consumerClass.prototype,
    methodName,
  );
}

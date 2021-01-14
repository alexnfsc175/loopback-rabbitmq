import {MethodDecoratorFactory} from '@loopback/core';
import debugFactory from 'debug';
import {RABBIT_CONSUME_METADATA_ACCESSOR} from '../keys';
import {RabbitQueueMetadata} from '../types';
const debug = debugFactory('loopback:queue-consumer:decorator: ');

export function rabbitConsume(queue: RabbitQueueMetadata) {
  debug('@rabbitConsume: ', queue);
  return MethodDecoratorFactory.createDecorator<RabbitQueueMetadata>(
    RABBIT_CONSUME_METADATA_ACCESSOR,
    queue,
    {decoratorName: '@rabbitConsume'},
  );
}

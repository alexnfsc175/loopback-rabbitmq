import {MethodDecoratorFactory} from '@loopback/core';
import debugFactory from 'debug';
import {RabbitQueueMetadata} from '../../interfaces';
import {RABBIT_CONSUME_METADATA_ACCESSOR} from '../keys';
const debug = debugFactory('loopback:queue-consumer:decorator: ');

export function rabbitConsume(queue: RabbitQueueMetadata) {
  debug('@rabbitConsume: ', queue);
  return MethodDecoratorFactory.createDecorator<RabbitQueueMetadata>(
    RABBIT_CONSUME_METADATA_ACCESSOR,
    queue,
    {decoratorName: '@rabbitConsume'},
  );
}

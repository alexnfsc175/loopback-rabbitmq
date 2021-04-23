/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Binding,
  BindingScope,
  Constructor,
  ContextTags,
  extensionFor,
  Provider
} from '@loopback/core';
import {EventEmitter} from 'events';
import {QUEUE_CONSUMER} from '.';
import {QueueBindings} from './keys';

/**
 * Interface for a Queue Consumer to implement
 */
export interface QueueConsumer {
  consumer?: EventEmitter;
  subscriber?: EventEmitter;
  /**
   * Name of the queue
   */
  readonly name: string;

  /**
   * Number of messages to be consumed at a time
   */
  readonly count?: number;
  /**
   * Method called when server start, to consume queue
   */
  // handle(message?: any): ValueOrPromise<any | void>;
  [key: string]: any;
}

export type QueueComponentConfig = {
  consumers?: Constructor<QueueConsumer | Provider<QueueConsumer>>[];
};

/**
 * A `BindingTemplate` function to configure the binding as a Queue Consumer.
 *
 * @param binding - Binding object
 */
export function asQueueConsumer<T = unknown>(binding: Binding<T>) {
  return binding
    .apply(extensionFor(QUEUE_CONSUMER))
    .tag({
      [ContextTags.TYPE]: QueueBindings.CONSUMER,
      // namespace: QueueBindings.QUEUE_CONSUMER_NAMESPACE
      namespace: QueueBindings.CONSUMERS,
    })
    .inScope(BindingScope.SINGLETON);
}

export type ConsumerClass<T = any> = Constructor<T>;

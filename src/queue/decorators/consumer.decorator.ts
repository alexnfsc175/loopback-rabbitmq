import {bind, BindingSpec} from '@loopback/core';
import {asQueueConsumer} from '../types';

/**
 * `@queueConsumer` decorates a QueueConsumer provider class
 *
 * `@example`
 *
 * ```ts
 * @queueConsumer()
 * class QueueProvider implements Provider<QueueConsumer> {
 *   constructor() {}
 *   value() {}
 * }
 * ```
 */
export function queueConsumer(...specs: BindingSpec[]) {
  return bind(asQueueConsumer, ...specs);
}

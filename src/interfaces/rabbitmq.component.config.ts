import amqplib, {Options} from 'amqplib';
import {
  MessageErrorHandler,
  MessageHandlerErrorBehavior
} from './rabbitmq.error.behaviors';

export interface RabbitMQExchangeConfig {
  name: string;
  type?: string;
  options?: Options.AssertExchange;
  queues?: ExchangeQueuesOptions[];
}

export interface ExchangeQueuesOptions {
  routingKey: string | string[];
  queue?: string;
  queueOptions?: QueueOptions;
  /**
   * A function that will be called if an error is thrown during processing of an incoming message
   */
  errorHandler?: MessageErrorHandler;
  allowNonJsonMessages?: boolean;
}

export interface QueueOptions extends amqplib.Options.AssertQueue {}

export interface RabbitQueueMetadata {
  exchange: string;
  routingKey: string | string[];
  queue?: string;
  queueOptions?: QueueOptions;
  /**
   * A function that will be called if an error is thrown during processing of an incoming message
   */
  errorHandler?: MessageErrorHandler;
  allowNonJsonMessages?: boolean;
}

export interface RabbitmqComponentConfig {
  options?: string | Options.Connect;
  producer?: {
    idleTimeoutMillis?: number;
  };
  consumer?: {
    retries: number; // number of retries, 0 is forever
    interval: number; // retry interval in ms
  };
  exchanges?: RabbitMQExchangeConfig[];
  defaultExchangeType?: string;
  defaultExchangeOptions?: Options.AssertExchange;
  defaultQueueOptions?: QueueOptions;
  defaultSubscribeErrorBehavior?: MessageHandlerErrorBehavior;
  defaultConsumerErrorBehavior?: MessageHandlerErrorBehavior;
  prefetchCount?: number;
}

export const ConfigDefaults: RabbitmqComponentConfig = {
  producer: {
    idleTimeoutMillis: 10000,
  },
  consumer: {
    retries: 0,
    interval: 1500,
  },
  exchanges: [],
  prefetchCount: 10,
  defaultExchangeType: 'topic',
  defaultExchangeOptions: {
    durable: true,
    autoDelete: false,
  },
  defaultQueueOptions: {
    durable: true,
    autoDelete: false,
  },
  defaultConsumerErrorBehavior: MessageHandlerErrorBehavior.REQUEUE,
};

import {bind, BindingScope, config} from '@loopback/core';
import amqp, {Channel, Connection} from 'amqplib';
import debugFactory from 'debug';
import {EventEmitter} from 'events';
import {
  ConfigDefaults,
  getHandlerErrorBehavior,
  Nack,
  RabbitmqBindings,
  RabbitmqComponentConfig,
  RabbitQueueMetadata,
  SubscribeResponse
} from './index';

const debug = debugFactory('loopback:rabbitmq:consumer');

@bind({scope: BindingScope.SINGLETON})
export class RabbitmqConsumer extends EventEmitter {
  private connection: Connection | undefined;
  private channel: Channel | undefined;
  private timeoutId: NodeJS.Timeout;
  private retry: number;
  private readonly retries: number;
  private interval: number;

  constructor(
    @config({fromBinding: RabbitmqBindings.COMPONENT})
    private componentConfig: Required<RabbitmqComponentConfig>,
  ) {
    super();
    this.componentConfig = {...ConfigDefaults, ...this.componentConfig};
    debug('criou uma instancia RabbitmqServer');
    const {retries, interval} = this.componentConfig.consumer;
    this.retry = 0;
    this.retries = retries;
    this.interval = interval;
  }

  async getConnection(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await amqp.connect(this.componentConfig.options)

    debug('getConnection::connection created');

    if (this.retries === 0 || this.retries > this.retry + 1) {
      debug('connection:retries', this.retries);
      const restart = (err: Error) => {
        debug('Connection error occurred.', err);
        if (this.connection) {
          this.connection.removeListener('error', restart);
          this.connection = undefined;
          this.channel = undefined;
        }

        this.timeout(this.interval);
      };
      const onClose = () => {
        if (this.connection) this.connection.removeListener('close', onClose);
        restart(new Error('Connection closed by remote host'));
      };

      this.connection.removeAllListeners('error');
      this.connection.removeAllListeners('close');
      this.connection.on('error', restart);
      this.connection.on('close', onClose);
    }
    return this.connection;
  }

  private timeout(ms: number) {
    debug('timeout::started');
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    const promise = new Promise<void>((resolve, reject) => {
      this.timeoutId = setTimeout(() => {
        debug(`timeout::Connection retry ${this.retry + 1} in ${ms} ms`);
        if (!this.connection) {
          ++this.retry;
          this.getConnection().then(
            () => {
              this.retry = 0;
              debug('timeout::connection created');
              if (!this.channel) {
                this.getChannel().then(
                  () => {
                    debug('timeout::channel created');
                    this.emit('re-established-connection');
                    resolve();
                  },
                  () => {},
                );
              } else {
                this.emit('re-established-connection');
                resolve();
              }
            },
            (error) => {
              this.timeout(this.interval);
              debug(error.message);
              reject(error);
            },
          );
        }
      }, ms);
    });

    const onResolve = () => {};
    const onReject = () => {};

    promise.then(onResolve, onReject);
  }

  async getChannel(): Promise<Channel> {
    const connection = await this.getConnection();
    if (!this.channel) {
      this.channel = await connection.createChannel();
      debug('getChannel::channel created');
      await this.setupInitChannel(this.channel);
      debug('getChannel::setupInitChannel called');
    }
    return this.channel;
  }

  private async setupInitChannel(channel: Channel): Promise<void> {
    for (const exchange of this.componentConfig.exchanges) {
      const {
        exchange: createdExchange,
      } = await channel.assertExchange(
        exchange.name,
        exchange.type ?? this.componentConfig.defaultExchangeType,
        {...this.componentConfig.defaultExchangeOptions, ...exchange.options},
      );

      const queues = exchange.queues ?? [];

      for (const q of queues) {
        const {queue} = await channel.assertQueue(q.queue ?? '', {
          ...this.componentConfig.defaultQueueOptions,
          ...q.queueOptions,
        });

        const routingKeys = Array.isArray(q.routingKey)
          ? q.routingKey
          : [q.routingKey];

        await Promise.all(
          routingKeys.map(route => {
            debug('bindQueue: ', `${queue} => ${createdExchange} => ${route}`);
            return channel.bindQueue(queue, createdExchange, route);
          }),
        );
      }
    }

    await channel.prefetch(this.componentConfig.prefetchCount);
  }

  async setupSubscriberChannel<T>(
    handler: (
      msg: T | undefined,
      rawMessage?: amqp.ConsumeMessage,
    ) => Promise<SubscribeResponse>,
    msgOptions: RabbitQueueMetadata,
  ): Promise<void> {
    const channel = await this.getChannel();

    const {exchange, routingKey, allowNonJsonMessages} = msgOptions;

    const {queue} = await channel.assertQueue(msgOptions.queue ?? '', {
      ...this.componentConfig.defaultQueueOptions,
      ...msgOptions.queueOptions,
    });

    const routingKeys = Array.isArray(routingKey) ? routingKey : [routingKey];

    await Promise.all(
      routingKeys.map(route => {
        debug('bindQueue: ', `${queue} => ${exchange} => ${route}`);
        return channel.bindQueue(queue, exchange, route);
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    await channel.consume(queue, async message => {
      debug(`queue:${queue}: new Message`);
      try {
        if (message == null) {
          throw new Error('Received null message');
        }

        const response = await this.handleMessage(
          handler,
          message,
          allowNonJsonMessages,
        );

        if (response instanceof Nack) {
          channel.nack(message, false, response.requeue);
          return;
        }

        if (response) {
          throw new Error(
            'Received response from consumer handler. Consumer handlers should only return void',
          );
        }

        channel.ack(message);
      } catch (error) {
        debug('error: ', error, message);
        if (message === null) {
          return;
        } else {
          const errorHandler =
            msgOptions.errorHandler ??
            getHandlerErrorBehavior(
              this.componentConfig.defaultConsumerErrorBehavior,
            );
          await errorHandler(channel, message, error);
        }
      }
    });
    const methodName = handler.name.replace('bound ', '');
    debug('registered:consumer: ', queue);
    debug('registered:consumer:method: ', methodName);
  }

  private handleMessage<T, U>(
    handler: (
      msg: T | undefined,
      rawMessage?: amqp.ConsumeMessage,
    ) => Promise<U>,
    msg: amqp.ConsumeMessage,
    allowNonJsonMessages?: boolean,
  ) {
    let message: T | undefined = undefined;
    if (msg.content) {
      if (allowNonJsonMessages) {
        try {
          message = JSON.parse(msg.content.toString()) as T;
        } catch {
          // Let handler handle parsing error, it has the raw message anyway
          message = undefined;
        }
      } else {
        message = JSON.parse(msg.content.toString()) as T;
      }
    }

    const methodName = handler.name.replace('bound ', '');
    debug(`consumer:${methodName} new message: %o`, message);
    debug('registered:consumer:method:call ', methodName);
    return handler(message, msg);
  }

  // async publish(exchangeName: string, exchangeType: string, content: Buffer) {
  //   const channel = await this.getChannel();
  //   await channel.assertExchange(exchangeName, exchangeType, {
  //     durable: false,
  //   });
  //   channel.publish(exchangeName, '', content);
  // }

  // async subscribe(exchangeName: string, exchangeType: string) {

  //   const channel = await this.getChannel();
  //   await channel.assertExchange(exchangeName, exchangeType, {
  //     durable: false,
  //   });
  //   const queue = await channel.assertQueue('', {exclusive: true});
  //   await channel.bindQueue(queue.queue, exchangeName, '');
  //   const consumeEmitter = new EventEmitter();

  //   try {
  //     await channel.consume(
  //       queue.queue,
  //       message => {
  //         if (message !== null) {
  //           consumeEmitter.emit('data', message.content);
  //         } else {
  //           const error = new Error('NullMessageException');
  //           consumeEmitter.emit('error', error);
  //         }
  //       },
  //       {noAck: true},
  //     );
  //   } catch (error) {
  //     consumeEmitter.emit('error', error);
  //   }
  //   return consumeEmitter;
  // }
}

import {bind, BindingScope, config} from '@loopback/core';
import amqp, {Channel, Connection} from 'amqplib';
import debugFactory from 'debug';
import {EventEmitter} from 'events';
import {
  ConfigDefaults,
  RabbitmqBindings,
  RabbitmqComponentConfig,
} from './index';

const debug = debugFactory('loopback:rabbitmq:consumer');

@bind({scope: BindingScope.SINGLETON})
export class RabbitmqConsumer {
  private connection: Connection | undefined;
  private channel: Channel | undefined;
  private timeoutId: NodeJS.Timeout;
  private retry: number;
  private readonly retries: number;
  private interval: number;

  constructor(
    @config({fromBinding: RabbitmqBindings.COMPONENT})
    private componentConfig: RabbitmqComponentConfig,
  ) {
    this.componentConfig = {...ConfigDefaults, ...this.componentConfig};
    debug('criou uma instancia RabbitmqServer');
    const {retries, interval} = this.componentConfig.consumer;
    this.retry = 0;
    this.retries = retries;
    this.interval = interval;
  }

  private async getConnection(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await amqp.connect(this.componentConfig.options);
    debug('getConnection::connection created');

    if (this.retries === 0 || this.retries > this.retry + 1) {
      const restart = (err: Error) => {
        debug('Connection error occurred.');
        if (this.connection) {
          this.connection.removeListener('error', restart);
          this.connection = undefined;
          this.channel = undefined;
        }

        // if (this.channel) {
        //   this.channel.close().then(() => {
        //     debug('YES::channel closed.');
        //     this.channel = undefined;
        //   }, () => {});
        // }{
        //   debug('NOT::channel closed.', !!this.channel);
        // }

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
    const promise = new Promise<void>(resolve => {
      this.timeoutId = setTimeout(() => {
        debug(`timeout::Connection retry ${this.retry + 1} in ${ms} ms`);
        if (!this.connection) {
          this.getConnection().then(
            () => {
              ++this.retry;
              debug('timeout::connection created');
              if (!this.channel) {
                this.getChannel().then(
                  () => {
                    debug('timeout::channel created');
                    resolve();
                  },
                  () => {},
                );
              } else {
                resolve();
              }
            },
            () => {},
          );
        }
      }, ms);
    });

    const onResolve = () => {};
    const onReject = () => {};

    promise.then(onResolve, onReject);
  }

  private async getChannel(): Promise<Channel> {
    const connection = await this.getConnection();
    if (!this.channel) {
      this.channel = await connection.createChannel();
      debug('getChannel::channel created');
    }
    return this.channel;
  }

  async produce(
    queue: string,
    content: Buffer,
    durable = true,
    persistent = true,
  ) {
    const channel = await this.getChannel();
    //Cria uma Queue Caso não exista
    await channel.assertQueue(queue, {durable});

    channel.sendToQueue(queue, content, {persistent});
  }

  /**
   *
   * @param {String} queue Name of queue
   * @param {Number} count Number of messages to be consumed at a time
   * @param {boolean} durable Message durability
   * @param {boolean} isNoAck Manual consumer acknowledgments
   */
  async consume(
    queue: string,
    count: number | undefined,
    durable = true,
    isNoAck = false,
  ) {
    const channel = await this.getChannel();
    await channel.assertQueue(queue, {durable});
    if (count) {
      // Quantas mensagens o consumidor irá pegar por vez.  Sem isso, ele irá pegar todas
      await channel.prefetch(count);
    }

    const consumeEmitter = new EventEmitter();
    // const message = await this.channel.consume(queue);
    try {
      await channel.consume(
        queue,
        message => {
          if (message !== null) {
            consumeEmitter.emit('data', message.content, () =>
              channel.ack(message),
            );
          } else {
            const error = new Error('NullMessageException');
            consumeEmitter.emit('error', error);
          }
        },
        {noAck: isNoAck},
      );
    } catch (error) {
      consumeEmitter.emit('error', error);
    }
    return consumeEmitter;
  }

  async publish(exchangeName: string, exchangeType: string, content: Buffer) {
    const channel = await this.getChannel();
    await channel.assertExchange(exchangeName, exchangeType, {
      durable: false,
    });
    channel.publish(exchangeName, '', content);
  }

  async subscribe(exchangeName: string, exchangeType: string) {
    //TODO: Verificar se devo Criar uma conexão e um canal sempre???
    // const connect = await amqp.connect(this.componentConfig.rabbitmqOptions);
    // const channel = await connect.createChannel();

    const channel = await this.getChannel();
    await channel.assertExchange(exchangeName, exchangeType, {
      durable: false,
    });
    const queue = await channel.assertQueue('', {exclusive: true});
    await channel.bindQueue(queue.queue, exchangeName, '');
    const consumeEmitter = new EventEmitter();

    try {
      await channel.consume(
        queue.queue,
        message => {
          if (message !== null) {
            consumeEmitter.emit('data', message.content);
          } else {
            const error = new Error('NullMessageException');
            consumeEmitter.emit('error', error);
          }
        },
        {noAck: true},
      );
    } catch (error) {
      consumeEmitter.emit('error', error);
    }
    return consumeEmitter;
  }
}

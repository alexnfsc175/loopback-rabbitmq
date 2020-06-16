import {bind, BindingScope, config, ValueOrPromise} from '@loopback/core';
import amqp, {Channel, Connection} from 'amqplib';
import debugFactory from 'debug';
import {EventEmitter} from 'events';
import {RabbitmqComponentConfig} from './interfaces';
import {RabbitmqBindings} from './keys';
const debug = debugFactory('loopback:rabbitmq:component');

@bind({scope: BindingScope.SINGLETON})
export class RabbitmqServer {
  private connection: Connection;
  private channel: Channel;

  constructor(
    @config({fromBinding: RabbitmqBindings.COMPONENT})
    private componentConfig: RabbitmqComponentConfig,
  ) {
    debug('criou uma instancia RabbitmqServer');
  }

  /**
   * The method to be invoked during `start`
   */
  async start() {
    this.connection = await amqp.connect(this.componentConfig.rabbitmqOptions);
    this.channel = await this.connection.createChannel();
    debug('RabbitmqServer::connect');
  }

  getConnection(): Connection {
    return this.connection;
  }

  getChannel(): Channel {
    return this.channel;
  }

  async produce(
    queue: string,
    content: Buffer,
    durable = false,
    persistent = false,
  ) {
    //Cria uma Queue Caso não exista
    await this.channel.assertQueue(queue, {durable});

    this.channel.sendToQueue(queue, content, {persistent});
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
    durable = false,
    isNoAck = false,
  ) {
    await this.channel.assertQueue(queue, {durable});
    if (count) {
      // Quantas mensagens o consumidor irá pegar por vez.  Sem isso, ele irá pegar todas
      await this.channel.prefetch(count);
    }

    const consumeEmitter = new EventEmitter();
    // const message = await this.channel.consume(queue);
    try {
      await this.channel.consume(
        queue,
        message => {
          if (message !== null) {
            consumeEmitter.emit('data', message.content, () =>
              this.channel.ack(message),
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
    await this.channel.assertExchange(exchangeName, exchangeType, {
      durable: false,
    });
    this.channel.publish(exchangeName, '', content);
  }

  async subscribe(exchangeName: string, exchangeType: string) {
    //TODO: Verificar se devo Criar uma conexão e um canal sempre???
    // const connect = await amqp.connect(this.componentConfig.rabbitmqOptions);
    // const channel = await connect.createChannel();

    await this.channel.assertExchange(exchangeName, exchangeType, {
      durable: false,
    });
    const queue = await this.channel.assertQueue('', {exclusive: true});
    await this.channel.bindQueue(queue.queue, exchangeName, '');
    const consumeEmitter = new EventEmitter();

    try {
      await this.channel.consume(
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
  /**
   * The method to be invoked during `stop`
   */
  async stop(): Promise<ValueOrPromise<void>> {
    await this.channel.close();
    await this.connection.close();
    debug('RabbitmqServer::close');
  }
}

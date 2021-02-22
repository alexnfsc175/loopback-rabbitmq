/* eslint-disable @typescript-eslint/no-explicit-any */
import {bind, BindingScope, config} from '@loopback/core';
import amqp, {Channel, Connection} from 'amqplib';
import debugFactory from 'debug';
import {
  ConfigDefaults,
  RabbitmqBindings,
  RabbitmqComponentConfig
} from './index';

const debug = debugFactory('loopback:rabbitmq:producer');

export const jsonReplacer = (key: string, value: any) =>
  typeof value === 'undefined' ? null : value;

export const isObject = (obj: any) => {
  const type = typeof obj;
  return type === 'function' || (type === 'object' && !!obj);
};

@bind({scope: BindingScope.SINGLETON})
export class RabbitmqProducer {
  private connection: Connection | undefined;
  private channel: Channel | undefined;
  private timeoutId: NodeJS.Timeout;

  constructor(
    @config({fromBinding: RabbitmqBindings.COMPONENT})
    private componentConfig: RabbitmqComponentConfig = ConfigDefaults,
  ) {
    debug('created an instance of RabbitmqProducer');
    this.componentConfig = {...ConfigDefaults, ...this.componentConfig};
  }

  private async getConnection(): Promise<Connection> {
    if (this.componentConfig.producer?.idleTimeoutMillis)
      this.timeout(this.componentConfig.producer?.idleTimeoutMillis);

    if (this.connection) {
      return this.connection;
    }

    this.connection = await amqp.connect(this.componentConfig.options!);
    debug('getConnection::connection created');

    const restart = (err: Error) => {
      if (this.connection) this.connection.removeListener('error', restart);
    };
    const onClose = () => {
      if (this.connection) this.connection.removeListener('close', onClose);
      restart(new Error('Connection closed by remote host'));
    };

    this.connection.removeAllListeners('error');
    this.connection.removeAllListeners('close');
    this.connection.on('error', restart);
    this.connection.on('close', onClose);

    return this.connection;
  }

  private async getChannel(): Promise<Channel> {
    const connection = await this.getConnection();
    if (!this.channel) {
      this.channel = await connection.createChannel();
      debug('getChannel::channel created');

      const restart = (err: Error) => {
        if (this.channel) {
          this.channel.removeAllListeners('error')
          this.channel.removeAllListeners('close')
        };
        this.channel = undefined;
      };

      const onClose = () => {
        restart(new Error('Connection closed by remote host'));
      };

      this.channel.removeAllListeners('error');
      this.channel.removeAllListeners('close');

      this.channel.on('error', restart);
      this.channel.on('close', onClose);
    };

    return this.channel;
  }

  private timeout(ms: number) {
    if (this.timeoutId) {
      debug(`timeout::Delayed for ${ms} ms`);
      clearTimeout(this.timeoutId);
    }
    const promise = new Promise<void>(resolve => {
      this.timeoutId = setTimeout(() => {
        debug('timeout::Ending consumer due to timeout');
        if (this.channel) {
          this.channel.close().then(
            () => {
              debug('timeout::channel closed');
              this.channel = undefined;

              if (this.connection) {
                this.connection.close().then(
                  () => {
                    debug('timeout::connection closed');
                    this.connection = undefined;
                    resolve();
                  },
                  () => { },
                );
              } else {
                resolve();
              }
            },
            () => { },
          );
        } else {
          if (this.connection) {
            this.connection.close().then(
              () => {
                debug('timeout::connection closed');
                this.connection = undefined;
                resolve();
              },
              () => { },
            );
          } else {
            resolve();
          }
        }
      }, ms);
    });

    const onResolve = () => { };
    const onReject = () => { };

    promise.then(onResolve, onReject);
  }

  parseToBuffer(message: any) {
    let buffer: Buffer;
    if (message instanceof Buffer) {
      buffer = message;
    } else if (message instanceof Uint8Array) {
      buffer = Buffer.from(message);
    } else if (message != null) {
      buffer = Buffer.from(JSON.stringify(message/*, jsonReplacer */));
    } else {
      buffer = Buffer.alloc(0);
    }
    return buffer;
  }

  async produce(
    queue: string,
    content: any,
    durable = true,
    persistent = true,
  ) {
    const buffer = this.parseToBuffer(content);
    const channel = await this.getChannel();
    //Cria uma Queue Caso não exista
    await channel.assertQueue(queue, {durable});

    channel.sendToQueue(queue, buffer, {persistent});
  }

  public async publish(
    exchange: string,
    routingKey: string,
    message: any,
    options?: amqp.Options.Publish,
  ) {
    const channel = await this.getChannel();
    const buffer = this.parseToBuffer(message);

    channel.publish(exchange, routingKey, buffer, options);
  }
}

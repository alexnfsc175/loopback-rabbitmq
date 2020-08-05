import {bind, BindingScope, config} from '@loopback/core';
import amqp, {Channel, Connection} from 'amqplib';
import debugFactory from 'debug';
import {
  ConfigDefaults,
  RabbitmqBindings,
  RabbitmqComponentConfig
} from './index';

const debug = debugFactory('loopback:rabbitmq:producer');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonReplacer = (key: string, value: any) =>
  typeof value === 'undefined' ? null : value;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    }
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
                  () => {},
                );
              } else {
                resolve();
              }
            },
            () => {},
          );
        } else {
          if (this.connection) {
            this.connection.close().then(
              () => {
                debug('timeout::connection closed');
                this.connection = undefined;
                resolve();
              },
              () => {},
            );
          } else {
            resolve();
          }
        }
      }, ms);
    });

    const onResolve = () => {};
    const onReject = () => {};

    promise.then(onResolve, onReject);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseToBuffer(content: any) {
    if (Buffer.isBuffer(content)) {
      return content;
    } else {
      if (isObject(content)) {
        return Buffer.from(JSON.stringify(content/*, jsonReplacer */));
      }
    }
    throw new Error('the content must be an object or buffer');
  }

  async produce(
    queue: string,
    content: Buffer | object,
    durable = true,
    persistent = true,
  ) {
    const parsedContent = this.parseToBuffer(content);
    const channel = await this.getChannel();
    //Cria uma Queue Caso não exista
    await channel.assertQueue(queue, {durable});

    channel.sendToQueue(queue, parsedContent, {persistent});
  }

  async publish(
    exchangeName: string,
    exchangeType: string,
    content: Buffer | object,
  ) {
    const channel = await this.getChannel();
    await channel.assertExchange(exchangeName, exchangeType, {
      durable: false,
    });

    const parsedContent = this.parseToBuffer(content);
    channel.publish(exchangeName, '', parsedContent);
  }
}

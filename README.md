# loopback-rabbitmq

An Rabbitmq extension for LoopBack 4.

```npm
npm i -s loopback-rabbitmq
```

## Usage

When the `loopback-rabbitmq` package is installed, bind it to your application with `app.component()`

```typescript
import {RestApplication} from '@loopback/rest';
import {ConsumersBooter, MessageHandlerErrorBehavior, QueueComponent, RabbitmqBindings, RabbitmqComponent, RabbitmqComponentConfig} from 'loopback-rabbitmq';

const app = new RestApplication();
app.configure<RabbitmqComponentConfig>(RabbitmqBindings.COMPONENT.to({
  options: {
    protocol: process.env.RABBITMQ_PROTOCOL ?? 'amqp',
    hostname: process.env.RABBITMQ_HOST ?? 'localhost',
    port: process.env.RABBITMQ_PORT === undefined ? 5672 : +process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USER ?? 'rabbitmq',
    password: process.env.RABBITMQ_PASS ?? 'rabbitmq',
    vhost: process.env.RABBITMQ_VHOST ?? '/',
  },
  // configurations below are optional, (Default values)
  producer:{
    idleTimeoutMillis: 10000
  },
  consumer: {
    retries: 0, // number of retries, 0 is forever
    interval: 1500,// retry interval in ms
  },
  defaultConsumerErrorBehavior: MessageHandlerErrorBehavior.ACK,
  prefetchCount: 10,
  exchanges: [
    {
      name: 'loopback.direct',
      type: 'direct', // Uma troca direta entrega mensagens às filas com base na chave de roteamento de mensagens.
      // type: 'fanout' // Uma exchange de fanout roteia mensagens para todas as filas que estão vinculadas
    },
    {
      name: 'messaging.direct',
      type: 'direct',
    },
  ],
});
app.component(RabbitmqComponent);
/**
 *  Bind classes to listen Events
 */
app.booters(ConsumersBooter);
app.component(QueueComponent);

// Customize @loopback/boot Booter Conventions here
app.bootOptions = {
  consumers: {
    dirs: ['consumers'],
    extensions: ['.consumer.js'],
    nested: true,
  },
  controllers: {
    // Customize ControllerBooter Conventions here
    dirs: ['controllers'],
    extensions: ['.controller.js'],
    nested: true,
  },
};

```

### Bindings

| RabbitmqBindings  | Binding Value     |
| ----------------- | :---------------- |
| RABBITMQ_PRODUCER | RabbitmqProducer  |
| RABBITMQ_CONSUMER | RabbitmqConsumer  |
| COMPONENT         | RabbitmqComponent |

```typescript
import {
  RabbitmqBindings,
  RabbitmqProducer,
} from 'loopback-rabbitmq';

export class RabbitController {
  constructor(
    @inject(RabbitmqBindings.RABBITMQ_PRODUCER)
    private rabbitmqProducer: RabbitmqProducer
  ) {}

  ...

  @get('/test', {
    responses: {
      '200': TEST_RESPONSE,
    },
  })
  async test(
    @param.query.string('exchange', {required: false}) exchange?: string,
    @param.query.string('routingKey', {required: false}) routingKey?: string,
  ) {

    await this.rabbitmqProducer.publish(
      exchange ?? 'messaging.direct',
      routingKey ?? 'tenant.webhook',
      Buffer.from(JSON.stringify({name: 'loopback-rabbitmq-example', date: new Date()})),
    );

    // Reply with a greeting, the current time, the url, and request headers
    return {
      greeting: 'Hello from LoopBack',
      date: new Date(),
      url: this.req.url,
      headers: Object.assign({}, this.req.headers),
    };
  }

}
```

Create a dir in src/consumers with

```ts
import {ConsumeMessage, rabbitConsume} from 'loopback-rabbitmq';

interface Message {
  action: string;
  tenantId?: number;
  payload: any;
}

export class WebhooksConsumer {
  constructor() // @repository(WebhookRepository)
  // public WebhookRepository: WebhookRepository,
  // @service(WebhookProvider) public webhookService: WebhookService,
  {}

  @rabbitConsume({
    exchange: 'messaging.direct',
    routingKey: 'tenant.webhook',
    queue: 'webhooks',
  })
  async handle(message: Message, rawMessage: ConsumeMessage) {
    console.log('WebhooksConsumer: ', message);
    console.log('WebhooksConsumer:raw: ', rawMessage);
  }
}
```

[![LoopBack](<https://github.com/strongloop/loopback-next/raw/master/docs/site/imgs/branding/Powered-by-LoopBack-Badge-(blue)-@2x.png>)](http://loopback.io/)

<http://nelsonsar.github.io/2013/10/29/AMQP-building-blocks.html>

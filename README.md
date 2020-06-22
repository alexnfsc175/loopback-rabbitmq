# loopback-rabbitmq

An Rabbitmq extension for LoopBack 4.

```npm
npm i -s loopback-rabbitmq
```

## Usage

When the `loopback-rabbitmq` package is installed, bind it to your application with `app.component()`

```typescript
import {RestApplication} from '@loopback/rest';
import {RabbitmqBindings, RabbitmqComponent} from 'loopback-rabbitmq';

const app = new RestApplication();
app.configure(RabbitmqBindings.COMPONENT.to({
  options: {
    protocol: process.env.RABBITMQ_PROTOCOL ?? 'amqp',
    hostname: process.env.RABBITMQ_HOST ?? 'localhost',
    port:process.env.RABBITMQ_PORT === undefined ? 5672 : +process.env.RABBITMQ_PORT,
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
});
app.component(RabbitmqComponent);
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
  RabbitmqConsumer,
  RabbitmqProducer,
} from 'loopback-rabbitmq';

export class RabbitController {
  constructor(
    @inject(RabbitmqBindings.RABBITMQ_PRODUCER)
    private rabbitmqProducer: RabbitmqProducer,
    @inject(RabbitmqBindings.RABBITMQ_CONSUMER)
    private rabbitmqConsumer: RabbitmqConsumer,
  ) {}

  ...

  @get('/test', {
    responses: {
      '200': TEST_RESPONSE,
    },
  }){
    const emailMsg = {
      to: 'destinatario@teste.com',
      body: '(Email)',
    };

    const logMsg = {
      to: 'destinatario@teste.com',
      body: '(Log)',
    };

    /**
     *  How many messages the consumer will pick up at a time.
     *  Without it, itwill take all
    */
    const count = 1;

    const logConsumer = await this.rabbitmqConsumer.consume(
      'log',
      count,
    );
    const emailConsumer = await this.rabbitmqConsumer.consume(
      'email',
      count,
    );

    /**
     * the consumer used in this way is just an example,
     * consider using it on an observer or something similar
     * */
    logConsumer.on('data', (message: Buffer, ack: Function) => {
      const hydratedMessage = JSON.parse(message.toString('utf8'));
      console.log('channel::log', hydratedMessage)
      ack();
    });

    emailConsumer.on('data', (message: Buffer, ack: Function) => {
      const hydratedMessage = JSON.parse(message.toString('utf8'));
      console.log('channel::email', hydratedMessage)
      ack();
    });

    await this.rabbitmqProducer.produce(
      'log',
      Buffer.from(JSON.stringify(logMsg))
    );

    await this.rabbitmqProducer.produce(
      'email',
      Buffer.from(JSON.stringify(emailMsg))
    );
  }
}
```

[![LoopBack](<https://github.com/strongloop/loopback-next/raw/master/docs/site/imgs/branding/Powered-by-LoopBack-Badge-(blue)-@2x.png>)](http://loopback.io/)

<http://nelsonsar.github.io/2013/10/29/AMQP-building-blocks.html>

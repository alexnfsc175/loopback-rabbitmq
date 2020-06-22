import {Options} from 'amqplib';

export interface RabbitmqComponentConfig {
  options: Options.Connect;
  producer: {
    idleTimeoutMillis?: number;
  };
  consumer: {
    retries: number; // number of retries, 0 is forever
    interval: number; // retry interval in ms
  };
}

export const ConfigDefaults: RabbitmqComponentConfig = {
  options: {},
  producer: {
    idleTimeoutMillis: 10000,
  },
  consumer: {
    retries: 0,
    interval: 1500,
  },
};

import {Options} from 'amqplib';

export interface RabbitmqComponentConfig {
  rabbitmqOptions: Options.Connect;
}

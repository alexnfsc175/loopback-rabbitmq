import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {RabbitmqBindings} from '../keys';
import {RabbitmqServer} from '../rabbitmq.server';

/**
 * This class will be bound to the application as a `LifeCycleObserver` during
 * `boot`
 */
@lifeCycleObserver('rabbitmq')
export class RabbitmqObserver implements LifeCycleObserver {
  constructor(
    @inject(RabbitmqBindings.RABBITMQ_SERVER)
    private rabbitmqServer: RabbitmqServer,
  ) {}

  /**
   * This method will be invoked when the application starts
   */
  async start(): Promise<void> {
    await this.rabbitmqServer.start();
  }

  /**
   * This method will be invoked when the application stops
   */
  async stop(): Promise<void> {
    await this.rabbitmqServer.stop();
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as amqplib from 'amqplib';

export enum MessageHandlerErrorBehavior {
  ACK,
  NACK,
  REQUEUE,
}

export {ConsumeMessage, Options} from 'amqplib';

export type MessageErrorHandler = (
  channel: amqplib.Channel,
  msg: amqplib.ConsumeMessage,
  error: any,
) => Promise<void> | void;

/**
 * An error handler that will ack the message which caused an error during processing
 */
export const ackErrorHandler: MessageErrorHandler = (channel, msg, error) => {
  channel.ack(msg);
};

/**
 * An error handler that will nack and requeue a message which created an error during processing
 */
export const requeueErrorHandler: MessageErrorHandler = (
  channel,
  msg,
  error,
) => {
  channel.nack(msg, false, true);
};

/**
 * An error handler that will nack a message which created an error during processing
 */
export const defaultNackErrorHandler: MessageErrorHandler = (
  channel,
  msg,
  error,
) => {
  channel.nack(msg, false, false);
};

export const getHandlerErrorBehavior = (
  behavior: MessageHandlerErrorBehavior,
) => {
  switch (behavior) {
    case MessageHandlerErrorBehavior.ACK:
      return ackErrorHandler;
    case MessageHandlerErrorBehavior.REQUEUE:
      return requeueErrorHandler;
    default:
      return defaultNackErrorHandler;
  }
};

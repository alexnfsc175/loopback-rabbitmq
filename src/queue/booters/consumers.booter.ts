/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ArtifactOptions,
  BaseArtifactBooter,
  BootBindings,
  booter
} from '@loopback/boot';
import {
  Application,
  Binding,
  BindingFromClassOptions,
  config,
  CoreBindings,
  createBindingFromClass,
  inject
} from '@loopback/core';
import debugFactory from 'debug';
import {asQueueConsumer, ConsumerClass} from '../types';
const debug = debugFactory('loopback:queue-consumer:booter');

@booter('consumers')
export class ConsumersBooter extends BaseArtifactBooter {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) public app: Application,
    @inject(BootBindings.PROJECT_ROOT) projectRoot: string,
    @config()
    public consumerConfig: ArtifactOptions = {},
  ) {
    super(
      projectRoot,
      // Set Consumer Booter Options if passed in via bootConfig
      Object.assign({}, ConsumersDefaults, consumerConfig),
    );

    debug('consumerConfig: ', consumerConfig);
  }

  /**
   * Uses super method to get a list of Artifact classes.
   */
  async load() {
    await super.load();
    this.classes.forEach(cls => {
      this.consumers(cls);
    });
  }

  /**
   * Register a Consumer class with this application.
   *
   * @param consumerCtor - The consumer class
   * (constructor function).
   * @param name - Optional controller name, default to the class name
   * @returns The newly created binding, you can use the reference to
   * further modify the binding, e.g. lock the value to prevent further
   * modifications.
   *
   */
  private consumers<T>(
    consumerCtor: ConsumerClass<T>,
    nameOrOptions?: string | BindingFromClassOptions,
  ): Binding<T> {
    debug('Adding consumer %s', nameOrOptions ?? consumerCtor.name);
    const binding = createBindingFromClass(consumerCtor).apply(asQueueConsumer);
    this.app.add(binding);
    return binding;
  }
}

/**
 * Normalize name or options to `BindingFromClassOptions`
 * @param nameOrOptions - Name or options for binding from class
 */
function toOptions(nameOrOptions?: string | BindingFromClassOptions) {
  if (typeof nameOrOptions === 'string') {
    return {name: nameOrOptions};
  }
  return nameOrOptions ?? {};
}

/**
 * Default ArtifactOptions for ConsumersBooter.
 */
export const ConsumersDefaults: ArtifactOptions = {
  dirs: ['consumers'],
  extensions: ['.consumer.js'],
  nested: true,
};

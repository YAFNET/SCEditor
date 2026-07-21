import type { Plugin } from './types.js';

type PluginCtor = new () => Plugin;

const plugins: Record<string, PluginCtor> = {};

export interface PluginManagerInstance {
	call(...args: unknown[]): void;
	callOnlyFirst(...args: unknown[]): unknown;
	hasHandler(signal: string): boolean;
	exists(plugin: string): boolean;
	isRegistered(plugin: string): boolean;
	register(plugin: string): boolean;
	deregister(plugin: string): boolean;
	destroy(): void;
}

/**
 * Plugin Manager class
 * @class PluginManager
 * @name PluginManager
 */
export default function PluginManager(this: PluginManagerInstance, thisObj: unknown) {
	/**
	 * Alias of this
	 *
	 * @private
	 */
	const base = this;

	/**
	 * Array of all currently registered plugins
	 *
	 * @private
	 */
	let registeredPlugins: Plugin[] = [];


	/**
	 * Changes a signals name from "name" into "signalName".
	 *
	 * @private
	 */
	const formatSignalName = function (signal: string): string {
		return `signal${signal.charAt(0).toUpperCase()}${signal.slice(1)}`;
	};

	/**
	 * Calls handlers for a signal
	 *
	 * @see call()
	 * @see callOnlyFirst()
	 * @private
	 */
	const callHandlers = function (args: unknown[], returnAtFirst: boolean): unknown {
		args = args.slice();

		let ret;
		const signal = formatSignalName(args.shift() as string);

		for (let idx = 0; idx < registeredPlugins.length; idx++) {
			const handler = registeredPlugins[idx][signal];

			if (handler) {
				ret = handler.apply(thisObj, args);

				if (returnAtFirst) {
					return ret;
				}
			}
		}

		return undefined;
	};

	/**
	 * Calls all handlers for the passed signal
	 *
	 * @param signal
	 * @param args
	 * @function
	 * @name call
	 * @memberOf PluginManager.prototype
	 */
	base.call = function (...args: unknown[]) {
		callHandlers(args, false);
	};

	/**
	 * Calls the first handler for a signal, and returns the
	 *
	 * @param signal
	 * @param args
	 * @return The result of calling the handler
	 * @function
	 * @name callOnlyFirst
	 * @memberOf PluginManager.prototype
	 */
	base.callOnlyFirst = function (...args: unknown[]) {
		return callHandlers(args, true);
	};

	/**
	 * Checks if a signal has a handler
	 *
	 * @function
	 * @name hasHandler
	 * @memberOf PluginManager.prototype
	 */
	base.hasHandler = function (signal: string): boolean {
		let i = registeredPlugins.length;
		const signalName = formatSignalName(signal);

		while (i--) {
			if (signalName in registeredPlugins[i]) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Checks if the plugin exists in plugins
	 *
	 * @function
	 * @name exists
	 * @memberOf PluginManager.prototype
	 */
	base.exists = function (plugin: string): boolean {
		if (plugin in plugins) {
			const pluginCtor = plugins[plugin];

			return typeof pluginCtor === 'function' &&
				typeof pluginCtor.prototype === 'object';
		}

		return false;
	};

	/**
	 * Checks if the passed plugin is currently registered.
	 *
	 * @function
	 * @name isRegistered
	 * @memberOf PluginManager.prototype
	 */
	base.isRegistered = function (plugin: string): boolean {
		if (base.exists(plugin)) {
			let idx = registeredPlugins.length;

			while (idx--) {
				if (registeredPlugins[idx] instanceof plugins[plugin]) {
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * Registers a plugin to receive signals
	 *
	 * @function
	 * @name register
	 * @memberOf PluginManager.prototype
	 */
	base.register = function (plugin: string): boolean {
		if (!base.exists(plugin) || base.isRegistered(plugin)) {
			return false;
		}

		const instance = new plugins[plugin]();
		registeredPlugins.push(instance);

		if ('init' in instance && instance.init) {
			instance.init.call(thisObj);
		}

		return true;
	};

	/**
	 * Deregisters a plugin.
	 *
	 * @function
	 * @name deregister
	 * @memberOf PluginManager.prototype
	 */
	base.deregister = function (plugin: string): boolean {
		let pluginIdx = registeredPlugins.length;
		let removed = false;

		if (!base.isRegistered(plugin)) {
			return removed;
		}

		while (pluginIdx--) {
			if (registeredPlugins[pluginIdx] instanceof plugins[plugin]) {
				const removedPlugin = registeredPlugins.splice(pluginIdx, 1)[0];
				removed = true;

				if ('destroy' in removedPlugin && removedPlugin.destroy) {
					removedPlugin.destroy.call(thisObj);
				}
			}
		}

		return removed;
	};

	/**
	 * Clears all plugins and removes the owner reference.
	 *
	 * Calling any functions on this object after calling
	 * destroy will cause a JS error.
	 *
	 * @name destroy
	 * @memberOf PluginManager.prototype
	 */
	base.destroy = function () {
		let i = registeredPlugins.length;

		while (i--) {
			const plugin = registeredPlugins[i];

			if ('destroy' in plugin && plugin.destroy) {
				plugin.destroy.call(thisObj);
			}
		}

		registeredPlugins = [];
		thisObj = null;
	};
}

PluginManager.plugins = plugins;

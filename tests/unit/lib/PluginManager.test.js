import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sinon from 'sinon';
import PluginManager from 'src/lib/PluginManager.js';

const fakeEditor = {};
let fakePlugin;
let fakePluginTwo;
let pluginManager;

describe('lib/PluginManager', () => {
	beforeEach(() => {
		fakePlugin    = function () {};
		fakePluginTwo = function () {};

		pluginManager = new PluginManager(fakeEditor);
		PluginManager.plugins.fakePlugin = fakePlugin;
		PluginManager.plugins.fakePluginTwo = fakePluginTwo;
	});

	afterEach(() => {
		sinon.restore();
	});


	it('call()', () => {
		const arg = {};
		const firstSpy = sinon.spy();
		const secondSpy = sinon.spy();

		fakePlugin.prototype.signalTest = firstSpy;
		fakePluginTwo.prototype.signalTest = secondSpy;

		pluginManager.register('fakePlugin');
		pluginManager.register('fakePluginTwo');

		pluginManager.call('test', arg);

		expect(firstSpy.calledOnce).toBeTruthy();
		expect(firstSpy.calledOn(fakeEditor)).toBeTruthy();
		expect(firstSpy.calledWithExactly(arg)).toBeTruthy();
		expect(secondSpy.calledOnce).toBeTruthy();
		expect(secondSpy.calledOn(fakeEditor)).toBeTruthy();
		expect(secondSpy.calledWithExactly(arg)).toBeTruthy();

		expect(firstSpy.calledBefore(secondSpy)).toBeTruthy();
	});


	it('callOnlyFirst()', () => {
		const arg = {};

		const stub = sinon.stub();
		stub.returns(1);

		fakePlugin.prototype.signalTest = stub;
		fakePluginTwo.prototype.signalTest = sinon.spy();

		pluginManager.register('fakePlugin');
		pluginManager.register('fakePluginTwo');

		expect(pluginManager.callOnlyFirst('test', arg)).toBeTruthy();

		expect(fakePlugin.prototype.signalTest.calledOnce).toBeTruthy();
		expect(fakePlugin.prototype.signalTest.calledOn(fakeEditor)).toBeTruthy();
		expect(fakePlugin.prototype.signalTest.calledWithExactly(arg)).toBeTruthy();
		expect(!fakePluginTwo.prototype.signalTest.called).toBeTruthy();
	});


	it('hasHandler()', () => {
		fakePlugin.prototype.signalTest = sinon.spy();
		fakePluginTwo.prototype.signalTest = sinon.spy();
		fakePluginTwo.prototype.signalTestTwo = sinon.spy();

		pluginManager.register('fakePlugin');
		pluginManager.register('fakePluginTwo');

		expect(pluginManager.hasHandler('test')).toBeTruthy();
		expect(pluginManager.hasHandler('testTwo')).toBeTruthy();
	});

	it('hasHandler() - No handler', () => {
		fakePlugin.prototype.signalTest = sinon.spy();

		pluginManager.register('fakePlugin');

		expect(!pluginManager.hasHandler('teSt')).toBeTruthy();
		expect(!pluginManager.hasHandler('testTwo')).toBeTruthy();
	});


	it('exists()', () => {
		expect(pluginManager.exists('fakePlugin')).toBeTruthy();
		expect(!pluginManager.exists('noPlugin')).toBeTruthy();
	});


	it('isRegistered()', () => {
		pluginManager.register('fakePlugin');

		expect(pluginManager.isRegistered('fakePlugin')).toBeTruthy();
		expect(!pluginManager.isRegistered('fakePluginTwo')).toBeTruthy();
	});


	it('register() - No plugin', () => {
		expect(pluginManager.register('noPlugin')).toStrictEqual(false);
	});

	it('register() - Call init', () => {
		fakePlugin.prototype.init = sinon.spy();
		fakePluginTwo.prototype.init = sinon.spy();

		expect(pluginManager.register('fakePlugin')).toStrictEqual(true);

		expect(fakePlugin.prototype.init.calledOnce).toBeTruthy();
		expect(fakePlugin.prototype.init.calledOn(fakeEditor)).toBeTruthy();
		expect(!fakePluginTwo.prototype.init.called).toBeTruthy();
	});

	it('register() - Called twice', () => {
		fakePlugin.prototype.init = sinon.spy();

		expect(pluginManager.register('fakePlugin')).toStrictEqual(true);
		expect(pluginManager.register('fakePlugin')).toStrictEqual(false);

		expect(fakePlugin.prototype.init.calledOnce).toBeTruthy();
		expect(fakePlugin.prototype.init.calledOn(fakeEditor)).toBeTruthy();
	});


	it('deregister()', () => {
		fakePlugin.prototype.destroy = sinon.spy();
		fakePluginTwo.prototype.destroy = sinon.spy();

		pluginManager.register('fakePlugin');
		pluginManager.register('fakePluginTwo');

		pluginManager.deregister('fakePlugin');

		expect(fakePlugin.prototype.destroy.calledOnce).toBeTruthy();
		expect(fakePlugin.prototype.destroy.calledOn(fakeEditor)).toBeTruthy();
		expect(!fakePluginTwo.prototype.destroy.calledOnce).toBeTruthy();
	});

	it('deregister() - Called twice', () => {
		fakePlugin.prototype.destroy = sinon.spy();
		fakePluginTwo.prototype.destroy = sinon.spy();

		pluginManager.register('fakePlugin');
		pluginManager.register('fakePluginTwo');

		pluginManager.deregister('fakePlugin');
		pluginManager.deregister('fakePlugin');

		expect(fakePlugin.prototype.destroy.calledOnce).toBeTruthy();
		expect(fakePlugin.prototype.destroy.calledOn(fakeEditor)).toBeTruthy();
		expect(!fakePluginTwo.prototype.destroy.calledOnce).toBeTruthy();
	});


	it('destroy()', () => {
		fakePlugin.prototype.destroy = sinon.spy();
		fakePluginTwo.prototype.destroy = sinon.spy();

		pluginManager.register('fakePlugin');
		pluginManager.register('fakePluginTwo');

		pluginManager.destroy();

		expect(fakePlugin.prototype.destroy.calledOnce).toBeTruthy();
		expect(fakePlugin.prototype.destroy.calledOn(fakeEditor)).toBeTruthy();
		expect(fakePluginTwo.prototype.destroy.calledOnce).toBeTruthy();
		expect(fakePluginTwo.prototype.destroy.calledOn(fakeEditor)).toBeTruthy();
	});

});

import { describe, it, expect } from 'vitest';
import * as utils from 'src/lib/utils.js';

describe('lib/utils', () => {

	it('isEmptyObject()', () => {
		expect(utils.isEmptyObject({})).toBeTruthy();
		expect(utils.isEmptyObject([])).toBeTruthy();

		expect(utils.isEmptyObject({ a: 'a' })).toBeFalsy();
		expect(utils.isEmptyObject([1])).toBeFalsy();
	});

	it('extend() - merge', () => {
		const a = { a: 'foo' };
		const b = { b: 'bar' };

		expect(utils.extend(a, b)).toEqual({ a: 'foo', b: 'bar' });
	});

	it('extend() - replace', () => {
		const a = { a: 'foo' };
		const b = { a: 'bar' };

		expect(utils.extend(a, b)).toEqual({ a: 'bar' });
	});

	it('extend() - null', () => {
		const a = { a: null };
		const b = { b: null, c: null };

		expect(utils.extend(a, a)).toEqual({ a: null });
		expect(utils.extend(a, b)).toEqual({ a: null, b: null, c: null });
		expect(utils.extend(b, a)).toEqual({ a: null, b: null, c: null });
	});

	it('extend() - is immutable', () => {
		const record = {};

		utils.extend({}, record, { foo: 'bar' });
		expect(record.foo).toBe(undefined);
	});

	it('extend() - is mutable', () => {
		const record = {};

		utils.extend(record, { foo: 'bar' });
		expect(record.foo).toBe('bar');
	});

	it('extend() - null as argument', () => {
		const a = { foo: 'bar' };
		const b = null;
		const c = void 0;

		expect(utils.extend({}, b, a, c)).toEqual({ foo: 'bar' });
	});

	it('extend() - mixed types', () => {
		const target = {};
		const child = {};
		const childOverriden = {};
		const childArray = [1, 2, 3];
		const childArrayOverriden = [1];

		const result = utils.extend(target, {
			key: childOverriden,
			ignore: undefined,
			array: childArrayOverriden,
			prop: 'overriden',
			extra: '@'
		}, {
			key: child,
			array: childArray,
			prop: 'a'
		});

		expect(result).toBe(target);
		expect(result.key).toBe(child);
		expect(result.array).toBe(childArray);

		expect(result).toEqual({
			key: child,
			array: childArray,
			prop: 'a',
			extra: '@'
		});
	});

	it('extend() - deep with mixed types', () => {
		const target = {};
		const child = {};

		const result = utils.extend(true, target, {
			child: child,
			ignore: undefined,
			key: {
				prop: 'overriden',
				extra: 'a'
			},
			array: [1, 1, 1],
			prop: 'overriden',
			extra: 'a'
		}, {
			key: {
				prop: 'a'
			},
			array: [2, 3],
			prop: 'a'
		});

		expect(result).toBe(target);
		expect(result.child).not.toBe(child);

		expect(result).toEqual({
			child: {},
			key: {
				prop: 'a',
				extra: 'a'
			},
			array: [2, 3, 1],
			prop: 'a',
			extra: 'a'
		});
	});

	it('extend() - prototype pollution', () => {
		const a = {};
		const maliciousPayload = '{"__proto__":{"oops":"It works!"}}';

		expect(a.oops).toBe(undefined);
		utils.extend({}, maliciousPayload);
		expect(a.oops).toBe(undefined);

		utils.extend(true, {}, JSON.parse('{"__proto__":{"pollution":true}}'));
		expect({}.pollution).not.toBe(true);

		utils.extend(true, {}, JSON.parse('{"constructor":{"prototype":{"pollution":true}}}'));
		expect({}.pollution).not.toBe(true);
	});

	it('extend() - deep string', () => {
		const a = { a: {foo: 'bar' } };
		const b = { a: {foo: { 'bar': 'baz' } } };

		expect(utils.extend(true, {}, a, b)).toEqual({ a: {foo: { 'bar': 'baz' } } });
	});

	it('extend() - deep number', () => {
		const a = { a: {foo: 123 } };
		const b = { a: {foo: { 'bar': 'baz' } } };

		expect(utils.extend(true, {}, a, b)).toEqual({ a: {foo: { 'bar': 'baz' } } });
	});

	it('extend() - deep false', () => {
		const a = { a: {foo: false } };
		const b = { a: {foo: { 'bar': 'baz' } } };

		expect(utils.extend(true, {}, a, b)).toEqual({ a: {foo: { 'bar': 'baz' } } });
	});


	it('arrayRemove()', () => {
		const array = [1, 2, 3, 3, 4, 5];

		utils.arrayRemove(array, 1);
		expect(array.length).toBe(5);

		utils.arrayRemove(array, 1);
		expect(array.length).toBe(5);

		utils.arrayRemove(array, 3);
		expect(array.length).toBe(4);
		expect(array.indexOf(3)).toBe(1);
	});

	it('each() - Array', () => {
		let count = 0;
		const validValues = ['idx0', 'idx1', 'idx4', 'idx5'];
		const validKeys = [0, 1, 2, 3, 4];
		const array = ['idx0', 'idx1', 'idx4', 'idx5'];

		utils.each(array, (index, value) => {
			count++;
			expect(value).toBe(validValues.shift());
			expect(index).toBe(validKeys.shift());
		});

		expect(count).toBe(4);
	});

	it('each() - Object', () => {
		let count = 0;
		const validValues = ['idx0', 'idx1', 'idx4', 'idx5'];
		const validKeys = ['0', '1', '4', '5'];
		const object = {
			0: 'idx0',
			1: 'idx1',
			4: 'idx4',
			5: 'idx5'
		};

		utils.each(object, (key, value) => {
			count++;
			expect(key).toBe(validKeys.shift());
			expect(value).toBe(validValues.shift());
		});

		expect(count).toBe(4);
	});

	it('each() - Array like', () => {
		let count = 0;
		const validValues = ['idx0', 'idx1', undefined, undefined, 'idx4'];
		const validKeys = [0, 1, 2, 3, 4];
		const arrayLike = {
			length: 5,
			0: 'idx0',
			1: 'idx1',
			4: 'idx4',
			5: 'idx5'
		};

		utils.each(arrayLike, (index, value) => {
			count++;
			expect(value).toBe(validValues.shift());
			expect(index).toBe(validKeys.shift());
		});

		expect(count).toBe(5);
	});

});

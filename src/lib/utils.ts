/**
 * Check if the passed argument is the
 * the passed type.
 */
function isTypeof(type: string, arg: unknown): boolean {
	return typeof arg === type;
}

export function isString(arg: unknown): arg is string {
	return isTypeof('string', arg);
}

export function isUndefined(arg: unknown): arg is undefined {
	return isTypeof('undefined', arg);
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(arg: unknown): arg is Function {
	return isTypeof('function', arg);
}

export function isNumber(arg: unknown): arg is number {
	return isTypeof('number', arg);
}


/**
 * Returns true if an object has no keys
 */
export function isEmptyObject(obj: object): boolean {
	return !Object.keys(obj).length;
}

/**
 * Extends the first object with any extra objects passed
 *
 * If the first argument is boolean and set to true
 * it will extend child arrays and objects recursively.
 */
export function extend<T extends object>(target: T, ...sources: unknown[]): T;
export function extend<T extends object>(deep: boolean, target: T, ...sources: unknown[]): T;
export function extend(targetArg: object | boolean, ...rest: unknown[]): object {
	const isTargetBoolean = targetArg === !!targetArg;
	const target = (isTargetBoolean ? rest[0] : targetArg) as Record<string, unknown>;
	const isDeep = isTargetBoolean ? (targetArg as boolean) : false;
	const sources = isTargetBoolean ? rest.slice(1) : rest;

	function isObject(value: unknown): value is Record<string, unknown> {
		return value !== null &&
			typeof value === 'object' &&
			Object.getPrototypeOf(value) === Object.prototype;
	}

	for (const source of sources) {
		if (source === null || source === undefined) {
			continue;
		}

		// Copy all properties for jQuery compatibility
		/* eslint guard-for-in: off */
		for (const key in source as Record<string, unknown>) {
			const targetValue = target[key];
			const value = (source as Record<string, unknown>)[key];

			// Skip undefined values to match jQuery
			if (isUndefined(value)) {
				continue;
			}

			// Skip special keys to prevent prototype pollution
			if (key === '__proto__' || key === 'constructor') {
				continue;
			}

			const isValueObject = isObject(value);
			const isValueArray = Array.isArray(value);

			if (isDeep && (isValueObject || isValueArray)) {
				// Can only merge if target type matches otherwise create
				// new target to merge into
				const isSameType = isObject(targetValue) === isValueObject &&
					Array.isArray(targetValue) === isValueArray;

				target[key] = extend(
					true,
					(isSameType ? targetValue : (isValueArray ? [] : {})) as object,
					value
				);
			} else {
				target[key] = value;
			}
		}
	}

	return target;
}

/**
 * Removes an item from the passed array
 */
export function arrayRemove<T>(arr: T[], item: T): void {
	const i = arr.indexOf(item);

	if (i > -1) {
		arr.splice(i, 1);
	}
}

/**
 * Iterates over an array or object
 */
export function each<T>(obj: ArrayLike<T>, fn: (index: number, value: T) => void): void;
export function each<T>(obj: Record<string, T>, fn: (key: string, value: T) => void): void;
export function each(
	obj: ArrayLike<unknown> | Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	fn: (key: any, value: any) => void
): void {
	if (Array.isArray(obj) || ('length' in obj && isNumber(obj.length))) {
		const arrayLike = obj as ArrayLike<unknown>;

		for (let i = 0; i < arrayLike.length; i++) {
			fn(i, arrayLike[i]);
		}
	} else {
		Object.keys(obj).forEach(function (key) {
			fn(key, (obj as Record<string, unknown>)[key]);
		});
	}
}

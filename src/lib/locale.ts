/**
 * The url of the SCEditor script. document.currentScript is only set while
 * a classic script runs (it is null afterwards and in ES modules), so it is
 * read when this module is evaluated.
 */
const scriptSrc: string =
	(typeof document !== 'undefined' &&
		(document.currentScript as HTMLScriptElement | null)?.src) || '';

/**
 * The language files that are loading or loaded, so several editors on
 * one page load a language file only once
 */
const loading = new Map<string, Promise<void>>();

/**
 * Gets the url of the language file of a locale.
 *
 * The language files are in the languages folder next to the SCEditor
 * script (dist/languages). basePath overrides that folder: it is the folder
 * that holds the languages folder (absolute or relative to the page).
 * Without both (e.g. an ES module without basePath) the url is relative to
 * the page, like it was before.
 *
 * @param locale The locale (the name of the language file)
 * @param basePath The basePath option
 * @param src The url of the SCEditor script
 */
export function getLocaleUrl(
	locale: string,
	basePath: string,
	src: string = scriptSrc
): string {
	const file = `languages/${locale}.js`;

	if (basePath) {
		return basePath.replace(/\/?$/, '/') + file;
	}

	if (src) {
		return new URL(file, src).href;
	}

	return `../${file}`;
}

/**
 * Loads the language file of a locale
 *
 * @param url The url of the language file
 */
export function loadLocale(url: string): Promise<void> {
	let promise = loading.get(url);

	if (!promise) {
		promise = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.type = 'text/javascript';
			script.onload = () => resolve();
			script.onerror = () => {
				// a later editor tries again
				loading.delete(url);
				script.remove();
				reject(new Error(`Could not load the language file ${url}`));
			};
			script.src = url;
			document.head.append(script);
		});

		loading.set(url, promise);
	}

	return promise;
}

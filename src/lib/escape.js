// Regex used by DOMPurify to filter URLs. Might as well match here as otherwise
// URLs will be filtered out by DOMPurify anyway
var VALID_URI_REGEX = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;
// Safe image data URIs
var VALID_DATA_REGEX = /^data:image\/(png|bmp|gif|p?jpe?g);/i;
var WHITESPACE_REGEX = /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;

/**
 * Escapes a string so it's safe to use in regex
 *
 * @param {string} str
 * @return {string}
 */
export function regex(str) {
	return str.replace(/([\-.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
};

/**
 * Escapes all HTML entities in a string
 *
 * If noQuotes is set to false, all single and double
 * quotes will also be escaped
 *
 * @param {string} str
 * @param {boolean} [noQuotes=true]
 * @return {string}
 * @since 1.4.1
 */
export function entities(str, noQuotes) {
	if (!str) {
		return str;
	}

	var replacements = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'  ': '&nbsp; ',
		'\r\n': '<br />',
		'\r': '<br />',
		'\n': '<br />'
	};

	if (noQuotes !== false) {
		replacements['"'] = '&#34;';
		replacements['\''] = '&#39;';
		replacements['`'] = '&#96;';
	}

	str = str.replace(/ {2}|\r\n|[&<>\r\n'"`]/g,
		function (match) {
			return replacements[match] || match;
		});

	return str;
};

/**
 * Escape URI scheme.
 *
 * Appends the current URL to a url if it has a scheme that is not:
 *
 * http
 * https
 * ftps
 * ftp
 * mailto
 * spotify
 * ssh
 * teamspeak
 * tel
 * callto
 * sms
 * cid
 * xmpp
 * matrix
 * data:image/(png|jpeg|jpg|pjpeg|bmp|gif);
 *
 * **IMPORTANT**: This does not escape any HTML in a url, for
 * that use the escape.entities() method.
 *
 * @param  {string} url
 * @return {string}
 * @since 1.4.5
 */
export function uriScheme(url) {
	var	path,
		location = window.location;

	// Match previous behaviour for empty or data: URIs
	if (!url || VALID_DATA_REGEX.test(url)) {
		return url;
	}

	// Invalid scheme so make relative
	if (!VALID_URI_REGEX.test(url.replace(WHITESPACE_REGEX, ''))) {
		path = location.pathname.split('/');
		path.pop();

		url = location.protocol + '//' +
			location.host +
			path.join('/') + '/' +
			url;

		if (!VALID_URI_REGEX.test(url.replace(WHITESPACE_REGEX, ''))) {
			return '';
		}
	}

	return url;
};

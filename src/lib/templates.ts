import * as dom from './dom.js';
import * as escape from './escape.js';

import DOMPurify from 'dompurify';

/**
 * The URL field of the dialogs: a URL keyboard on phones, no
 * autocorrect or capital first letter
 */
const URL_INPUT =
	'<input type="url" inputmode="url" id="link" dir="ltr" placeholder="https://" ' +
	'class="form-control" autocomplete="off" autocapitalize="off" spellcheck="false" />';

/**
 * Cancel and Insert buttons of the dialogs (Insert is the submit
 * button, so Enter in a field inserts)
 */
const FOOTER =
	'<div class="sceditor-dropdown-footer">' +
		'<button type="button" class="btn btn-sm btn-outline-secondary sceditor-cancel">{cancel}</button>' +
		'<button type="submit" class="btn btn-sm btn-primary button">{insert}</button>' +
	'</div>';

/**
 * A dialog with one URL field
 */
const URL_FORM =
	'<form class="sceditor-dropdown-form" novalidate>' +
		'<div class="mb-3"><label for="link" class="form-label">{label}</label>' +
		URL_INPUT +
		'<div class="invalid-feedback">{invalid}</div></div>' +
		FOOTER +
	'</form>';

/**
 * HTML templates used by the editor and default commands
 * @private
 */
const _templates: Record<string, string> = {
	html:
		'<!DOCTYPE html>' +
			'<html data-bs-theme="{themeMode}">' +
			'<head>' +
			'<meta http-equiv="Content-Type" ' +
			'content="text/html;charset={charset}" />' +
			'{styles}' +
			'</head>' +
			'<body style="min-height:265px" contenteditable="true" {spellcheck}><p></p>' +
			'</body>' +
			'</html>',

	style: '<link rel="stylesheet" type="text/css" href="{style}" />',

	toolbarButton: '<a class="btn sceditor-button sceditor-button-{name}" ' +
		'data-sceditor-command="{name}" unselectable="on">' +
		'<span unselectable="on">  </span></a>',

	codeOpt: '<a class="sceditor-code-option dropdown-item" href="#" ' +
		'data-language="{language}">{languageName}</a>',

	noteOpt: '<option value="{type}">{type}</option>',

	extensionOpt: '<a class="sceditor-extension-option dropdown-item" href="#" ' +
		'data-language="{extension}">{extension}</a>',

	fontOpt: '<a class="sceditor-font-option dropdown-item" href="#" ' +
		'data-font="{font}"><font face="{font}">{font}</font></a>',

	sizeOpt: '<a class="sceditor-fontsize-option dropdown-item" data-size="{size}" ' +
		'href="#"><span style="font-size:{percent}%">{label}</span></a>',

	albums:
		'<form class="m-3"><div id="AlbumsListBox" class="content">' +
			'<div id="AlbumsListPager"></div>' +
			'<div id="PostAlbumsLoader" class="text-center"><div class="fa-3x"><i class="fas fa-spinner fa-pulse"></i>' +
			'</div></div>' +
			'<div id="AlbumsListBox" class="content">' +
			'<div id="PostAlbumsListPlaceholder" data-url="{root}" style="clear: both; ">' +
			'<div class="container"><div class="AlbumsList row"></div></div>' +
			'</div></div>' +
		'</div></form>',

	note:
		'<form class="sceditor-dropdown-form" novalidate>' +
			'<div class="mb-3"><label for="type" class="form-label">{labelType}</label>' +
			'<select class="form-select" id="type">' +
			'{values}' +
			'</select>' +
			'</div>' +
			'<div class="mb-3"><label for="txt" class="form-label">{labelText}</label>' +
			'<textarea rows="5" id="txt" class="form-control textarea-input"></textarea></div>' +
			FOOTER +
		'</form>',

	pastetext:
		'<form class="sceditor-dropdown-form" novalidate>' +
			'<div class="mb-3"><label for="txt" class="form-label">{label}</label>' +
			'<textarea rows="6" id="txt" class="form-control textarea-input"></textarea></div>' +
			FOOTER +
		'</form>',

	image:
		'<form class="sceditor-dropdown-form" novalidate>' +
			'<div class="mb-3"><label for="link" class="form-label">{url}</label>' +
			URL_INPUT + '</div>' +
			'<div class="mb-3"><label for="des" class="form-label">{desc}</label>' +
			'<input type="text" id="des" class="form-control" autocomplete="off" /></div>' +
			FOOTER +
		'</form>',

	email:
		'<form class="sceditor-dropdown-form" novalidate>' +
			'<div class="mb-3"><label for="email" class="form-label">{label}</label>' +
			'<input type="email" inputmode="email" id="email" dir="ltr" class="form-control" ' +
			'autocomplete="off" autocapitalize="off" spellcheck="false" /></div>' +
			'<div class="mb-3"><label for="des" class="form-label">{desc}</label>' +
			'<input type="text" id="des" class="form-control" autocomplete="off" /></div>' +
			FOOTER +
		'</form>',

	link:
		'<form class="sceditor-dropdown-form" novalidate>' +
			'<div class="mb-3"><label for="link" class="form-label">{url}</label>' +
			URL_INPUT + '</div>' +
			'<div class="mb-3"><label for="des" class="form-label">{desc}</label>' +
			'<input type="text" id="des" class="form-control" autocomplete="off" /></div>' +
			FOOTER +
		'</form>',

	// mediaMenu, youtubeMenu, instagramMenu and facebookMenu: one URL field
	// with a message for a URL that cannot be embedded
	mediaMenu: URL_FORM,

	youtubeMenu: URL_FORM,

	instagramMenu: URL_FORM,

	facebookMenu: URL_FORM,

	facebook:
		'<div class="ratio ratio-1x1 border" data-oembed-url="{url}" data-facebook-url="{url}"><iframe src="https://www.facebook.com/plugins/post.php?href={url}"></iframe></div>',

	instagram:
		'<div class="ratio ratio-1x1 border" data-oembed-url="https://www.instagram.com/p/{id}" data-instagram-url="{url}"><iframe src="https://www.instagram.com/p/{id}/embed/captioned/"></iframe></div>',

	youtube:
		'<div data-oembed-url="https://youtube.com/embed/{id}" data-youtube-url="{url}" class="ratio ratio-16x9 border"><iframe src="https://youtube.com/embed/{id}?hd=1" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>',

	vimeo:
		'<div data-oembed-url="https://vimeo.com/{vimeoId}" data-vimeo-url="{url}" class="ratio ratio-16x9 border"><iframe src="https://player.vimeo.com/video/{vimeoId}?show_title=1&show_byline=1&show_portrait=1&fullscreen=1"></iframe></div>'
};

/**
 * Replaces any params in a template with the passed params.
 *
 * If createHtml is passed it will return a DocumentFragment
 * containing the parsed template.
 *
 * `sanitize` is opt-in (default false): pass `true` to HTML-escape each
 * param value and run the rendered template through DOMPurify. Templates
 * that interpolate pre-built trusted HTML fragments (e.g. `note`'s
 * `{values}`) must not enable this. Callers that interpolate untrusted
 * user input but need to keep other static markup (e.g. an `<iframe>`)
 * should escape the risky values themselves before calling this function.
 *
 * @private
 */
export default function template(
	name: string,
	params: Record<string, unknown>,
	createHtml: true,
	sanitize?: boolean
): DocumentFragment;
export default function template(
	name: string,
	params: Record<string, unknown>,
	createHtml?: boolean,
	sanitize?: boolean
): string;
export default function template(
	name: string,
	params: Record<string, unknown>,
	createHtml?: boolean,
	sanitize?: boolean
): string | DocumentFragment {
	let renderedTemplate = _templates[name];

	Object.keys(params).forEach(function (paramName) {
		if (sanitize) {
			params[paramName] = escape.entities(String(params[paramName]));
		}

		renderedTemplate = renderedTemplate.replace(
			new RegExp(escape.regex(`{${paramName}}`), 'g'),
			String(params[paramName])
		);
	});

	if (sanitize) {
		renderedTemplate = DOMPurify.sanitize(renderedTemplate, { ADD_ATTR: ['unselectable'] });
	}

	if (createHtml) {
		return dom.parseHTML(renderedTemplate);
	}

	return renderedTemplate;
}

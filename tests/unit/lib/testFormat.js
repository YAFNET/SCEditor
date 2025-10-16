export class testFormat {
	constructor() {
		this.toHtml = function () {
			return '<p><b>test wysiwyg</b></p>';
		};

		this.toSource = function () {
			return '<p><b>test source</b></p>';
		};
	}
}

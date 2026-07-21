const testMemoryLeaks = function (posArg?: number) {
	const pos = posArg || 1;

	const textarea = document.getElementById('testarea') as HTMLTextAreaElement;

	sceditor.create(textarea, {
		autofocus: true,
		autofocusEnd: true,
		enablePasteFiltering: true,
		plugins: ''
	});

	sceditor.instance(textarea)!.destroy();
	(document.getElementById('progress') as HTMLElement).style.width = `${pos}%`;

	if (pos <= 100) {
		setTimeout(function () {
			testMemoryLeaks(pos + 1);
		});
	}
};

document.addEventListener('DOMContentLoaded', function () {

	(document.querySelector('input[type="submit"]') as HTMLElement).addEventListener('click', () => {
		testMemoryLeaks();

		return false;
	});
});

var testMemoryLeaks = function (pos) {
	pos = pos || 1;

	var textarea = document.getElementById('testarea');

	sceditor.create(textarea, {
		autofocus: true,
		autofocusEnd: true,
		enablePasteFiltering: true,
		plugins: ''
	});

	sceditor.instance(textarea).destroy();
	document.getElementById('progress').style.width = `${pos}%`;

	if (pos <= 100) {
		setTimeout(function () {
			testMemoryLeaks(pos + 1);
		});
	}
};

document.addEventListener('DOMContentLoaded', function() {
	
	document.querySelector('input[type="submit"]').addEventListener('click', () => {
		testMemoryLeaks();

		return false;
	});
});
(function (sceditor) {
	'use strict';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type Any = any;

	sceditor.plugins.undo = function (this: Any) {
		const base = this;
		let sourceEditor: Any;
		let editor: Any;
		let body: Any;
		let countField: Any;
		let lastInputType = '';
		let charChangedCount = 0;
		let isInPatchedFn = false;
		/**
		 * If currently restoring a state
		 * Should ignore events while it's happening
		 */
		let isApplying = false;
		/**
		 * If current selection change event has already been stored
		 */
		let isSelectionChangeHandled = false;

		let undoLimit = 50;
		const undoStates: Any[] = [];
		let redoPosition = 0;
		let lastState: Any;

		/**
		 * Sets the editor to the specified state.
		 * @private
		 */
		function applyState(state: Any) {
			isApplying = true;
			editor.sourceMode(state.sourceMode);

			if (state.sourceMode) {
				editor.val(state.value, false);
				editor.sourceEditorCaret(state.caret);
			} else {
				editor.getBody().innerHTML = state.value;

				// Caret may not exist for the first state in Firefox
				if (state.caret) {
					const range = editor.getRangeHelper().selectedRange();
					setRangePositions(range, state.caret);
					editor.getRangeHelper().selectRange(range);
				}
			}

			editor.focus();
			isApplying = false;
		}

		/**
		 * Patches a function on the object to call store() after invocation
		 */
		function patch(obj: Any, fn: string) {
			const origFn = obj[fn];
			obj[fn] = function (this: Any, ...args: Any[]) {
				// sourceMode calls other patched methods so need to ignore them
				const ignore = isInPatchedFn;

				// Store caret position before any change is made
				if (!ignore && !isApplying && lastState &&
						editor.getRangeHelper().hasSelection()) {
					updateLastState();
				}

				isInPatchedFn = true;
				origFn.apply(this, args);

				if (!ignore) {
					isInPatchedFn = false;

					if (!isApplying) {
						storeState();
						lastInputType = '';
					}
				}
			};
		}

		/**
		 * Stores the editors current state
		 */
		function storeState() {
			if (redoPosition) {
				undoStates.length -= redoPosition;
				redoPosition = 0;
			}

			if (undoLimit > 0 && undoStates.length > undoLimit) {
				undoStates.shift();
			}

			lastState = {};
			updateLastState();

			// updateLastState() calls base.undo() (which nulls lastState)
			// when content exceeds maxLength - don't push a stale/null state
			if (lastState) {
				undoStates.push(lastState);
			}
		}

		/**
		 * Updates the last saved state with the editors current state
		 */
		function updateLastState() {
			const sourceMode = editor.sourceMode();
			lastState.caret = sourceMode ? editor.sourceEditorCaret() :
				getRangePositions(editor.getRangeHelper().selectedRange());
			lastState.sourceMode = sourceMode;

			const value = sourceMode ?
				editor.getSourceEditorValue(false) :
				editor.getBody().innerHTML;

			const maxLimit = editor.opts.maxLength;

			// Update counter (maxLength is opt-in; null/unset means no limit)
			if (typeof maxLimit === 'number' && editor.val().length > maxLimit) {
				lastState.value = value;
				base.undo();
				return;
			}

			if (countField && typeof maxLimit === 'number') {
				countField.textContent = String(maxLimit - editor.val().length);
			}

			lastState.value = value;
		}

		base.init = function (this: Any) {
			// this variable will be set to the instance of the editor
			// calling it, hence why the plugins "this" is saved to the base
			// variable.
			editor = this;

			undoLimit = editor.undoLimit || undoLimit;

			editor.addShortcut('ctrl+z', base.undo);
			editor.addShortcut('ctrl+shift+z', base.redo);
			editor.addShortcut('ctrl+y', base.redo);
		};

		function documentSelectionChangeHandler() {
			if (sourceEditor === document.activeElement) {
				base.signalSelectionchangedEvent();
			}
		}

		base.signalReady = function () {
			sourceEditor = editor.getContentAreaContainer().nextSibling;
			body = editor.getBody();
			// Scope the counter lookup to this editor instance's own
			// container - the "editor-Counter" id is not unique across
			// multiple editor instances on the same page, so a global
			// document.getElementById() would always hit the first instance
			countField = editor.getContentAreaContainer().parentNode
				.querySelector('#editor-Counter');

			// Store initial state
			storeState();

			// Patch methods that allow inserting content into the editor
			// programmatically
			// TODO: remove this when there is a built in event to handle it
			patch(editor, 'setWysiwygEditorValue');
			patch(editor, 'setSourceEditorValue');
			patch(editor, 'sourceEditorInsertText');
			patch(editor.getRangeHelper(), 'insertNode');
			patch(editor, 'toggleSourceMode');

			/**
			 * Handles the before input event so can override built in
			 * undo / redo
			 */
			function beforeInputHandler(e: Any) {
				if (e.inputType === 'historyUndo') {
					base.undo();
					e.preventDefault();
				} else if (e.inputType === 'historyRedo') {
					base.redo();
					e.preventDefault();
				}
			}

			body.addEventListener('beforeinput', beforeInputHandler);
			sourceEditor.addEventListener('beforeinput', beforeInputHandler);

			/**
			 * Should always store state at the end of composing
			 */
			function compositionHandler() {
				lastInputType = '';
				storeState();
			}
			body.addEventListener('compositionend', compositionHandler);
			sourceEditor.addEventListener('compositionend', compositionHandler);

			// Chrome doesn't trigger selectionchange on textarea so need to
			// listen to global event
			document.addEventListener('selectionchange',
				documentSelectionChangeHandler);
		};

		base.destroy = function () {
			document.removeEventListener('selectionchange',
				documentSelectionChangeHandler);
		};

		base.undo = function () {
			lastState = null;

			if (redoPosition < undoStates.length - 1) {
				redoPosition++;
				applyState(undoStates[undoStates.length - 1 - redoPosition]);
			}

			return false;
		};

		base.redo = function () {
			if (redoPosition > 0) {
				redoPosition--;
				applyState(undoStates[undoStates.length - 1 - redoPosition]);
			}

			return false;
		};

		/**
		 * Handle the selectionchanged event so can store the last caret
		 * position before the input so undoing places it in the right place
		 */
		base.signalSelectionchangedEvent = function () {
			if (isApplying || isSelectionChangeHandled) {
				isSelectionChangeHandled = false;
				return;
			}
			if (lastState) {
				updateLastState();
			}
			lastInputType = '';
		};

		/**
		 * Handles the input event
		 */
		base.signalInputEvent = function (e: Any) {
			// InputType is one of
			// https://rawgit.com/w3c/input-events/v1/index.html#interface-InputEvent-Attributes
			// Most should cause a full undo item to be added so only need to
			// handle a few of them
			const inputType = e.inputType;

			// Should ignore selection changes that occur because of input
			// events as already handling them
			isSelectionChangeHandled = true;

			// inputType should be supported by all supported browsers
			// except IE 11 in runWithoutWysiwygSupport. Shouldn't be an issue
			// as native handling will mostly work there.
			// Ignore if composing as will handle composition end instead
			if (!inputType || e.isComposing) {
				return;
			}

			switch (e.inputType) {
				case 'deleteContentBackward':
					if (lastState && lastInputType === inputType &&
						charChangedCount < 20) {
						updateLastState();
					} else {
						storeState();
						charChangedCount = 0;
					}

					lastInputType = inputType;
					break;

				case 'insertText':
					charChangedCount += e.data ? e.data.length : 1;

					if (lastState && lastInputType === inputType &&
							charChangedCount < 20 && !/\s$/.test(e.data)) {
						updateLastState();
					} else {
						storeState();
						charChangedCount = 0;
					}

					lastInputType = inputType;
					break;
				default:
					lastInputType = 'sce-misc';
					charChangedCount = 0;
					storeState();
					break;
			}
		};

		/**
		 * Creates a positions object form passed range
		 */
		function getRangePositions(range: Any) {
			// In Firefox, range may not exist when the editor is first created
			// due to Firefox returning null from getSelection() when the
			// editors iframe is first created. See issue #910
			if (!range) {
				return undefined;
			}

			// Merge any adjacent text nodes as it will be done by innerHTML
			// which would cause positions to be off if not done
			body.normalize();

			return {
				startPositions:
					nodeToPositions(range.startContainer, range.startOffset),
				endPositions:
					nodeToPositions(range.endContainer, range.endOffset)
			};
		}

		/**
		 * Sets the range start/end based on the positions object
		 */
		function setRangePositions(range: Any, positions: Any) {
			try {
				const startPositions = positions.startPositions;
				const endPositions = positions.endPositions;

				range.setStart(positionsToNode(body, startPositions),
					startPositions[0]);
				range.setEnd(positionsToNode(body, endPositions),
					endPositions[0]);
			} catch (e) {
				if (console && console.warn) {
					console.warn('[SCEditor] Undo plugin lost caret', e);
				}
			}
		}

		/**
		 * Converts the passed container and offset into positions array
		 */
		function nodeToPositions(container: Any, offset: number): number[] {
			const positions = [offset];
			let node = container;

			while (node && node.tagName !== 'BODY') {
				positions.push(nodeIndex(node));
				node = node.parentNode;
			}

			return positions;
		}

		/**
		 * Returns index of passed node
		 */
		function nodeIndex(nodeArg: Any): number {
			let node = nodeArg;
			let i = 0;
			while ((node = node.previousSibling)) {
				i++;
			}
			return i;
		}

		/**
		 * Gets the container node from the positions array
		 */
		function positionsToNode(nodeArg: Any, positions: number[]): Any {
			let node = nodeArg;
			for (let i = positions.length - 1; node && i > 0; i--) {
				node = node.childNodes[positions[i]];
			}
			return node;
		}
	} as Any;
}(sceditor));

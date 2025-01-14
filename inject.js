"use strict";

(function () {
	function tryCopy(text) {
		// const image = new Image();
		const raw = btoa(encodeURI(text))
		const url = "http://localhost:5000/clipboard?password=my_secret_password&text=" + raw;
		fetch(url);
	}

	function searchUpTheTree(node, className) {
		if (node?.classList?.contains?.(className)) {
			return node;
		}

		if (node.parentNode) {
			return searchUpTheTree(node.parentNode, className);
		} else {
			return null;
		}
	}

	function injectCSS() {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = 'chrome-extension://fkbbkhghmikohbaphknfnblohnpnjlac/inject.css';
		document.head.appendChild(link);
	}

	function around( current, target, offset=1 ) {
		return Math.abs( current - target ) < offset;
	}

	function getPageText( el ) {
		const page = searchUpTheTree( el, "page" );

		const text = [];
		let curParagraph = "";

		page.querySelectorAll( "span[role=presentation]" ).forEach( el => {
			const content = el.textContent;
			const fontSize = Number(getComputedStyle(el)["fontSize"].slice(0, -2));
			const left = Number(getComputedStyle(el)["left"].slice(0, -2));

			/**
			 * 脚标，这里去掉
			 */
			if( fontSize < 28 ) {
				return;
			}

			/**
			 * 左边距有缩进，说明是段落开头
			 */
			if( around( left, 266 ) ) {
				text.push( curParagraph );
				curParagraph = "";
			}

			curParagraph += content;
			console.log(el.textContent, el, );
		});

		if( curParagraph !== "" ) {
			text.push( curParagraph );
			curParagraph = "";
		}

		console.log( text );
		
	}

	function clickToCopy() {
		document.addEventListener("click", e => {
			const paragraph = searchUpTheTree(e.target, "markedContent");

			getPageText( e.target );

			// if (paragraph instanceof HTMLElement) {
			// 	const text = paragraph.textContent;

			// 	// alert( text );

			// 	tryCopy(text);
			// 	console.log("ggg", "Got paragarph:", text);
			// }
		});
	}

	function keyboardShortcuts() {
		document.addEventListener("keydown", e => {
			if (e.key === "v") {
				const viewer = document.getElementById("viewer");
				if (viewer instanceof HTMLElement) {
					viewer.classList.toggle("hide");
				}
			}

			if (e.key == "Tab") {
				e.preventDefault();
				PDFViewerApplication.pdfSidebar.toggle();
			}
		});
	}

	injectCSS();
	clickToCopy();
	keyboardShortcuts();

})();
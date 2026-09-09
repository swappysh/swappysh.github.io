import { a as ensureFontFace, c as resolveEffects, i as computeTextLayout, n as createBundle, o as drawGlyph, r as computeTimeline, t as TegakiEngine } from "../core-D68zOEne.mjs";
//#region src/wc/TegakiElement.ts
/**
* Observed attribute names.
* - `text`: the text to render (also settable via textContent)
* - `font`: registered bundle name (see {@link TegakiEngine.registerBundle})
* - `time`: time control — a number for controlled mode, `"css"` for CSS mode, omit for uncontrolled
* - `speed`: playback speed multiplier (uncontrolled mode, default `1`)
* - `playing`: whether animation is playing (uncontrolled mode, default `true`)
* - `loop`: loop animation (uncontrolled mode, default `false`)
* - `delay`: delay before animation starts (seconds, uncontrolled mode, default `0`)
* - `loop-gap`: pause between loop iterations (seconds, uncontrolled mode, default `0`)
* - `segment-size`: segment size for rendering
* - `show-overlay`: show debug overlay
*/
const OBSERVED_ATTRS = [
	"text",
	"font",
	"time",
	"speed",
	"playing",
	"loop",
	"delay",
	"loop-gap",
	"segment-size",
	"show-overlay"
];
var TegakiElement = class extends HTMLElement {
	static observedAttributes = [...OBSERVED_ATTRS];
	_engine = null;
	_container;
	_font;
	_effects;
	_timing;
	_onComplete;
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = `:host { display: inline-block; }`;
		shadow.appendChild(style);
		this._container = document.createElement("div");
		shadow.appendChild(this._container);
	}
	connectedCallback() {
		this._engine = new TegakiEngine(this._container, this._buildOptions());
	}
	disconnectedCallback() {
		this._engine?.destroy();
		this._engine = null;
	}
	attributeChangedCallback(_name, _oldValue, _newValue) {
		this._engine?.update(this._buildOptions());
	}
	/** The underlying engine instance. */
	get engine() {
		return this._engine;
	}
	/** Set the font bundle directly (alternative to the `font` attribute for registered names). */
	get font() {
		return this._font;
	}
	set font(value) {
		this._font = value;
		this._engine?.update(this._buildOptions());
	}
	/** Visual effects configuration. */
	get effects() {
		return this._effects;
	}
	set effects(value) {
		this._effects = value;
		this._engine?.update(this._buildOptions());
	}
	/** Timeline timing configuration. */
	get timing() {
		return this._timing;
	}
	set timing(value) {
		this._timing = value;
		this._engine?.update(this._buildOptions());
	}
	/** Callback when animation completes. */
	get onComplete() {
		return this._onComplete;
	}
	set onComplete(value) {
		this._onComplete = value;
		this._engine?.update(this._buildOptions());
	}
	play() {
		this._engine?.play();
	}
	pause() {
		this._engine?.pause();
	}
	seek(time) {
		this._engine?.seek(time);
	}
	restart() {
		this._engine?.restart();
	}
	get currentTime() {
		return this._engine?.currentTime ?? 0;
	}
	get duration() {
		return this._engine?.duration ?? 0;
	}
	get isPlaying() {
		return this._engine?.isPlaying ?? false;
	}
	get isComplete() {
		return this._engine?.isComplete ?? false;
	}
	_buildOptions() {
		const text = this.getAttribute("text") ?? this.textContent ?? "";
		const fontAttr = this.getAttribute("font");
		return {
			text,
			font: this._font ?? (fontAttr || void 0),
			time: this._resolveTime(),
			effects: this._effects,
			timing: this._timing,
			segmentSize: this._getNumberAttr("segment-size"),
			showOverlay: this.hasAttribute("show-overlay"),
			onComplete: this._onComplete
		};
	}
	_resolveTime() {
		const timeAttr = this.getAttribute("time");
		if (timeAttr === "css") return "css";
		if (timeAttr != null) {
			const num = Number(timeAttr);
			if (!Number.isNaN(num)) return num;
		}
		const hasSpeed = this.hasAttribute("speed");
		const hasPlaying = this.hasAttribute("playing");
		const hasLoop = this.hasAttribute("loop");
		const hasDelay = this.hasAttribute("delay");
		const hasLoopGap = this.hasAttribute("loop-gap");
		if (hasSpeed || hasPlaying || hasLoop || hasDelay || hasLoopGap) return {
			mode: "uncontrolled",
			speed: this._getNumberAttr("speed") ?? 1,
			playing: this.getAttribute("playing") !== "false",
			loop: this.hasAttribute("loop"),
			delay: this._getNumberAttr("delay"),
			loopGap: this._getNumberAttr("loop-gap")
		};
	}
	_getNumberAttr(name) {
		const value = this.getAttribute(name);
		if (value == null) return void 0;
		const num = Number(value);
		return Number.isNaN(num) ? void 0 : num;
	}
};
/**
* Register the `<tegaki-renderer>` custom element.
* Call this once before using the element in HTML.
*
* @param tagName - Custom element tag name. Default: `'tegaki-renderer'`.
*   Note: custom element names must contain a hyphen per the HTML spec.
*/
function registerTegakiElement(tagName = "tegaki-renderer") {
	if (!customElements.get(tagName)) customElements.define(tagName, TegakiElement);
}
//#endregion
export { TegakiElement, TegakiEngine, computeTextLayout, computeTimeline, createBundle, drawGlyph, ensureFontFace, registerTegakiElement, resolveEffects };

//# sourceMappingURL=index.mjs.map
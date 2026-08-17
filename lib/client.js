window.__ModuleLoader__.load({
	id: "dsh-weixin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/index.ts
		const inject = ["slots"];
		function WeixinSettingsCard() {
			return react.createElement("div", { style: { padding: "12px" } }, react.createElement("h3", null, "微信连接器配置"), react.createElement("p", null, "当前配置通过 cordis.patch.yml 管理。"), react.createElement("p", null, "配置项：baseUrl, provider, model, accountId, token"));
		}
		function apply(ctx) {
			console.log("[dsh-weixin] client apply() called");
			ctx.slots.inject("settings.plugin.item", () => {
				console.log("[dsh-weixin] injecting settings card");
				return ctx.slots.register({
					name: "settings.plugin.item",
					id: "dsh-weixin"
				}, WeixinSettingsCard);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

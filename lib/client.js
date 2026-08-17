window.__ModuleLoader__.load({
	id: "dsh-weixin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/index.ts
		/**
		* dsh-weixin — browser half.
		*
		* Placeholder: registers no UI surface yet.
		* Future: Settings configuration tab for baseUrl / provider / model.
		*/
		const inject = [];
		function apply() {
			console.log("[dsh-weixin] client bundle loaded");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

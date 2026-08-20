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
		const inject = ["slots", "connection"];
		let connRef = null;
		function WeixinSettingsCard() {
			const [state, setState] = react.useState({
				connected: false,
				accountId: null,
				sessionId: "weixin-main",
				polling: false,
				loginRunning: false,
				qrUrl: null,
				qrVisible: false,
				error: null,
				loading: false
			});
			react.useEffect(() => {
				let alive = true;
				async function poll() {
					if (!connRef) return;
					try {
						const resp = await connRef.rpc.call("/api", "weixin/status", {});
						if (!alive) return;
						if (resp.ok && typeof resp.value === "object" && resp.value !== null) {
							const v = resp.value;
							setState((prev) => ({
								...prev,
								connected: !!v.connected,
								accountId: v.accountId ?? null,
								sessionId: v.sessionId ?? "weixin-main",
								polling: !!v.polling,
								loginRunning: !!v.loginRunning
							}));
						}
					} catch {}
				}
				poll();
				const id = setInterval(poll, 3e3);
				return () => {
					alive = false;
					clearInterval(id);
				};
			}, []);
			const doLogin = react.useCallback(async () => {
				if (!connRef) return;
				setState((prev) => ({
					...prev,
					loading: true,
					error: null
				}));
				try {
					const resp = await connRef.rpc.call("/api", "weixin/login", {});
					if (!resp.ok) throw new Error(resp.error?.message || "Login failed");
					const v = resp.value;
					setState((prev) => ({
						...prev,
						qrUrl: v.qrUrl ?? null,
						qrVisible: true,
						loading: false
					}));
				} catch (err) {
					setState((prev) => ({
						...prev,
						error: err instanceof Error ? err.message : String(err),
						loading: false
					}));
				}
			}, []);
			const doNewSession = react.useCallback(async () => {
				if (!connRef) return;
				setState((prev) => ({
					...prev,
					loading: true,
					error: null
				}));
				try {
					const resp = await connRef.rpc.call("/api", "weixin/newSession", {});
					if (!resp.ok) throw new Error(resp.error?.message || "Failed to create session");
					const v = resp.value;
					setState((prev) => ({
						...prev,
						sessionId: v.sessionId ?? prev.sessionId,
						loading: false
					}));
				} catch (err) {
					setState((prev) => ({
						...prev,
						error: err instanceof Error ? err.message : String(err),
						loading: false
					}));
				}
			}, []);
			const hideQr = react.useCallback(() => {
				setState((prev) => ({
					...prev,
					qrVisible: false
				}));
			}, []);
			const qrDisplay = react.useMemo(() => {
				if (!state.qrUrl) return null;
				if (state.qrUrl.startsWith("http") && (state.qrUrl.includes("qrcode") || state.qrUrl.endsWith(".png") || state.qrUrl.endsWith(".jpg"))) return react.createElement("img", {
					src: state.qrUrl,
					alt: "WeChat QR",
					style: {
						width: 200,
						height: 200,
						display: "block",
						margin: "12px 0",
						border: "1px solid #ddd",
						borderRadius: 4
					}
				});
				return react.createElement("div", { style: {
					margin: "12px 0",
					padding: 12,
					background: "#f5f5f5",
					borderRadius: 4,
					wordBreak: "break-all"
				} }, react.createElement("p", { style: {
					margin: "0 0 8px",
					fontSize: 13,
					color: "#666"
				} }, "请用微信「扫一扫」扫描以下二维码："), react.createElement("code", { style: { fontSize: 12 } }, state.qrUrl));
			}, [state.qrUrl]);
			return react.createElement("div", { style: {
				padding: "12px 16px",
				fontSize: 14,
				lineHeight: 1.5
			} }, react.createElement("div", { style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				marginBottom: 12
			} }, react.createElement("span", { style: {
				width: 10,
				height: 10,
				borderRadius: "50%",
				background: state.connected ? "#22c55e" : "#ef4444",
				display: "inline-block"
			} }), react.createElement("strong", null, "微信连接器"), react.createElement("span", { style: {
				color: "#888",
				fontSize: 12
			} }, state.connected ? "已连接" : "未连接")), state.connected && react.createElement("div", { style: {
				marginBottom: 12,
				color: "#444"
			} }, react.createElement("div", null, `账号: ${state.accountId ?? "-"}`), react.createElement("div", null, `当前对话: ${state.sessionId}`), react.createElement("div", null, `轮询: ${state.polling ? "运行中" : "已停止"}`)), react.createElement("div", { style: {
				display: "flex",
				gap: 8,
				flexWrap: "wrap",
				marginBottom: 12
			} }, !state.connected && react.createElement("button", {
				onClick: doLogin,
				disabled: state.loading,
				style: {
					padding: "6px 14px",
					borderRadius: 4,
					border: "none",
					background: "#2563eb",
					color: "#fff",
					cursor: state.loading ? "not-allowed" : "pointer",
					opacity: state.loading ? .6 : 1
				}
			}, state.loading ? "处理中…" : "扫码登录"), state.connected && react.createElement("button", {
				onClick: doNewSession,
				disabled: state.loading,
				style: {
					padding: "6px 14px",
					borderRadius: 4,
					border: "1px solid #2563eb",
					background: "#fff",
					color: "#2563eb",
					cursor: state.loading ? "not-allowed" : "pointer",
					opacity: state.loading ? .6 : 1
				}
			}, state.loading ? "处理中…" : "新建对话 (/new)"), state.qrVisible && react.createElement("button", {
				onClick: hideQr,
				style: {
					padding: "6px 14px",
					borderRadius: 4,
					border: "1px solid #ccc",
					background: "#f9f9f9",
					color: "#444",
					cursor: "pointer"
				}
			}, "隐藏二维码")), state.qrVisible && qrDisplay, state.error && react.createElement("div", { style: {
				color: "#dc2626",
				fontSize: 13,
				marginTop: 8
			} }, state.error), react.createElement("p", { style: {
				color: "#888",
				fontSize: 12,
				marginTop: 8
			} }, "提示: 微信消息会路由到固定对话 session，发送 /new 可切换到新对话。"));
		}
		function apply(ctx) {
			console.log("[dsh-weixin] client apply() called");
			try {
				connRef = ctx.get("connection");
			} catch {
				console.warn("[dsh-weixin] connection service not available");
			}
			ctx.slots.inject("settings.plugin.item", () => {
				console.log("[dsh-weixin] injecting settings card (v0.2.0)");
				try {
					return ctx.slots.register({
						name: "settings.plugin.item",
						id: "dsh-weixin",
						order: 30,
						label: "微信连接器"
					}, WeixinSettingsCard);
				} catch (err) {
					console.error("[dsh-weixin] register failed:", err);
					throw err;
				}
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

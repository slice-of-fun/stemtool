/**
 * CSInterface - Adobe Common Extensibility Platform Interface
 * Standard bridge between HTML/JS panel and ExtendScript environment
 */

function CSInterface() {}

CSInterface.prototype.evalScript = function (script, callback) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.evalScript(script, callback);
    } else {
        console.warn("[CSInterface Mock] evalScript:", script);
        if (callback) {
            // Mock response for development outside Premiere Pro
            callback(JSON.stringify({ error: "Running outside Adobe CEP container." }));
        }
    }
};

CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.openURLInDefaultBrowser(url);
    } else {
        window.open(url, "_blank");
    }
};

CSInterface.prototype.getHostEnvironment = function () {
    if (typeof window.__adobe_cep__ !== "undefined") {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }
    return { appName: "PPRO", appVersion: "24.0", isDev: true };
};

CSInterface.prototype.closeExtension = function () {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.closeExtension();
    }
};


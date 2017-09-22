/**
 * Created by rick on 2017-09-05.
 */

/** ======================= XHR INTERCEPT =========================
 *
 * Override XMLHttpRequest with HiveProxyRequest
 * HiveProxyRequest implements the same API, and evaluates the requested url.
 * If the url matches a facebook live video (metadata, audio, video)
 * it will forward the request to the content script through postMessage api.
 *
 * If the request is not a facebook live video, it will be resolved using the
 * original XMLHttpRequest
 */

const HiveProxyRequest = (function () {

    const parsedResponseHeaders = {};

    function HiveProxyRequest() {

        Object.assign(this, HiveXMLHttpRequest);

        this.readyState = 0;
        this.status = 0;
        this.responseType = "";
        this.withCredentials = false;
        this.timeout = undefined;
    }

    // --------------------------- XMLHttpRequest signature methods ----------------------------//
    HiveProxyRequest.prototype.open = function (method, url, sync, user, pass) {
        if (sync === void 0) {
            sync = true;
        }
        this.method = method;
        this.url = url;
        this.sync = sync;
        this.user = user;
        this.pass = pass;

        this.readyState = 1;
        if (this.onreadystatechange)
            this.onreadystatechange({
                currentTarget: this
            });
        console.info("OPEN: " + this.method + " " + this.url)
    };

    HiveProxyRequest.prototype.overrideMimeType = function(mimeType) {
        this.mimetype = mimeType;
    }

    HiveProxyRequest.prototype.getAllResponseHeaders = function () {
        return this.responseHeaders;
    };

    HiveProxyRequest.prototype.getResponseHeader = function (header) {

        if (!parsedResponseHeaders) {
            // parse once all the headers into a map
            if (this.responseHeaders) {
                const lines = this.responseHeaders.split('\n');
                lines.forEach(function (line) {
                    let keyValue = line.split(':');
                    parsedResponseHeaders[keyValue[0].trim()] = keyValue[1].trim();
                });
            }
        }

        return parsedResponseHeaders[header];
    };

    HiveProxyRequest.prototype.setRequestHeader = function (name, value) {
        if (!this.headers)
            this.headers = [];
        // console.info("HEADER " + name + " " + value);
        this.headers.push({key: name, value: value});
    };

    function internalSend(req, _this, body) {

        req.open(_this.method, _this.url, _this.sync, _this.user, _this.pass);

        if (_this.withCredentials)
            req.withCredentials = true;

        if (_this.headers) {
            _this.headers.forEach(function (elem) {
                req.setRequestHeader(elem.key, elem.value)
            })
        }

        if (_this.responseType)
            req.responseType = _this.responseType;

        if (_this.mimetype)
            req.overrideMimeType(_this.mimetype);

        if (_this.timeout)
            req.timeout = _this.timeout;

        req.onreadystatechange = function () {

            _this.readyState = req.readyState;
            if (_this.onreadystatechange)
                _this.onreadystatechange({
                    currentTarget: this
                });

            if (req.readyState === 4) {

                try {
                    const len = req.loaded;
                    _this.status = req.status;
                    _this.statusText = req.statusText;
                    _this.responseHeaders = req.getAllResponseHeaders();
                    _this.response = req.response;
                    _this.responseURL = req.responseURL;
                    if (req.responseType === '' || req.responseType === 'document')
                        _this.responseXML = req.responseXML;
                    if (req.responseType === '' || req.responseType === 'text')
                        _this.responseText = req.responseText;
                    _this.loaded = len;

                    if (_this.onprogress)
                        _this.onprogress({
                            lengthComputable: true,
                            loaded: len,
                            total: len
                        });

                    if (_this.onload)
                        _this.onload({
                            type: "load",
                            target: _this,
                            currentTarget: _this,
                            bubbles: false,
                            cancelable: false,
                            lengthComputable: false,
                            loaded: len,
                            total: len
                        });

                    if (_this.onloadend)
                        _this.onloadend({
                            type: "loadend",
                            target: _this,
                            currentTarget: _this,
                            bubbles: false,
                            cancelable: false,
                            lengthComputable: false,
                            loaded: len,
                            total: len
                        });
                } catch (e) {
                    console.warn(e);
                }
            }
        };

        req.onerror = function (event) {
            if (_this.onerror)
                _this.onerror(event);
        };
        req.onabort = function (event) {
            if (_this.onabort)
                _this.onabort(event);
        };

        req.ontimeout = function (event) {
            if (_this.ontimeout)
                _this.ontimeout(event);
        }

        _this.innerXhr = req;
        req.send(body)
    }

    HiveProxyRequest.prototype.send = function (body) {

        try {
            // here we decide if we should handle it with HiveRequestFactory or internal XHR

            // const stringUrl = this.url.toString();
            // if (<CHECK>){
            //     internalSend(new HiveXMLHttpRequest(), this, body);
            // } else
            internalSend(new HiveXMLHttpRequest(), this, body);

        } catch (e) {
            console.error(e);
        }

    };


    HiveProxyRequest.prototype.abort = function () {
        if (this.innerXhr)
            this.innerXhr.abort();
        else {
            //TODO handle abort for async request
        }
    };


    // -------------------- PLAYER IMPLEMENTED CALLBACKS --------------- //
    HiveProxyRequest.prototype.onload = function () {
    };
    HiveProxyRequest.prototype.onloadend = function (event) {
    };
    HiveProxyRequest.prototype.onerror = function (event) {
    };
    HiveProxyRequest.prototype.onprogress = function (event) {
    };
    HiveProxyRequest.prototype.onreadystatechange = function () {
    };
    HiveProxyRequest.prototype.ontimeout = function (event) {
    };

    return HiveProxyRequest;
}());

// override normal XMLHttpRequest with our handler
const HiveXMLHttpRequest = window.XMLHttpRequest;
window.XMLHttpRequest = HiveProxyRequest;
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

declare let HiveRequestFactory;

class HiveProxyRequest {
    private parsedResponseHeaders = {};
    private headers: any;
    private responseHeaders: any;
    private mimetype: any;
    private pass: any;
    private user: any;
    private sync: any;
    private url: any;
    private method: any;
    private readyState: number;
    private timeout: any;
    private withCredentials: boolean;
    private responseType: string;
    private status: number;

    private innerXhr: any;

    constructor() {
        this.readyState = 0;
        this.status = 0;
        this.responseType = "";
        this.withCredentials = false;
        this.timeout = undefined;
    }

    // --------------------------- XMLHttpRequest signature methods ----------------------------//
    public open(method, url, sync, user, pass) {
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

        try {
            // here we decide if we should handle it with HiveRequestFactory or internal XHR
            if (typeof HiveRequestFactory !== 'undefined'){
                this.internalopen(new HiveRequestFactory());
            } else
            this.internalopen(new HiveOriginalXMLHttpRequest());
        } catch (e) {
            console.error(e);
        }
        console.info("OPEN: " + this.method + " " + this.url)
    };

    overrideMimeType(mimeType) {
        this.mimetype = mimeType;
    }

    getAllResponseHeaders() {
        return this.responseHeaders;
    };

    getResponseHeader(header) {

        if (!this.parsedResponseHeaders) {
            // parse once all the headers into a map
            if (this.responseHeaders) {
                const lines = this.responseHeaders.split('\n');
                lines.forEach(function (line) {
                    let keyValue = line.split(':');
                    this.parsedResponseHeaders[keyValue[0].trim()] = keyValue[1].trim();
                });
            }
        }

        return this.parsedResponseHeaders[header];
    };

    setRequestHeader(name, value) {
        if (!this.headers)
            this.headers = [];
        // console.info("HEADER " + name + " " + value);
        this.headers.push({ key: name, value: value });
    };

    private internalopen(req) {

        req.open(this.method, this.url, this.sync, this.user, this.pass);

        if (this.withCredentials)
            req.withCredentials = true;

        if (this.headers) {
            this.headers.forEach(function (elem) {
                req.setRequestHeader(elem.key, elem.value)
            })
        }

        if (this.responseType)
            req.responseType = this.responseType;

        if (this.mimetype)
            req.overrideMimeType(this.mimetype);

        if (this.timeout)
            req.timeout = this.timeout;

        req.onreadystatechange = function () {

            this.readyState = req.readyState;
            if (this.onreadystatechange)
                this.onreadystatechange({
                    currentTarget: this
                });

            if (req.readyState === 4) {

                try {
                    const len = req.loaded;
                    this.status = req.status;
                    this.statusText = req.statusText;
                    this.responseHeaders = req.getAllResponseHeaders();
                    this.response = req.response;
                    this.responseURL = req.responseURL;
                    if (req.responseType === '' || req.responseType === 'document')
                        this.responseXML = req.responseXML;
                    if (req.responseType === '' || req.responseType === 'text')
                        this.responseText = req.responseText;
                    this.loaded = len;

                    if (this.onprogress)
                        this.onprogress({
                            lengthComputable: true,
                            loaded: len,
                            total: len
                        });

                    if (this.onload)
                        this.onload({
                            type: "load",
                            target: this,
                            currentTarget: this,
                            bubbles: false,
                            cancelable: false,
                            lengthComputable: false,
                            loaded: len,
                            total: len
                        });

                    if (this.onloadend)
                        this.onloadend({
                            type: "loadend",
                            target: this,
                            currentTarget: this,
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
            if (this.onerror)
                this.onerror(event);
        };
        req.onabort = function (event) {
            if (this.onabort)
                this.onabort(event);
        };

        req.ontimeout = function (event) {
            if (this.ontimeout)
                this.ontimeout(event);
        }

        this.innerXhr = req;
    }

    send(body) {
        this.innerXhr.send(body);
    };


    public abort() {
        if (this.innerXhr)
            this.innerXhr.abort();
        else {
            // TODO handle abort for async request
        }
    };


    // -------------------- PLAYER IMPLEMENTED CALLBACKS --------------- //
    public onload(event: any) {
    };
    public onloadend(event: any) {
    };
    public onerror(event: any) {
    };
    public onprogress(event: any) {
    };
    public onreadystatechange(event: any) {
    };
    public ontimeout(event: any) {
    };

}

// override normal XMLHttpRequest with our handler
const HiveOriginalXMLHttpRequest = window['XMLHttpRequest'];
window['XMLHttpRequest'] = HiveProxyRequest;
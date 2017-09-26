/** ======================= XHR INTERCEPT =========================
 *
 * Override XMLHttpRequest with HiveXMLHttpRequest
 * HiveXMLHttpRequest implements the same API, and evaluates the requested url.
 * If the url matches a live video (metadata, audio, video)
 * it will forward the request to the content script through Hive Plugin.
 *
 * If the request is not a live video, it will be resolved using the
 * original XMLHttpRequest
 */

declare let HiveRequestFactory;

class HiveXMLHttpRequest {
  // -------------------  XHR Constants ---------------- //
  static DONE: number = XMLHttpRequest.DONE;
  static HEADERS_RECEIVED: number = XMLHttpRequest.HEADERS_RECEIVED;
  static LOADING: number = XMLHttpRequest.LOADING;
  static OPENED: number = XMLHttpRequest.OPENED;
  static UNSENT: number = XMLHttpRequest.UNSENT;

  parsedResponseHeaders = {};
  headers: any;
  responseHeaders: any;
  mimetype: any;
  pass: any;
  user: any;
  sync: any;
  url: any;
  method: any;
  readyState: number;
  timeout: any;
  upload: XMLHttpRequestUpload;
  msCachingEnabled: () => boolean;

  withCredentials: boolean;
  responseType: any;
  response: any;
  responseURL: string;
  responseXML: any;
  responseText: string;
  type: string;

  status: number;
  statusText: string;
  loaded: number;

  private innerXhr: any;

  constructor() {
    this.readyState = HiveXMLHttpRequest.UNSENT;
    this.status = 0;
    this.responseType = '';
    this.withCredentials = false;
    this.timeout = undefined;
    this.type = '';
  }

  // --------------------------- XMLHttpRequest signature methods ----------------------------//
  open(method, url, sync, user, pass) {
    try {
      // here we decide if we should handle it with HiveRequestFactory or internal XHR
      if (
        typeof HiveRequestFactory !== 'undefined' &&
        this.isVideoData(this.getBaseUrl(url.toLowerCase()))
      ) {
        this.innerXhr = new HiveRequestFactory();
        console.info('USING HiveRequestFactory', this.innerXhr);
      } else this.innerXhr = new HiveOriginalXMLHttpRequest();
      this.internalopen(method, url, sync, user, pass);
    } catch (e) {
      console.error(e);
    }
    console.info('OPEN: ' + this.method + ' ' + this.url);
  }

  overrideMimeType(mimeType) {
    this.mimetype = mimeType;
  }

  getAllResponseHeaders() {
    return this.responseHeaders;
  }

  getResponseHeader(header) {
    if (!this.parsedResponseHeaders) {
      // parse once all the headers into a map
      if (this.responseHeaders) {
        const lines = this.responseHeaders.split('\n');
        lines.forEach(function(line) {
          const keyValue = line.split(':');
          this.parsedResponseHeaders[keyValue[0].trim()] = keyValue[1].trim();
        });
      }
    }

    return this.parsedResponseHeaders[header];
  }

  setRequestHeader(name, value) {
    if (!this.headers) this.headers = [];
    // console.info("HEADER " + name + " " + value);
    this.headers.push({ key: name, value });
  }

  send(body) {
    if (this.withCredentials) this.innerXhr.withCredentials = true;

    if (this.responseType) this.innerXhr.responseType = this.responseType;

    if (this.mimetype) this.innerXhr.overrideMimeType(this.mimetype);

    if (this.timeout) this.innerXhr.timeout = this.timeout;

    if (this.type) this.innerXhr.type = this.type;

    this.innerXhr.send(body);
  }

  abort() {
    if (this.innerXhr) this.innerXhr.abort();
    else {
      // TODO handle abort for async request
    }
  }

  addEventListener() {}

  dispatchEvent(event: Event): boolean {
    return false;
  }

  removeEventListener() {}

  // -------------------- PLAYER IMPLEMENTED CALLBACKS --------------- //
  onload(event: any) {}
  onloadstart(event: any) {}
  onloadend(event: any) {}
  onerror(event: any) {}
  onprogress(event: any) {}
  onreadystatechange(event: any) {}
  ontimeout(event: any) {}
  onabort(event) {}

  // -------------------- PRIVATE CUSTOM METHODS ------ --------------- //

  private internalopen(method, url, sync, user, pass) {
    if (sync === void 0) {
      sync = true;
    }
    this.method = method;
    this.url = url;
    this.sync = sync;
    this.user = user;
    this.pass = pass;

    this.readyState = HiveXMLHttpRequest.OPENED;
    if (this.onreadystatechange)
      this.onreadystatechange({
        currentTarget: this,
      });

    this.innerXhr.open(this.method, this.url, this.sync, this.user, this.pass);

    if (this.headers) {
      this.headers.forEach(function(elem) {
        this.innerXhr.setRequestHeader(elem.key, elem.value);
      });
    }

    this.innerXhr.onreadystatechange = () => {
      this.readyState = this.innerXhr.readyState;
      if (this.onreadystatechange)
        this.onreadystatechange({
          currentTarget: this,
        });

      if (this.innerXhr.readyState === HiveXMLHttpRequest.DONE) {
        try {
          const len = this.innerXhr.loaded;
          this.status = this.innerXhr.status;
          this.statusText = this.innerXhr.statusText;
          this.responseHeaders = this.innerXhr.getAllResponseHeaders();
          this.response = this.innerXhr.response;
          this.responseURL = this.innerXhr.responseURL;
          if (
            this.innerXhr.responseType === '' ||
            this.innerXhr.responseType === 'document'
          )
            this.responseXML = this.innerXhr.responseXML;
          if (
            this.innerXhr.responseType === '' ||
            this.innerXhr.responseType === 'text'
          )
            this.responseText = this.innerXhr.responseText;
          this.loaded = len;

          if (this.onprogress)
            this.onprogress({
              lengthComputable: true,
              loaded: len,
              total: len,
            });

          if (this.onload)
            this.onload({
              type: 'load',
              target: this,
              currentTarget: this,
              bubbles: false,
              cancelable: false,
              lengthComputable: false,
              loaded: len,
              total: len,
            });

          if (this.onloadend)
            this.onloadend({
              type: 'loadend',
              target: this,
              currentTarget: this,
              bubbles: false,
              cancelable: false,
              lengthComputable: false,
              loaded: len,
              total: len,
            });
        } catch (e) {
          console.warn(e);
        }
      }
    };

    this.innerXhr.onerror = this.onerror;
    this.innerXhr.onabort = this.onabort;
    this.innerXhr.ontimeout = this.ontimeout;
  }

  private getBaseUrl(url: string) {
    const matches = url.match(/.+?(?=\?|$)/i);
    if (matches.length > 0) return matches[0];
    return null;
  }

  private isVideoData(url: string): boolean {
    const metadataExt: string = '.m3u8';
    const dataExt: string = '.ts';
    return (
      url &&
      (url.indexOf(metadataExt, url.length - metadataExt.length) >= 0 ||
        url.indexOf(dataExt, url.length - dataExt.length) >= 0)
    );
  }
}

// override normal XMLHttpRequest with our handler
const HiveOriginalXMLHttpRequest = XMLHttpRequest;
XMLHttpRequest = HiveXMLHttpRequest;

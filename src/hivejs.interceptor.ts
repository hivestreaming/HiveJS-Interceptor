const URI = require('urijs');
/**
 * ======================= XHR INTERCEPT =========================
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
declare var DATA_EXTENTION: string;
declare var METADATA_EXTENTION: string;

const StreamingData = {
  METADATA_EXTENTION: typeof METADATA_EXTENTION !== 'undefined' && METADATA_EXTENTION !== '' ? METADATA_EXTENTION : '.m3u8',
  DATA_EXTENTION: typeof DATA_EXTENTION !== 'undefined' && DATA_EXTENTION !== '' ? DATA_EXTENTION : '.ts'
}

console.warn(
  `GENERATING HIVE XHR INTERCEPTOR WITH PARAMTERS: METADATA_EXTENTION ${StreamingData.METADATA_EXTENTION} DATA_EXTENTION ${StreamingData.DATA_EXTENTION}`
);

// Implementing for now the XMLHttpRequest interface
// in order to fix any compliance issue
export class HiveXMLHttpRequest implements XMLHttpRequest {
  // ---------- XHR Constants ---------/
  readonly DONE: number = 4;
  readonly LOADING: number = 3;
  readonly HEADERS_RECEIVED: number = 2;
  readonly OPENED: number = 1;
  readonly UNSENT: number = 0;

  // --------------- XHR Properties ---------------- //
  readyState: number;
  response: any;
  responseText: string;
  responseType: any;
  responseURL: string;
  responseXML: Document;
  status: number;
  statusText: string;
  timeout: number;
  upload: XMLHttpRequestUpload;
  withCredentials: boolean;
  msCaching?: string;

  // ---------------- Custom Properties --------------//
  parsedResponseHeaders = {};
  headers: any;
  responseHeaders: any;
  mimetype: any;
  pass: any;
  user: any;
  sync: any;
  url: any;
  method: any;
  type: string;
  loaded: number;
  private innerXhr: any;

  constructor() {
    this.readyState = this.UNSENT;
    this.status = 0;
    this.responseType = '';
    this.withCredentials = false;
    this.timeout = 0;
    this.type = '';
  }

  // --------------------------- XMLHttpRequest signature methods ----------------------------//
  // reference: https://xhr.spec.whatwg.org/#the-open()-method
  open(method, url, sync = true, user = null, pass = null) {
    try {
      // here we decide if we should handle it with HiveRequestFactory or internal XHR
      const uri = new URI(url);
      if (
        typeof HiveRequestFactory !== 'undefined' &&
        this.isVideoData(uri.origin() + uri.pathname())
      )
        this.generateXHR('hive');
      else 
        this.generateXHR('original');
      
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
        lines.forEach(function (line) {
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

  msCachingEnabled(): boolean {
    return typeof this.msCaching !== 'undefined';
  }

  // ----------------  Other XHR methods inheritated by EventTarget -------------- //
  addEventListener() { }

  dispatchEvent(event: Event): boolean {
    return false;
  }

  removeEventListener() { }

  // -------------------- PLAYER IMPLEMENTED CALLBACKS --------------- //
  onload(event: ProgressEvent) { }
  onloadstart(event: ProgressEvent) { }
  onloadend(event: ProgressEvent) { }
  onerror(event: any) { }
  onprogress(event: ProgressEvent) { }
  ontimeout(event: ProgressEvent) { }
  onabort(event: ProgressEvent) { }
  onreadystatechange(event: Event) { }

  // -------------------- PRIVATE CUSTOM METHODS ---------------------- //

  private generateXHR(type: string) {

    if(type === 'original'){
      this.innerXhr = new window['HiveOriginalXMLHttpRequest']();
      console.info('USING Original XMLHttpRequest', this.innerXhr);
    }
    else{
      this.innerXhr = new HiveRequestFactory();
      console.info('USING HiveRequestFactory', this.innerXhr);
    }

    // Binding all the event handlers to the created XHR
    this.innerXhr.onload = (event: ProgressEvent) => {
      this.onload.call(this, event);
    }
    this.innerXhr.onreadystatechange = (event: ProgressEvent) => {
      this.readyState = this.innerXhr.readyState;

      if (this.innerXhr.readyState === this.DONE) {
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

          // if (this.onprogress)
          //   this.onprogress({
          //     lengthComputable: true,
          //     loaded: len,
          //     total: len,
          //   });
        } catch (e) {
          console.warn(e);
        }
      }
      this.onreadystatechange.call(this, event);
    }
    this.innerXhr.onloadstart = (event: ProgressEvent) => {
      this.onloadstart.call(this, event);
    }
    this.innerXhr.onloadend = (event: ProgressEvent) => {
      this.onloadend.call(this, event);
    }
    this.innerXhr.onerror = (event: ProgressEvent) => {
      this.onerror.call(this, event);
    }
    this.innerXhr.onprogress = (event: ProgressEvent) => {
      this.onprogress.call(this, event);
    }
    this.innerXhr.ontimeout = (event: ProgressEvent) => {
      this.ontimeout.call(this, event);
    }
    this.innerXhr.onabort = (event: ProgressEvent) => {
      this.onabort.call(this, event);
    }
  }

  private internalopen(method, url, sync, user, pass) {
    if (sync === void 0) {
      sync = true;
    }
    this.method = method;
    this.url = url;
    this.sync = sync;
    this.user = user;
    this.pass = pass;

    this.readyState = this.OPENED;

    this.innerXhr.open(this.method, this.url, this.sync, this.user, this.pass);

    if (this.headers) {
      this.headers.forEach(function (elem) {
        this.innerXhr.setRequestHeader(elem.key, elem.value);
      });
    }
  }

  private isVideoData(url: string): boolean {
    const metadataExt: string = StreamingData.METADATA_EXTENTION;
    const dataExt: string = StreamingData.DATA_EXTENTION;
    return (
      url &&
      (url.indexOf(metadataExt, url.length - metadataExt.length) >= 0 ||
        url.indexOf(dataExt, url.length - dataExt.length) >= 0)
    );
  }
}


// We are using these methods to override and recover the XMLHttpRequest default implementation, in this way we will need to use it just when a 
// HiveU Web session is initialized

function activateXHRInterceptor() {
  if (typeof window !== 'undefined') {
    window['HiveOriginalXMLHttpRequest'] = window['XMLHttpRequest'];
    window['XMLHttpRequest'] = HiveXMLHttpRequest;
  }
}

function deactivateXHRInterceptor() {
  if (typeof window !== 'undefined' && window['HiveOriginalXMLHttpRequest']) {
    window['XMLHttpRequest'] = window['HiveOriginalXMLHttpRequest'];
  }
}

if (typeof window !== 'undefined') {

  window['activateXHRInterceptor'] = activateXHRInterceptor;
  window['deactivateXHRInterceptor'] = deactivateXHRInterceptor;

}
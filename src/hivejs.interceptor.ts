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
let verbose: boolean = false;

const StreamingData = {
  METADATA_EXTENTION:
    typeof METADATA_EXTENTION !== 'undefined' && METADATA_EXTENTION !== ''
      ? METADATA_EXTENTION
      : '.m3u8',
  DATA_EXTENTION:
    typeof DATA_EXTENTION !== 'undefined' && DATA_EXTENTION !== ''
      ? DATA_EXTENTION
      : '.ts',
};

class HiveXMLHttpRequestUpload implements XMLHttpRequestUpload {
  onabort: (ev: ProgressEvent) => any = null;
  onerror: (ev: Event) => any = null;
  onload: (ev: ProgressEvent) => any = null;
  onloadend: (ev: ProgressEvent) => any = null;
  onloadstart: (ev: ProgressEvent) => any = null;
  onprogress: (ev: ProgressEvent) => any = null;
  ontimeout: (ev: ProgressEvent) => any = null;

  // N.B: we don't support this at the moment
  addEventListener<
    K extends
      | 'abort'
      | 'error'
      | 'load'
      | 'loadend'
      | 'loadstart'
      | 'progress'
      | 'timeout'
  >(
    type: K,
    listener: (
      this: XMLHttpRequestUpload,
      ev: XMLHttpRequestEventTargetEventMap[K]
    ) => {},
    useCapture?: boolean
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean
  ): void;
  addEventListener(type: any, listener: any, useCapture?: any) {
    throw new Error('Method not implemented.');
  }
  dispatchEvent(evt: Event): boolean {
    throw new Error('Method not implemented.');
  }
  removeEventListener(
    type: string,
    listener?: EventListenerOrEventListenerObject,
    options?: boolean | any
  ): void {
    throw new Error('Method not implemented.');
  }
}

// Implementing for now the XMLHttpRequest interface
// in order to fix any compliance issue
// tslint:disable-next-line:max-classes-per-file
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

  // This events are the one added before the actual open,
  // when the interceptor really creates the XHR Object
  private eventsToAdd: any;

  constructor() {
    this.readyState = this.UNSENT;
    this.status = 0;
    this.responseType = '';
    this.withCredentials = false;
    this.timeout = 0;
    this.type = '';
    this.upload = new HiveXMLHttpRequestUpload();
    this.eventsToAdd = {};
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
      else this.generateXHR('original');

      this.internalopen(method, url, sync, user, pass);
    } catch (e) {
      console.error(e);
    }
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
  }

  msCachingEnabled(): boolean {
    return typeof this.msCaching !== 'undefined';
  }

  // ----------------  Other XHR methods inheritated by EventTarget -------------- //

  // The addEventListener has two behaviour:
  // If the XHR is already created (ready state OPENED), it actually adds the listener to the event
  // If the XHR is not yet created it adds it in a list, so it will be added when generating the XHR
  addEventListener(eventName: string, handler: any) {
    if (this.readyState < this.OPENED) {
      if (this.eventsToAdd.hasOwnProperty(eventName))
        this.eventsToAdd[eventName].push(handler);
      else this.eventsToAdd[eventName] = [handler];
    } else if (this.innerXhr.addEventListener)
      this.innerXhr.addEventListener.call(this, eventName, handler);
  }

  // dispatch the event if and only if it has been created a XMLHTTPRequest for now
  dispatchEvent(event: Event): boolean {
    if (
      this.innerXhr &&
      this.innerXhr instanceof window['HiveOriginalXMLHttpRequest']
    )
      return this.innerXhr.dispatchEvent(event);
    else {
      console.log(
        'No Dispatch event is supported for the Hive Plugin Requests'
      );
    }
  }

  // The removeEventListener has two behaviour:
  // If the XHR is already created (ready state OPENED), it actually removes the listener to the event
  // If the XHR is not yet created it removes it form the add list
  removeEventListener(eventName: string, handler: any) {
    if (this.readyState < this.OPENED) {
      if (!this.eventsToAdd.hasOwnProperty(eventName)) return;
      const handlerIndex = this.eventsToAdd[eventName].indexOf(handler);
      if (handlerIndex !== -1)
        this.eventsToAdd[eventName].splice(handlerIndex, 1);
    } else if (this.innerXhr.removeEventListener)
      this.innerXhr.removeEventListener.call(this, eventName, handler);
  }

  // -------------------- PLAYER IMPLEMENTED CALLBACKS --------------- //
  onload(event: ProgressEvent) {}
  onloadstart(event: ProgressEvent) {}
  onloadend(event: ProgressEvent) {}
  onerror(event: any) {}
  onprogress(event: ProgressEvent) {}
  ontimeout(event: ProgressEvent) {}
  onabort(event: ProgressEvent) {}
  onreadystatechange(event: Event) {}

  // -------------------- PRIVATE CUSTOM METHODS ---------------------- //

  private generateXHR(type: string) {
    if (type === 'original') {
      this.debugLog('USING Original XMLHttpRequest', this.innerXhr);
      this.innerXhr = new window['HiveOriginalXMLHttpRequest']();
    } else {
      this.debugLog('USING HiveRequestFactory', this.innerXhr);
      this.innerXhr = new HiveRequestFactory();
    }

    // Binding all known/typical the event handlers to the created XHR
    this.innerXhr.onload = (event: ProgressEvent) => {
      if (typeof this.onload === 'function') {
        this.debugLog('onload: ', event);
        this.onload.call(this, event);
      }
    };
    this.innerXhr.onreadystatechange = (event: ProgressEvent) => {
      this.readyState = this.innerXhr.readyState;
      // UPDATING XHR DATA
      this.cloneXHRInternalStatus();
      if (typeof this.onreadystatechange === 'function') {
        this.debugLog('onreadystatechange: ', event);
        this.onreadystatechange.call(this, event);
      }
    };
    this.innerXhr.onloadstart = (event: ProgressEvent) => {
      if (typeof this.onloadstart === 'function') {
        this.debugLog('onloadstart: ', event);
        this.onloadstart.call(this, event);
      }
    };
    this.innerXhr.onloadend = (event: ProgressEvent) => {
      if (typeof this.onloadend === 'function') {
        this.debugLog('onloadend: ', event);
        this.onloadend.call(this, event);
      }
    };
    this.innerXhr.onerror = (event: ProgressEvent) => {
      if (typeof this.onerror === 'function') {
        this.debugLog('onerror: ', event);
        this.onerror.call(this, event);
      }
    };
    this.innerXhr.onprogress = (event: ProgressEvent) => {
      if (typeof this.onprogress === 'function') {
        this.debugLog('onprogress: ', event);
        this.onprogress.call(this, event);
      }
    };
    this.innerXhr.ontimeout = (event: ProgressEvent) => {
      if (typeof this.ontimeout === 'function') {
        this.debugLog('ontimeout: ', event);
        this.ontimeout.call(this, event);
      }
    };
    this.innerXhr.onabort = (event: ProgressEvent) => {
      if (typeof this.onabort === 'function') {
        this.debugLog('onabort: ', event);
        this.onabort.call(this, event);
      }
    };

    // binding all upload handlers if the xhr has an upload object
    if ('upload' in this.innerXhr) {
      this.innerXhr.upload.onabort = (ev: ProgressEvent) => {
        if (typeof this.upload.onabort === 'function')
          this.upload.onabort.call(this, ev);
      };
      this.innerXhr.upload.onerror = (ev: ErrorEvent) => {
        if (typeof this.upload.onerror === 'function')
          this.upload.onerror.call(this, ev);
      };
      this.innerXhr.upload.onload = (ev: ProgressEvent) => {
        if (typeof this.upload.onload === 'function')
          this.upload.onload.call(this, ev);
      };
      this.innerXhr.upload.onloadend = (ev: ProgressEvent) => {
        if (typeof this.upload.onloadend === 'function')
          this.upload.onloadend.call(this, ev);
      };
      this.innerXhr.upload.onloadstart = (ev: ProgressEvent) => {
        if (typeof this.upload.onloadstart === 'function')
          this.upload.onloadstart.call(this, ev);
      };
      this.innerXhr.upload.onprogress = (ev: ProgressEvent) => {
        if (typeof this.upload.onprogress === 'function')
          this.upload.onprogress.call(this, ev);
      };
      this.innerXhr.upload.ontimeout = (ev: ProgressEvent) => {
        if (typeof this.upload.ontimeout === 'function')
          this.upload.ontimeout.call(this, ev);
      };
    }

    // binding all custom event handlers
    if (this.eventsToAdd) {
      for (const eventName in this.eventsToAdd) {
        if (this.eventsToAdd.hasOwnProperty(eventName))
          for (const handler of this.eventsToAdd[eventName])
            this.innerXhr.addEventListener(eventName, handler);
      }
    }
  }

  private cloneXHRInternalStatus() {
    this.status = this.innerXhr.status;
    this.statusText = this.innerXhr.statusText;
    this.responseHeaders = this.innerXhr.getAllResponseHeaders();
    this.response = this.innerXhr.response;
    this.responseURL = this.innerXhr.responseURL;
    if (this.responseType === '' || this.responseType === 'document')
      this.responseXML = this.innerXhr.responseXML;
    if (this.responseType === '' || this.responseType === 'text')
      this.responseText = this.innerXhr.responseText;
    this.loaded = this.innerXhr.loaded;
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
      this.headers.forEach(function(elem) {
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

  private debugLog(message: string, data) {
    if (verbose) console.log('[HiveJSInterceptor] ' + message, data);
  }
}

// We are using these methods to override and recover the XMLHttpRequest default implementation, in this way we will need to use it just when a
// HiveU Web session is initialized

function activateXHRInterceptor(isVerbose: boolean = false) {
  verbose = isVerbose;
  if (verbose)
    console.warn(
      `ACTIVATING HIVE XHR INTERCEPTOR WITH PARAMTERS: METADATA_EXTENTION ${StreamingData.METADATA_EXTENTION} DATA_EXTENTION ${StreamingData.DATA_EXTENTION}`
    );
  if (typeof window !== 'undefined') {
    window['HiveOriginalXMLHttpRequest'] = window['XMLHttpRequest'];
    window['XMLHttpRequest'] = HiveXMLHttpRequest;
  }
}

function deactivateXHRInterceptor() {
  verbose = false;
  if (typeof window !== 'undefined' && window['HiveOriginalXMLHttpRequest']) {
    window['XMLHttpRequest'] = window['HiveOriginalXMLHttpRequest'];
  }
}

if (typeof window !== 'undefined') {
  window['activateXHRInterceptor'] = activateXHRInterceptor;
  window['deactivateXHRInterceptor'] = deactivateXHRInterceptor;
}

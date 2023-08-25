import { HiveXMLHttpRequest } from './hivejs.xhr.interceptor';

let verbose: boolean = false;

export function HiveFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new HiveXMLHttpRequest();

    xhr.responseType = 'arraybuffer';
    xhr.open(init?.method || 'GET', input);

    if (typeof init?.headers == 'object') {
      for (const header in init?.headers) {
        xhr.setRequestHeader(header, init.headers[header]);
      }
    }

    xhr.onload = () => {
      console.log('@@@ Intercepted Fetch Request @@@', input);

      let responseHeaders = {};
      const lines = xhr.getAllResponseHeaders().trim().split('\n');
      lines.forEach((line: string) => {
        const keyValue = line.split(':');
        responseHeaders[keyValue[0].trim()] = keyValue[1].trim();
      });

      resolve(
        new Response(xhr.response, {
          headers: responseHeaders,
          status: xhr.status,
          statusText: xhr.statusText,
        })
      );
    };

    xhr.onerror = () => {
      reject({
        status: xhr.status,
        statusText: xhr.statusText,
      });
    };

    xhr.send(init?.body);
    
    window['fetchInnerXhr'] = xhr;
  });
}

function activateFetchInterceptor(isVerbose: boolean = false) {
  verbose = isVerbose;

  if (verbose && typeof console !== 'undefined') {
    console.log(`ACTIVATING HIVE FETCH INTERCEPTOR`);
  }

  if (typeof window !== 'undefined') {
    window['HiveOriginalXMLHttpRequest'] = window['XMLHttpRequest'];
    window['HiveOriginalFetch'] = window['fetch'];
    window['fetch'] = HiveFetch;
  }
}

function deactivateFetchInterceptor() {
  verbose = false;
  if (typeof window !== 'undefined' && window['HiveOriginalFetch']) {
    window['fetch'] = window['HiveOriginalFetch'];
  }
}

if (typeof window !== 'undefined') {
  window['activateFetchInterceptor'] = activateFetchInterceptor;
  window['deactivateFetchInterceptor'] = deactivateFetchInterceptor;
}
// tslint:disable-next-line:interface-name
interface Window {
  activateXHRInterceptor: any;
  deactivateXHRInterceptor: any;
  HiveOriginalXMLHttpRequest: any;
  jQuery: any;
}

declare var window: Window;
declare var sinon: any;
chai.should();

function xhrGenAndSend(responseType: string = ''): Promise<any[]> {
  const statusesList = [];

  const allDonePromise = new Promise<any[]>((resolve, reject) => {
    const testXhr: any = new XMLHttpRequest();
    testXhr.onreadystatechange = event => {
      console.log('event', event);

      const xhrStatus = {
        readyState: testXhr.readyState,
        response: testXhr.response,
        responseType: testXhr.responseType,
        responseURL: testXhr.responseURL,
        status: testXhr.status,
        statusText: testXhr.statusText,
        timeout: testXhr.timeout,
        withCredentials: testXhr.withCredentials,
      };

      if (this.responseType === '' || this.responseType === 'text')
        xhrStatus['responseText'] = testXhr.responseText;

      if (this.responseType === '' || this.responseType === 'document')
        xhrStatus['responseXML'] = testXhr.responseXML;

      statusesList.push(xhrStatus);

      if (event.currentTarget.readyState === 4) {
        console.log('STATUSES: ', statusesList);
        resolve(statusesList);
      }
    };

    testXhr.open('GET', 'http://ams-live.hivestreaming.com/manifest.m3u8');
    testXhr.responseType = responseType;

    testXhr.send();
  });

  return allDonePromise;
}

describe('Generic Tests for HiveJS XHR Interceptor:', () => {
  it('by default the interceptor is deactivated even when opening a manifest or fragment', () => {
    XMLHttpRequest['name'].should.equal('XMLHttpRequest');
    const testXhr: any = new XMLHttpRequest();
    testXhr.open('GET', 'http://test.fakedomain.com/fakemanifest.m3u8');
    testXhr.should.not.have.property('innerXhr');
  });

  it('can be activated and the fragments and manifest will be handled with the usual XMLHttpRequest', () => {
    window.activateXHRInterceptor();
    XMLHttpRequest['name'].should.equal('HiveXMLHttpRequest');
    const testXhr: any = new XMLHttpRequest();
    testXhr.open('GET', 'http://test.fakedomain.com/fakemanifest.m3u8');
    testXhr.should.have.property('innerXhr');
    testXhr.innerXhr.should.be.an.instanceof(window.HiveOriginalXMLHttpRequest);
    window.deactivateXHRInterceptor();
  });

  it('can be activated and deactivated and the basic XMLHttpRequest is restored', () => {
    XMLHttpRequest['name'].should.equal('XMLHttpRequest');

    window.activateXHRInterceptor();
    XMLHttpRequest['name'].should.equal('HiveXMLHttpRequest');

    window.deactivateXHRInterceptor();
    XMLHttpRequest['name'].should.equal('XMLHttpRequest');
  });

  it('has the same statuses as a normal XHR when activated and going thorugh the all open-send workflow', () => {
    window.activateXHRInterceptor();

    return xhrGenAndSend().then(interceptorStatuses => {
      window.deactivateXHRInterceptor();

      return xhrGenAndSend().then(normalStatuses => {
        chai.expect(normalStatuses.length).equal(interceptorStatuses.length);
        // tslint:disable-next-line:forin
        for (const index in normalStatuses) {
          console.log('normal Statuses', JSON.stringify(normalStatuses[index]));
          console.log(
            'Interceptor Statuses',
            JSON.stringify(interceptorStatuses[index])
          );
          chai
            .expect(normalStatuses[index])
            .to.deep.equal(interceptorStatuses[index]);
        }
      });
    });
  });

  it('has the same statuses as a normal XHR when activated and going thorugh the all open-send workflow wiht arraybuffer type', () => {
    window.activateXHRInterceptor();

    return xhrGenAndSend('arraybuffer').then(interceptorStatuses => {
      window.deactivateXHRInterceptor();

      return xhrGenAndSend('arraybuffer').then(normalStatuses => {
        chai.expect(normalStatuses.length).equal(interceptorStatuses.length);
        // tslint:disable-next-line:forin
        for (const index in normalStatuses) {
          console.log('normal Statuses', JSON.stringify(normalStatuses[index]));
          console.log(
            'Interceptor Statuses',
            JSON.stringify(interceptorStatuses[index])
          );
          chai
            .expect(normalStatuses[index])
            .to.deep.equal(interceptorStatuses[index]);

          // for the array buffer we also check that the data in response is equal to both normal xhr and interceptor
          if (index === '3') {
            chai
              .expect(normalStatuses[index].response)
              .to.be.an.instanceof(ArrayBuffer);
            chai
              .expect(interceptorStatuses[index].response)
              .to.be.an.instanceof(ArrayBuffer);
            chai
              .expect(normalStatuses[index].response.length)
              .to.be.equal(interceptorStatuses[index].response.length);
          }
        }
      });
    });
  });

  it('change the xhr settings of jquery when activated and restores it when disactivated', () => {

    const originalXHR = window.jQuery.ajaxSettings.xhr();

    window.activateXHRInterceptor();

    const hiveOriginalXHR = window.jQuery.ajaxSettings.xhr();
    chai.expect(window.jQuery.ajaxSettings.xhr.toString()).to.contain('return new window[\'HiveOriginalXMLHttpRequest\']();');

    window.deactivateXHRInterceptor();

    const restoredOriginalXHR = window.jQuery.ajaxSettings.xhr();
    chai.expect(window.jQuery.ajaxSettings.xhr.toString()).to.contain('return new window[\'XMLHttpRequest\']();');

    chai.expect(originalXHR).to.be.an.instanceof(XMLHttpRequest)
    chai.expect(hiveOriginalXHR).to.be.an.instanceof(XMLHttpRequest)
    chai.expect(restoredOriginalXHR).to.be.an.instanceof(XMLHttpRequest)

  });

  it('it doesn\'t intercept jquery ajax requests', () => {
    window.activateXHRInterceptor();
    const sandbox = sinon.sandbox.create();
    const openSpy = sandbox.spy(
      XMLHttpRequest.prototype,
      'open'
    );
    window.jQuery.ajax({
      method: 'GET',
      url: 'http://ams-live.hivestreaming.com/manifest.m3u8',
    });

    // tslint:disable-next-line:no-unused-expression
    chai.expect(openSpy.notCalled).to.be.true;
    sandbox.restore();
  });
});

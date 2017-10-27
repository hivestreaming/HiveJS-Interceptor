// tslint:disable-next-line:interface-name
interface Window {
  activateXHRInterceptor: any;
  deactivateXHRInterceptor: any;
  HiveOriginalXMLHttpRequest: any;
}
declare var window: Window;
chai.should();

function xhrGenAndSend(done?) {
  const testXhr: any = new XMLHttpRequest();
  const statusesList = [];
  testXhr.onreadystatechange = event => {
    console.log('event', event);

    statusesList.push({
      readyState: testXhr.readyState,
      response: testXhr.response,
      responseText: testXhr.responseText,
      responseType: testXhr.responseType,
      responseURL: testXhr.responseURL,
      responseXML: testXhr.responseXML,
      status: testXhr.status,
      statusText: testXhr.statusText,
      timeout: testXhr.timeout,
      upload: testXhr.upload,
      withCredentials: testXhr.withCredentials,
    });

    if (event.currentTarget.readyState === 4) {
      console.log('STATUSES: ', statusesList);
      if (done) done();
    }
  };

  testXhr.open('GET', 'http://ams-live.hivestreaming.com/manifest.m3u8');

  testXhr.send();
}

describe('Generic Tests for HiveJS XHR Interceptor:', () => {
  describe('when no plugin is availalbe', () => {
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
      testXhr.innerXhr.should.be.an.instanceof(
        window.HiveOriginalXMLHttpRequest
      );
      window.deactivateXHRInterceptor();
    });

    it('can be activated and deactivated and the basic XMLHttpRequest is restored', () => {
      XMLHttpRequest['name'].should.equal('XMLHttpRequest');

      window.activateXHRInterceptor();
      XMLHttpRequest['name'].should.equal('HiveXMLHttpRequest');

      window.deactivateXHRInterceptor();
      XMLHttpRequest['name'].should.equal('XMLHttpRequest');
    });

    it('has the same statuses as a normal XHR when activated and going thorugh the all open-send workflow', done => {
      window.activateXHRInterceptor();

      xhrGenAndSend();

      window.deactivateXHRInterceptor();

      xhrGenAndSend(done);
    });
  });
});

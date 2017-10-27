// tslint:disable-next-line:interface-name
interface Window {
  activateXHRInterceptor: any;
  deactivateXHRInterceptor: any;
  HiveOriginalXMLHttpRequest: any;
}
declare var window: Window;
chai.should();

describe('Generic Tests for HiveJS XHR Interceptor:', () => {
  describe('when no plugin is availalbe', () => {
    it('by default the interceptor is deactivated even when opening a manifest or fragment', () => {
      XMLHttpRequest['name'].should.equal('XMLHttpRequest');
      const testXhr: any = new XMLHttpRequest();
      testXhr.open('GET', 'http://test.fakedomain.com/fakemanifest.m3u8');
      testXhr.should.not.have.property('innerXhr');
    });

    it('can be activated and the fragments and manifest will be correctly intercepted', () => {
      window.activateXHRInterceptor();
      XMLHttpRequest['name'].should.equal('HiveXMLHttpRequest');
      const testXhr: any = new XMLHttpRequest();
      testXhr.open('GET', 'http://test.fakedomain.com/fakemanifest.m3u8');
      testXhr.should.have.property('innerXhr');
      testXhr.innerXhr.should.be.an.instanceof(
        window.HiveOriginalXMLHttpRequest
      );
    });
  });
});



describe('Generic Tests for HiveJS XHR Interceptor:', () => {
  describe('when no plugin is availalbe', () => {
    it('opening a manifest or fragment URL will generate a normal XHR', () => {
		XMLHttpRequest['name'].should.equal('HiveXMLHttpRequest')
	  const testXhr = new XMLHttpRequest();
	  testXhr.open('GET', 'http://test.fakedomain.com/fakemanifest.m3u8');
    });
  });
});

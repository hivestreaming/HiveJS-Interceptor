import { expect, should } from 'chai';
import 'whatwg-fetch';
import '../src/hivejs.fetch.interceptor';
window.fetch = fetch


interface window {
  activateFetchInterceptor: any;
  deactivateFetchInterceptor: any;
  HiveOriginalXMLHttpRequest: any;
}

declare var window: Window;
should();


describe('Generic Tests for HiveJS XHR Interceptor:', () => {
  it('by default the interceptor is deactivated even when opening a manifest or fragment', async () => {
    window.fetch['name'].should.equal('fetch');
    const url = "https://streams.hivestreaming.com/wams/live/llama-drama-720p-140-350-850-1700-no-audio.ism/manifest(format=mpd-time-csf)"
    const test = await window.fetch(url);
    test.url.should.equal(url)
  });

  it('can be activated and the fragments and manifest will be handled with the usual XMLHttpRequest', async () => {
    window['activateFetchInterceptor']();
    window.fetch['name'].should.equal('HiveFetch');
    const url = "https://streams.hivestreaming.com/wams/live/llama-drama-720p-140-350-850-1700-no-audio.ism/manifest(format=mpd-time-csf)"
    const test = await window.fetch(url);
    test.url.should.not.equal(url)
    window['fetchInnerXhr'].innerXhr.should.be.an.instanceof(window['XMLHttpRequest']);
    window['deactivateFetchInterceptor']();
  });

  it('can be activated and deactivated and the basic XMLHttpRequest is restored', () => {
    window.fetch['name'].should.equal('fetch');

    window['activateFetchInterceptor']();
    window.fetch['name'].should.equal('HiveFetch');

    window['deactivateFetchInterceptor']();
    window.fetch['name'].should.equal('fetch');
  });
  
  it('has the same response as a normal fetch call when activated', async () => {
    window['activateFetchInterceptor']();
    window.fetch['name'].should.equal('HiveFetch');
    const url = "https://streams.hivestreaming.com/wams/live/llama-drama-720p-140-350-850-1700-no-audio.ism/manifest(format=mpd-time-csf)"
    const fetchTest = await window.fetch(url);
    fetchTest.url.should.not.equal(url)
    window['deactivateFetchInterceptor']();

    window.fetch['name'].should.equal('fetch');
    const normalTest = await window.fetch(url);
    normalTest.url.should.equal(url)
    expect(fetchTest.status).equal(normalTest.status)
    expect(fetchTest.statusText).equal(normalTest.statusText)
    expect(fetchTest.ok).equal(normalTest.ok)
    expect(fetchTest.body).equal(normalTest.body)
    expect(fetchTest.bodyUsed).equal(normalTest.bodyUsed)
    expect(fetchTest.type).equal(normalTest.type)
    expect(fetchTest.url).not.equal(normalTest.url)
  });

});

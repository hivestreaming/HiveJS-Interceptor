[![Build Status](https://travis-ci.org/{{github-user-name}}/{{github-app-name}}.svg?branch=master)](https://travis-ci.org/{{github-user-name}}/{{github-app-name}}.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/{{github-user-name}}/{{github-app-name}}/badge.svg?branch=master)](https://coveralls.io/github/{{github-user-name}}/{{github-app-name}}?branch=master)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

# Hive Interceptor

 Override XMLHttpRequest with HiveXMLHttpRequest
 HiveXMLHttpRequest implements the same API, and evaluates the requested url.
 If the url matches a live video (metadata, audio, video)
 it will forward the request to the content script through postMessage api.
 
 If the request is not a live video, it will be resolved using the
 original XMLHttpRequest
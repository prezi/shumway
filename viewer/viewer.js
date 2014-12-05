/*
 * Copyright 2013 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var release = false;
var SHUMWAY_ROOT = "../build/web/src/";

var viewerPlayerglobalInfo = {
  abcs: "../build/playerglobal/playerglobal.abcs",
  catalog: "../build/playerglobal/playerglobal.json"
};

var avm2Root = SHUMWAY_ROOT + "avm2/";
var builtinPath = avm2Root + "generated/builtin/builtin.abc";
var avm1Path = avm2Root + "generated/avm1lib/avm1lib.abc";

var easelHost;
var bgcolor = 0;


function parseQueryString(qs) {
  if (!qs)
    return {};

  if (qs.charAt(0) == '?')
    qs = qs.slice(1);

  var values = qs.split('&');
  var obj = {};
  for (var i = 0; i < values.length; i++) {
    var kv = values[i].split('=');
    var key = kv[0], value = kv[1];
    obj[decodeURIComponent(key)] = decodeURIComponent(value);
  }

  return obj;
}

function getPluginParams() {
  var params = parseQueryString(window.location.search);
  return {
    baseUrl: params.base || document.location.href,
    url: params.swf,
    movieParams: {},
    objectParams: {},
    compilerSettings: {
      sysCompiler: true,
      appCompiler: true,
      verifier: true,
      forceHidpi: (typeof params.forceHidpi === "undefined") ? false : !!params.forceHidpi
    }
  };
}

function runViewer() {
  var flashParams = getPluginParams();
  flashParams.bgcolor = bgcolor;
  if (!flashParams.url) {
    console.log("no movie url provided -- stopping here");
    return;
  }

  window.addEventListener('load', function () {
    var playerWindow = window;
    var easel = createEasel(bgcolor);
    easelHost = new Shumway.GFX.Window.WindowEaselHost(easel, window, window);


    var data = {
      type: 'runSwf',
      settings: Shumway.Settings.getSettings(),
      flashParams: flashParams
    };

    if (data.settings) {
      Shumway.Settings.setSettings(data.settings);
    }
    runSwfPlayer(data.flashParams);

  });
}

function createEasel() {
  var Easel = Shumway.GFX.Easel;
  Shumway.GFX.WebGL.SHADER_ROOT = SHUMWAY_ROOT + "gfx/gl/shaders/";
  return new Easel(document.getElementById("stageContainer"));
}

document.addEventListener("DOMContentLoaded", runViewer);

/*
 * viewerPlayer.js
 */

/*
 * Copyright 2013 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

window.print = function (msg) {
  console.log(msg);
};

Shumway.Telemetry.instance = {
  reportTelemetry: function (data) { }
};

Shumway.FileLoadingService.instance = {
  createSession: function () {
    return {
      open: function (request) {
        var self = this;
        var path = Shumway.FileLoadingService.instance.resolveUrl(request.url);
        console.log('FileLoadingService: loading ' + path + ", data: " + request.data);
        var BinaryFileReader = Shumway.BinaryFileReader;
        new BinaryFileReader(path, request.method, request.mimeType, request.data).readAsync(
          function (data, progress) {
            self.onprogress(data, {bytesLoaded: progress.loaded, bytesTotal: progress.total});
          },
          function (e) { self.onerror(e); },
          self.onopen,
          self.onclose,
          self.onhttpstatus);
      }
    };
  },
  setBaseUrl: function (url) {
    var baseUrl;
    if (typeof URL !== 'undefined') {
      baseUrl = new URL(url, document.location.href).href;
    } else {
      var a = document.createElement('a');
      a.href = url || '#';
      a.setAttribute('style', 'display: none;');
      document.body.appendChild(a);
      baseUrl = a.href;
      document.body.removeChild(a);
    }
    Shumway.FileLoadingService.instance.baseUrl = baseUrl;
    return baseUrl;
  },
  resolveUrl: function (url) {
    var base = Shumway.FileLoadingService.instance.baseUrl || '';
    if (typeof URL !== 'undefined') {
      return new URL(url, base).href;
    }

    if (url.indexOf('://') >= 0) {
      return url;
    }

    base = base.lastIndexOf('/') >= 0 ? base.substring(0, base.lastIndexOf('/') + 1) : '';
    if (url.indexOf('/') === 0) {
      var m = /^[^:]+:\/\/[^\/]+/.exec(base);
      if (m) base = m[0];
    }
    return base + url;
  }
};

function runSwfPlayer(flashParams) {
  var EXECUTION_MODE = Shumway.AVM2.Runtime.ExecutionMode;

  var compilerSettings = flashParams.compilerSettings;
  var sysMode = compilerSettings.sysCompiler ? EXECUTION_MODE.COMPILE : EXECUTION_MODE.INTERPRET;
  var appMode = compilerSettings.appCompiler ? EXECUTION_MODE.COMPILE : EXECUTION_MODE.INTERPRET;
  var asyncLoading = false;
  var baseUrl = flashParams.baseUrl;
  var movieParams = flashParams.movieParams;
  var objectParams = flashParams.objectParams;
  var movieUrl = flashParams.url;

  Shumway.createAVM2(builtinPath, viewerPlayerglobalInfo, sysMode, appMode, function (avm2) {
    new Shumway.BinaryFileReader(movieUrl).readAll(null, function(buffer, error) {
      var file = Shumway.FileLoadingService.instance.setBaseUrl(baseUrl);
      if (!buffer) {
        throw "Unable to open the file " + file + ": " + error;
      }
      var player = new Shumway.Player.Window.WindowPlayer(window, window);
      player.defaultStageColor = flashParams.bgcolor;
      player.load(movieUrl, buffer);
    });
  });
}

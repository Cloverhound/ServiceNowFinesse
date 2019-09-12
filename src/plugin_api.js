const PluginApi = {
  hideWindow: hideWindow,
  showWindow: showWindow,
  callStarted: callStarted,
  callEnded: callEnded,
  screenPop: screenPop,
  popRecord: popRecord,
}

function showWindow() {
  console.log("Showing Finesse window");
  parent.window.postMessage({
    type: 'show'
  }, '*');
}

function hideWindow() {
  console.log("Hiding Finesse window");
  parent.window.postMessage({
    type: 'hide'
  }, '*');
}

function callStarted(call) {
  console.log("Sending call started event:", call);
  parent.window.postMessage({
    type: 'callStarted',
    call: JSON.parse(JSON.stringify(call))
  }, '*');
}

function callEnded(call) {
  console.log("Sending call ended event:", call);
  parent.window.postMessage({
    type: 'callEnded',
    call: JSON.parse(JSON.stringify(call))
  }, '*');
}





function screenPop(call, auto) {
    var popData = {
        call: call,
        agent: {
            username: window.Finesse.agent.username,
            extension: window.Finesse.agent.extension
        },
        manual: auto !== true
    }

    if(!auto && window.FinessePlugin.config.manualScreenPopInNewWindow == "true") {
        popData.newWindow = true;
    }

    if (auto) {
        window.Finesse.agent.lastPopped = call.id;
    }

    console.log("Screen-popping data:", popData);
    parent.window.postMessage({
      type: 'screenPop',
      popData: popData
    }, '*');

    call.alreadyPopped = true;

    if (auto && window.FinessePlugin.config.showCallerInfoOnScreenPop == "true") {
      window.Finesse.agent.currentTab = window.tabNames.CALLER;
      window.rerender(window.Finesse.agent);
    }
  }

  function popRecord(type, id) {
    console.log("Popping record:", type, id);
    parent.window.postMessage({
      type: 'popRecord',
      record: {
          type: type,
          id: id
      }
    }, '*');
  }

  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

export default PluginApi;

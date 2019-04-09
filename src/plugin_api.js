const PluginApi = {
    screenPop: screenPop,
    popRecord: popRecord
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
        
    if(!auto && window.FinesseConfig.config.manualScreenPopInNewWindow == "true") {
        popData.newWindow = true;
        //let topDomain = getParameterByName("topDomain");
        //console.log('TOP DOMAIN', topDomain);
        //window.open(topDomain + '/nav_to.do?uri=/' + window.entityTemplate + '.do?' + query);
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

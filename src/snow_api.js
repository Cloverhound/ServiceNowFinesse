const SnowApi = {
    screenPop: screenPop
}

function screenPop(call) {
    console.log("Screenpopping:");
    
    var query = window.queryTemplate;
    var entity = window.entityTemplate;

    for (const [name, value] of Object.entries(call.callVariables)) {
        query = query.replace("{{" + name + "}}", value);
        entity = entity.replace("{{" + name + "}}", value);
    }

    query = query.replace("{{from}}", call.from);
    entity = entity.replace("{{from}}", call.from);

    query = query.replace("{{to}}", call.to);
    entity = entity.replace("{{to}}", call.to);

    query = query.replace("{{direction}}", call.direction);
    entity = entity.replace("{{direction}}", call.direction);

    query = query.replace("{{username}}", window.Finesse.agent.username);
    entity = entity.replace("{{username}}", window.Finesse.agent.username);

    query = query.replace("{{extension}}", window.Finesse.agent.extension);
    entity = entity.replace("{{extension}}", window.Finesse.agent.extension);


    console.log('Opening Service Now Form')
    console.log('entity', window.entityTemplate)
    console.log('query', query)
    if(window.OpenFrame.config.manualScreenPopInNewWindow == "true") {
        let topDomain = getParameterByName("topDomain");
        console.log('TOP DOMAIN', topDomain);
        window.open(topDomain + '/nav_to.do?uri=/' + window.entityTemplate + '.do?' + query);
    } else {
        window.openFrameAPI.openServiceNowForm({entity: window.entityTemplate, query: query });
    }

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

export default SnowApi;

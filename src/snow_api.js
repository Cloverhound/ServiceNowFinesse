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

    window.openFrameAPI.openServiceNowForm({entity: window.entityTemplate, query: query });
  }

export default SnowApi;
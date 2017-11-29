import $ from "jquery";


const FinesseStateApi = {
  ready: ready,
  notReady: notReady,
  logout: logout
}


function ready(agent) {
  console.log("Running ready...");

  var xml = '<User>' +
            ' <state>READY</state>' +
            '</User>';

  $.ajax({
    url: '/finesse/api/User/' + agent.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, agent.password));
    },
    success: function(data) {
      console.log(data);
    },
    error: function(jqXHR, textStatus) {
      alert("Failed to set state to ready: ", textStatus);
      console.log("Failed to set state to ready: ", textStatus);
    }
  });
}

function findNotReadyReasonCodeByLabel(label, notReadyReasonCodes) {
  console.log("Finding reason code by label: " + label);
  for(var i = 0; i < notReadyReasonCodes.length; i++) {
    var reasonCode = notReadyReasonCodes[i];
    if(reasonCode.label === label) {
      console.log("Returning reason code: ", JSON.stringify(reasonCode));
      return reasonCode;
    }
  }
  return false;
}


function notReady(agent, label) {
  console.log("Running not ready with label: " + label);

  var xml = '<User>' +
            ' <state>NOT_READY</state>' +
            '</User>';

  if(label) {
    var reasonCode = findNotReadyReasonCodeByLabel(label, agent.notReadyReasonCodes);
    var reasonCodeId = reasonCode.uri.split("/").pop();
    xml = '<User>' +
              ' <state>NOT_READY</state>' +
              ' <reasonCodeId>' + reasonCodeId + '</reasonCodeId>' +
              '</User>';
  }

  console.log("Sending not ready xml: " + xml);


  $.ajax({
    url: '/finesse/api/User/' + agent.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, agent.password));
    },
    success: function(data) {
      console.log(data);

    },
    error: function(jqXHR, textStatus) {
      alert("Failed to set state to not_ready: ", textStatus);
      console.log("Failed to set state to not_ready: ", textStatus);
    }
  });
}


function logout(agent) {
  console.log("Logging out...");
  agent.loggingOut = true;
  window.rerender(agent);

  var xml = '<User>' +
            ' <state>LOGOUT</state>' +
            '</User>';

  $.ajax({
    url: '/finesse/api/User/' + agent.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, agent.password));
    },
    success: function(data) {
      console.log("Successfully logged out");
      console.log(data);
    },
    error: function(jqXHR, statusText) {
      console.log("Failed to logout: ", statusText);
    }
  });
}

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

export default FinesseStateApi;

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
    url: window.finesseUrl + '/finesse/api/User/' + agent.username,
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

function findReasonCodeByLabel(label, reasonCodes) {
  console.log("Finding reason code by label: " + label);
  for(var i = 0; i < reasonCodes.length; i++) {
    var reasonCode = reasonCodes[i];
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
    var reasonCode = findReasonCodeByLabel(label, agent.notReadyReasonCodes);
    var reasonCodeId = reasonCode.uri.split("/").pop();
    xml = '<User>' +
              ' <state>NOT_READY</state>' +
              ' <reasonCodeId>' + reasonCodeId + '</reasonCodeId>' +
              '</User>';
  }

  console.log("Sending not ready xml: " + xml);


  $.ajax({
    url: window.finesseUrl + '/finesse/api/User/' + agent.username,
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


function logout(agent, label) {
  console.log("Logging out...");

  if(agent.state === "READY") {
    alert("Must be in a NOT READY state to logout");
    return;
  }

  agent.loggingOut = true;
  window.rerender(agent);

  var xml = '<User>' +
            ' <state>LOGOUT</state>' +
            '</User>';

  if(label) {
    var reasonCode = findReasonCodeByLabel(label, agent.signOutReasonCodes);
    var reasonCodeId = reasonCode.uri.split("/").pop();
    xml = '<User>' +
              ' <state>LOGOUT</state>' +
              ' <reasonCodeId>' + reasonCodeId + '</reasonCodeId>' +
              '</User>';
  }


  $.ajax({
    url: window.finesseUrl + '/finesse/api/User/' + agent.username,
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

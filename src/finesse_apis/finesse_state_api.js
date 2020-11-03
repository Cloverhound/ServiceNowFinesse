import $ from "jquery";
import xmlToJSON from "../vendor/xmlToJSON";
import Finesse from './finesse_api';

const FinesseStateApi = {
  ready: ready,
  notReady: notReady,
  notReadyByCode: notReadyByCode,
  logout: logout,
  updateAgentState: updateAgentState
}


function ready(agent) {
  console.log("Running ready...");

  var xml = '<User>' +
            ' <state>READY</state>' +
            '</User>';

  $.ajax({
    url: Finesse.url.full + '/finesse/api/User/' + agent.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
    },
    success: function(data) {
      console.log(data);
    },
    error: function(jqXHR, status, err) {
      console.error("Error setting state to Ready:", status, err);
      window.reportError("Error setting state to Ready: " + status + ", " + err);

      alert("Failed to set state to Ready: ", status);
    }
  });
}

function updateAgentState(callback) {
  $.ajax({
    url: Finesse.url.full + '/finesse/api/User/' + Finesse.agent.username,
    type: "GET",
    cache: false,
    dataType: "text",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(Finesse.agent.username, Finesse.password));
    },
    success: function(xml) {
      console.log(xml);
      var data = xmlToJSON.parseString(xml, { childrenAsArray: false });
      console.log("Got agent update after login:", data);
      window.handleUserUpdate(data.User);

      if (callback)
        callback();
    },
    error: function(jqXHR, status, err) {
      console.error("Error updating agent state:", status, err);
      window.reportError("Error updating agent state: " + status + ", " + err);
      // TODO handle?
    }
  });
}

function findReasonCodeByCode(code, reasonCodes) {
  console.log("Finding reason code by code: " + code);
  for(var i = 0; i < reasonCodes.length; i++) {
    var reasonCode = reasonCodes[i];
    if(reasonCode.code === code) {
      console.log("Returning reason code: ", JSON.stringify(reasonCode));
      return reasonCode;
    }
  }
  return false;
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

  sendNotReady(agent, xml);
}

function notReadyByCode(agent, code) {
  console.log("Running not ready with code: " + code);

  var xml = '<User>' +
            ' <state>NOT_READY</state>' +
            '</User>';

  if(code) {
    var reasonCode = findReasonCodeByCode(code, agent.notReadyReasonCodes);
    var reasonCodeId = reasonCode.uri.split("/").pop();
    xml = '<User>' +
              ' <state>NOT_READY</state>' +
              ' <reasonCodeId>' + reasonCodeId + '</reasonCodeId>' +
              '</User>';
  }

  sendNotReady(agent, xml);
}

function sendNotReady(agent, xml) {
  console.log("Sending not ready xml: " + xml);

  $.ajax({
    url: Finesse.url.full + '/finesse/api/User/' + agent.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
    },
    success: function(data) {
      console.log(data);

    },
    error: function(jqXHR, status, err) {
      console.error("Error setting state to NOT_READY:", status, err);
      window.reportError("Error setting state to NOT_READY: " + status + ", " + err);
      
      alert("Failed to set state to Not Ready: ", status);
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
    url: Finesse.url.full + '/finesse/api/User/' + agent.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
    },
    success: function(data) {
      console.log("Successfully logged out");
      console.log(data);
    },
    error: function(jqXHR, status, err) {
      console.error("Error setting state to Logout:", status, err);
      window.reportError("Error setting state to Logout: " + status + ", " + err);
    }
  });
}

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

export default FinesseStateApi;

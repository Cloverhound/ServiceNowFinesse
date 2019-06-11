import $ from "jquery";
import Finesse from './finesse_api';
import { parseNumber } from 'libphonenumber-js';

const FinessePhoneApi = {
  call: call,
  consult: consult,
  hangup: hangup,
  hold: hold,
  resume: resume,
  conference: conference,
  answer: answer,
  transfer: transfer,
  sendDtmf: sendDtmf,
  getActiveCall: getActiveCall,
  dialPrefix: "91"
}

function call(agent, number) {
  number = formatNumber(number);
  console.log("Calling:", "'" + number + "'");

  var xml = '<Dialog>' +
            ' <requestedAction>MAKE_CALL</requestedAction>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <fromAddress>' + agent.extension + '</fromAddress>' +
            '</Dialog>';

  sendPhoneCommand(agent, xml);
}

function formatNumber(number) {
  let parsed = parseNumber(number, "US", { extended: true });
  if (parsed.ext) {
    return parsed.ext;
  }
  if (!parsed.possible || !parsed.phone) {
    return number;
  }

  return FinessePhoneApi.dialPrefix + parsed.phone;
}

function consult(agent, number) {
  console.log("Consulting to:", "'" + number + "'");

  let call = getCallByLine(agent.calls, 1);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <requestedAction>CONSULT_CALL</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
}

function getCallByLine(calls, line) {
  var callIds = Object.keys(calls);
  for(var i = 0; i < callIds.length; i++) {
    var call = calls[callIds[i]];
    if(call.line === line) {
      return call;
    }
  }
  return false;
}

function getActiveCall(agent) {
  var callIds = Object.keys(agent.calls);
  for(var i = 0; i < callIds.length; i++) {
    var call = agent.calls[callIds[i]];
    if (call.state == "ACTIVE" && !call.held) {
      return call;
    }
  }
  return null;
}

function hangup(agent, call) {
  console.log("Hanging up call:", call);

  var xml = '<Dialog>' +
              '<targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
              '<requestedAction>DROP</requestedAction>' +
              '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
}


function hold(agent, call) {
  console.log("Holding call:", call);

  var xml = '<Dialog>' +
              '<targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
              '<requestedAction>HOLD</requestedAction>' +
              '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
}

function resume(agent, call) {
  console.log("Resuming call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>RETRIEVE</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
}

function answer(agent, call) {
  console.log("Answering call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>ANSWER</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
  window.FinessePlugin.hideWindow();
}

function conference(agent, call) {
  console.log("Conferencing call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>CONFERENCE</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
}

function transfer(agent, call) {
  console.log("Transferring call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>TRANSFER</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(agent, call.id, xml);
}

function sendDtmf(digit, agent, call) {
  console.log("Sending DTMF:", call);

  var xml = '<Dialog>' +
            '  <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            '  <requestedAction>SEND_DTMF</requestedAction>' +
            '  <actionParams>' +
            '    <ActionParam>' +
            '      <name>dtmfString</name>' +
            '      <value>' + digit + '</value>' +
            '    </ActionParam>' +
            '  </actionParams>' +
            '</Dialog>';

  sendDialogCommand(agent, call.id, xml);
}

function sendDialogCommand(agent, id, xml) {
  console.log("Sending dialog command with id: " + id + " and xml: ", xml);
  $.ajax({
    url: Finesse.url.full + '/finesse/api/Dialog/' + id,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
    },
    success: function(data) {
      console.log("Successfully sent dialog command", data);
    },
    error: function(jqXHR, status, err) {
      if(!jqXHR.responseText) {
        console.error("No response from Finesse for Dialog Command:", status, err);
        window.reportError("No response from Finesse for Dialog Command: " + status + ", " + err);

        alert("No Response From Finesse: Possible Network Error");
        return;
      }

      console.error("Received error for Dialog Command:", status, err);
      window.reportError("Received error for Dialog Command: " + status + ", " + err);

      alert($($.parseXML(jqXHR.responseText)).find("ErrorMessage").text());
      console.log("Failed to send dialog command: " + jqXHR.responseText);
    }
  });
}

function sendPhoneCommand(agent, xml) {
  console.log("sending phone command with xml: ", xml);
  $.ajax({
    url: Finesse.url.full + '/finesse/api/User/' + agent.username + '/Dialogs',
    type: 'POST',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
    },
    success: function(data) {
      console.log("Successfully sent phone command", data);
    },
    error: function(jqXHR, status, err) {
      console.error("No response from Finesse for Phone Command:", status, err);
      window.reportError("No response from Finesse for Phone Command: " + status + ", " + err);

      alert($($.parseXML(jqXHR.responseText)).find("ErrorMessage").text());
      console.log("Failed to send phone command: " + jqXHR.responseText);
    }
  });
}

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

export default FinessePhoneApi;

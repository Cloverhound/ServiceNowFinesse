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
  updateCallVariables: updateCallVariables,
  getActiveCall: getActiveCall,
  getCallById: getCallById,
  dialPrefix: {
    default: "9{countryCode}"
  },
  defaultCountry: "CO",
  formatNumber: formatNumber
}

function formatColombiaNumbers(number) { 
  if (number.length == 10 ) { 
    return "003" + number 
  } else { 
    return "0" + number 
  } 
}

function call(agent, number) {
  number = formatNumber(number);
  //number = formatColombiaNumbers(number);
  console.log("Calling:", "'" + number + "'");

  var xml = '<Dialog>' +
            ' <requestedAction>MAKE_CALL</requestedAction>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <fromAddress>' + agent.extension + '</fromAddress>' +
            '</Dialog>';

  sendPhoneCommand(agent, xml);
}

function formatNumber(number) {
  if (number.length == 10) { 
    return "003" + number 
  } else if (number.length == 7) { 
    return "0" + number 
  } 
  
  let parsed = parseNumber(number, { defaultCountry: FinessePhoneApi.defaultCountry, extended: true });
  
  console.log("Parsed number:", number, "as:", JSON.stringify(parsed));

  if (parsed.ext) {
    return parsed.ext;
  }

  if (!parsed.possible || !parsed.phone || !parsed.valid) {
    if (number.startsWith("+")) {
      // Its an e164 number already, no idea why it isn't valid so just dial as is
      return number;
    }

    // Retry as e164
    parsed = parseNumber("+" + number, { extended: true });
    console.log("Re-parsed number:", "+" + number, "as:", JSON.stringify(parsed));
    if (!parsed.possible || !parsed.phone || !parsed.valid) {
      // No idea why it isn't valid so just dial as is
      return number;
    }
  }

  let countryCallingCode = parsed.countryCallingCode;
  let country = parsed.country;

  let prefix = FinessePhoneApi.dialPrefix.default;
  if (countryCallingCode && FinessePhoneApi.dialPrefix[countryCallingCode]) {
    prefix = FinessePhoneApi.dialPrefix[countryCallingCode];
  } else if (country && FinessePhoneApi.dialPrefix[country]) {
    prefix = FinessePhoneApi.dialPrefix[country];
  }

  prefix = prefix.replace(/{countryCode}/g, countryCallingCode);
  console.log("Using prefix:", prefix, "for dial.");

  let formatted = prefix + parsed.phone;
  console.log("Returning formatted number to dial:", formatted);
  return formatted;
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

function getCallById(agent, id) {
  var callIds = Object.keys(agent.calls);
  for(var i = 0; i < callIds.length; i++) {
    if (callIds[i] == id) {
      return agent.calls[callIds[i]];
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

// <Dialog>
//    <requestedAction>UPDATE_CALL_DATA</requestedAction>
//    <mediaProperties>
//       <wrapUpReason>Happy customer!</wrapUpReason>
//       <callvariables>
//          <CallVariable>
//             <name>callVariable1</name>
//             <value>123456789</value>
//          </CallVariable>
//          <CallVariable>
//          ... Other call variables to be modified ...
//          </CallVariable>
//       </callvariables>
//       </callvariables>
//    </mediaProperties>
// </Dialog>
function updateCallVariables(agent, call, variables) {
  console.log("Updating call variables:", call, variables);

  var xml = '<Dialog>' +
            '  <requestedAction>UPDATE_CALL_DATA</requestedAction>' +
            '  <mediaProperties>' +
            '    <callvariables>';

  for (const name in variables) {
    xml +=  ' <CallVariable>' +
            '   <name>' + name + '</name>' +
            '   <value>' + variables[name] + '</value>' +
            ' </CallVariable>';
  }

  xml +=  '    </callvariables>' +
          '  </mediaProperties>' +
          '</Dialog>'

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

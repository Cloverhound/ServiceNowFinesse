import $ from "jquery";


const FinessePhoneApi = {
  call: call,
  consult: consult,
  hangup: hangup,
  hold: hold,
  resume: resume,
  conference: conference,
  answer: answer,
  transfer: transfer
}

function call(agent, number) {
  console.log("Calling:", number);

  var xml = '<Dialog>' +
            ' <requestedAction>MAKE_CALL</requestedAction>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <fromAddress>' + agent.extension + '</fromAddress>' +
            '</Dialog>';

  sendPhoneCommand(agent, xml);
}

function consult(agent, number) {
  console.log("Consulting:", number);
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
  window.openFrameAPI.hide();
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

function sendDialogCommand(agent, id, xml) {
  console.log("Sending dialog command with id: " + id + " and xml: ", xml);
  $.ajax({
    url: '/finesse/api/Dialog/' + id,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, agent.password));
    },
    success: function(data) {
      console.log("Successfully sent dialog command", data);
    },
    error: function(jqXHR, textStatus) {
      if(!jqXHR.responseText) {
        alert("No Response From Finesse: Possible Network Error");
        return;
      }
      alert($($.parseXML(jqXHR.responseText)).find("ErrorMessage").text());
      console.log("Failed to send dialog command: " + jqXHR.responseText);
    }
  });
}

function sendPhoneCommand(agent, xml) {
  console.log("sending phone command with xml: ", xml);
  $.ajax({
    url: '/finesse/api/User/' + agent.username + '/Dialogs',
    type: 'POST',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, agent.password));
    },
    success: function(data) {
      console.log("Successfully sent phone command", data);
    },
    error: function(jqXHR, textStatus) {
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

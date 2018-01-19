import React, { Component } from 'react';
import moment from "moment";
import ReactDOM from 'react-dom';
import './App.css';
import $ from "jquery";
import xmlToJSON from "./vendor/xmlToJSON";
import AgentHeader from './components/agent_header';
import LoginDialog from './components/login_dialog';
import HomeView from './components/home/home_view';
import Tabs from './components/tabs';
import RecentCallsView from './components/recent_calls';
import FinessePhoneApi from './finesse_apis/finesse_phone_api';
import FinesseStateApi from './finesse_apis/finesse_state_api';
import FinesseTunnelApi from './finesse_apis/finesse_tunnel_api';
import FinesseReasonCodesApi from './finesse_apis/finesse_reason_codes_api';

window.finesseUrl = ""
window.finesseUrlWithoutPort = ""
window.tabNames = {HOME: 1, RECENTS: 2, DIALPAD: 3, CONTACTS: 4};  // I forsee dialpad and contacts in the future
window.agent = emptyAgent();


window.openFrameAPI.init({ height: 350, width: 350 }, initSuccess, initFailure);

function emptyAgent() {
  return {
    username: "",
    password: "",
    extension: "",
    state: 'LOGOUT',
    reasonCode: {},
    calls: {},
    recentCalls: [],
    currentTab: window.tabNames.HOME,
    notReadyReasonCodes: [],
    signOutReasonCodes: [],
    previousLoginFailed: false,
    loggingOut: false,
    loggingIn: false
  };
}


function handleCommunicationEvent(context) {
  console.log("Communication from Topframe", context);
  if(context["phone_number"]) {
    FinessePhoneApi.call(context["phone_number"].replace(/-/g, ""));
    window.openFrameAPI.show();
  }
}
function handleOpenFrameShownEvent(context) {
  rerender(window.agent);
}
function initSuccess(snConfig) {
  console.log("openframe configuration",snConfig);

  setupFinesseUrl(snConfig)

  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.COMMUNICATION_EVENT,
  handleCommunicationEvent);
  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.OPENFRAME_SHOWN,
  handleOpenFrameShownEvent);
}
function initFailure(error) {
  console.log("Error: OpenFrame init failed..", error);
}



function setupFinesseUrl(snConfig) {
  console.log('Setting up finesse url...')
  window.finesseUrl = snConfig.configuration || decodeURIComponent(getQueryParameter("finesseUrl")) || ""
  window.finesseUrlWithoutPort = window.finesseUrl;

  var urlParts = window.finesseUrl.split(":");
  if (urlParts.length > 2) {
    window.finesseUrlWithoutPort = urlParts[0] + ":" + urlParts[1];
  }

  console.log('Finesse URL: ' + window.finesseUrl)
  console.log('Finesse URL without Port: ' + window.finesseUrlWithoutPort)
}

function getQueryParameter(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}




function login() {
  console.log("Logging in...");

  document.getElementById('tunnel-frame').src = window.finesseUrlWithoutPort + ":7443/tunnel"

  window.agent = emptyAgent();
  window.agent.loggingIn = true;
  rerender(window.agent);

  var form = document.getElementById("login-form");
  window.agent.username = form.elements["username"].value;
  window.agent.password = form.elements["password"].value;
  window.agent.extension = form.elements["extension"].value;

  console.log(window.agent.username, window.agent.extension);

  if(!window.agent.username || !window.agent.password) {
    handleLoginFailed("Invalid Credentials");
    return false;
  }

  if(!window.agent.extension) {
    handleLoginFailed("Invalid Device");
    return false;
  }

  $.ajax({
    url: 'https://' + window.finesseUrl + '/finesse/api/User/' + window.agent.username,
    type: "GET",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.agent.username, window.agent.password));
    },
    success: function() {
      FinesseReasonCodesApi.setReasonCodes(window.agent);
      FinesseTunnelApi.connect(window.agent);

    },
    error: function() {
      handleLoginFailed("Invalid Credentials");
    },
    complete: function() {
      return false;
     }
  });
}

window.addEventListener("message", receiveMessage, false);

function pushLoginToFinesse(username, password, extension) {
  console.log("Pushing login to finesse with username: " + username + " and password: " + password);

  var xml = '<User>' +
            ' <state>LOGIN</state>' +
            ' <extension>' + extension + '</extension>' +
            '</User>';

  $.ajax({
    url: window.finesseUrl + '/finesse/api/User/' + username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(username, password));
    },
    success: function(data) {
      console.log(data);
    },
    error: function() {
      handleLoginFailed("Failed to login to finesse");
    }
  });
}

function handleLoginFailed(reason)
{
  console.log("Handling login failure with reason: " + reason);
  FinesseTunnelApi.disconnect(window.agent);
  window.agent.previousLoginFailed = {reason: reason}
  window.agent.loggingIn = false;
  rerender(window.agent);
}


function receiveMessage(event)
{
  console.log("Received:", event.data);

  if (event.data === "4|connected") {
    pushLoginToFinesse(window.agent.username, window.agent.password, window.agent.extension);
  }

  if (event.data === "4|unauthorized") {
    handleLoginFailed("Invalid Credentials");
  }

  if(event.data === "4|disconnected") {
    "Received disconnected event..."
    if(window.agent.state !== "LOGOUT" && !window.agent.loggingOut) {
      console.log("Reconnecting because logged in and not logging out, so shouldnt have disconnected");
      FinesseTunnelApi.connect();
    }
  }


  var eventCode = event.data.split("|")[0];
  if (eventCode === "0") {
    var dataString = event.data.split('|')[1];
    dataString = dataString.replace(/^[^<]+/, '')
    var data = xmlToJSON.parseString(dataString, { childrenAsArray: false });
    console.log(data);


    if (data.Update.data.apiErrors && window.agent.state === "LOGOUT") {
        handleLoginFailed(data.Update.data.apiErrors.apiError.errorType._text);
    } else if (data.Update.data.apiErrors){
      handleApiErrors(data.Update.data.apiErrors);
    } else if (data.Update.data.user) {
      handleUserUpdate(data.Update.data.user);
    } else if (data.Update.data.dialogs) {

      switch (data.Update.event._text) {
        case 'PUT':
        case 'POST':
          handleAllDialogsUpdated(data.Update.data.dialogs);
          break;
        case 'DELETE':
          handleAllDialogsDeleted(data.Update.data.dialogs);
          break;
      }

    } else if (data.Update.data.dialog) {

      switch (data.Update.event._text) {
        case 'PUT':
        case 'POST':
          handleDialogUpdated(data.Update.data.dialog);
          break;
        case 'DELETE':
          handleDialogDeleted(data.Update.data.dialog);
          break;
      }

    }
  }
}


function deleteCall(id) {
  console.log("Deleting call with id: " + id + " from calls: ", window.agent.calls);
  let recentCall = getRecentCallById(id);
  if(recentCall && !recentCall.endTime) {
    recentCall.endedAt = moment();
    recentCall.duration = recentCall.endedAt.diff(recentCall.startedAt);
  }
  delete window.agent.calls[id];
  console.log("Agent: ", window.agent);
}

function getRecentCallById(id) {
  console.log("Getting recent call by id");

  for(let i = 0; i < window.agent.recentCalls.length; i++) {
    let recentCall = window.agent.recentCalls[i];
    if(recentCall.id == id) {
      return recentCall;
    }
  }
  return false;
}


function handleUserUpdate(updatedAgent) {
  setAgentReasonCodeFromUserUpdate(updatedAgent);
  setAgentFieldFromUserUpdate('state', updatedAgent);
  setAgentFieldFromUserUpdate('stateChangeTime', updatedAgent);
  setAgentFieldFromUserUpdate('reasonCodeId', updatedAgent);
  setAgentFieldFromUserUpdate('pendingState', updatedAgent);
  setAgentFieldFromUserUpdate('firstName', updatedAgent);
  setAgentFieldFromUserUpdate('lastName', updatedAgent);
  setAgentFieldFromUserUpdate('loginId', updatedAgent);
  setAgentFieldFromUserUpdate('loginName', updatedAgent);
  setAgentFieldFromUserUpdate('teamName', updatedAgent);
  setAgentFieldFromUserUpdate('extension', updatedAgent);

  rerender(window.agent);
}

function handleApiErrors(apiErrors) {
  var errorMessage = apiErrors.apiError.errorMessage._text;
  var errorType = apiErrors.apiError.errorType._text;
  alert(errorMessage + " - " + errorType);
}

function handleAllDialogsUpdated(dialogs) {
  var dialog = dialogs.Dialog;
  handleDialogUpdated(dialog);
}

function handleDialogUpdated(dialog) {
  console.log("Handling dialog updated..", dialog);
  let calls = window.agent.calls;

  var id = dialog.id._text;

  if(calls[id]) {
    console.log("Updating existing call:", calls[id]);
  } else {
    console.log("Creating new call");
  }

  calls[id] = calls[id] || {};
  var call = calls[id];

  if(!call.line) {
    call.line = Object.keys(calls).length;
  }

  call.id = id;
  call.startedAt = call.startedAt || new Date();
  call.held = call.held || false;
  call.from = dialog.fromAddress._text;
  call.to = dialog.toAddress._text || call.to;
  call.state = dialog.state._text;
  call.callType = dialog.mediaProperties.callType._text;

  var participantState = getParticipantState(dialog);

  if(participantState === "HELD") {
    call.held = true;
  }
  if(participantState === "ACTIVE") {
    call.held = false;
  }


  call.callVariables = call.callVariables || {};
  var callVariables = dialog.mediaProperties.callvariables.CallVariable;
  for(var i = 0; i < callVariables.length; i++) {
    var callVariable = callVariables[i];
    if(!call.openedIncident && callVariable.value._text) {
      var incidentNumber = "INC00" + callVariable.value._text;
      console.log("Opening incident with number: " + incidentNumber)
      window.openFrameAPI.openServiceNowForm({entity:'incident', query:'sysparm_query=number=' + incidentNumber });
      call.openedIncident = true;
    }
    call.callVariables[callVariable.name._text] = callVariable.value._text;
  }


  if (call.from === window.agent.extension) {
    call.otherParty = call.to;
    call.direction = "outbound";
  } else {
    call.otherParty = call.from;
    call.direction = "inbound";
  }

  if(call.to && !recentCallExists(call)) {
    addCallToRecentsList(call);
  } else {
    console.log("Not adding to recents list");
    console.log("call.to: ", call.to);
  }

  console.log("Updated call:", call)

  if(call.direction === "inbound" && call.state === "ALERTING") {
    window.openFrameAPI.show();
  }

  rerender(window.agent);
}

function getParticipantState(dialog) {
  console.log("Getting participant state for dialog: ", dialog);
  var participants = dialog.participants.Participant;
  for(var i = 0; i < participants.length; i++) {
    if(participants[i].mediaAddress._text === window.agent.extension) {
      console.log("Returning participant state: " + participants[i].state._text);
      return participants[i].state._text;
    }
  }
  console.log("No participant state found");
  return false;
}

function addCallToRecentsList(call) {
  console.log("Adding call to recents list", call);
  let recentCalls = window.agent.recentCalls;
  let recent_calls_list_length = 5;
  if(recentCalls.length === recent_calls_list_length) {
    recentCalls = window.agent.recentCalls.splice(0, 1);
  }
  recentCalls.push(call);

  console.log("recent calls:", recentCalls);
}

function recentCallExists(call) {
  let recentCalls = window.agent.recentCalls;
  for(let i = 0; i < recentCalls.length; i++) {
    if(recentCalls[i].id === call.id) {
      return true;
    }
  }
  return false;
}

function handleDialogDeleted(dialog) {
  console.log("Handling dialog deleted of dialog:", dialog);
  deleteCall(dialog.id)

  rerender(window.agent);
}

function handleAllDialogsDeleted(dialogs) {
  console.log("Handling all dialogs deleted with dialogs:", dialogs)

  deleteCall(dialogs.Dialog.id._text)

  rerender(window.agent);
}

// Helps convert the xmlToJSON results to regular properties
function setAgentFieldFromUserUpdate(fieldName, userObject) {
  let previousState = window.agent["state"]
  window.agent[fieldName] = userObject[fieldName] && userObject[fieldName]._text || null;
  let currentState = window.agent["state"]
  if(previousState !== "LOGOUT" && currentState === "LOGOUT") {
    FinesseTunnelApi.disconnect(window.agent);
    window.agent.loggingOut = false;
    window.agent.loggingIn = false;
    window.agent.previousLoginFailed = false;
  }

}

function setAgentReasonCodeFromUserUpdate(userObject) {
  console.log("Setting agent reason code from user update", userObject);
  if(userObject.reasonCode) {
    console.log("Reason code is included in the user update...")
    var reasonCode = {};
    reasonCode.category = userObject.reasonCode.category._text;
    reasonCode.code = userObject.reasonCode.code._text;
    reasonCode.forAll = userObject.reasonCode.forAll._text;
    reasonCode.id = userObject.reasonCode.id._text;
    reasonCode.label = userObject.reasonCode.label._text;
    reasonCode.uri = userObject.reasonCode.uri._text;
    window.agent.reasonCode = reasonCode;
    console.log("Done updating reason code: ", reasonCode);
  } else {
    console.log("Reason code is NOT included in the user update");
    window.agent.reasonCode = null;
  }
}


$("#dial_num").on('keyup', function (e) {
    if (e.keyCode == 13) {

    }
});

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

function rerender(agent) {
  console.log("Rerendering with agent: ", agent);
  ReactDOM.render(
    <App agent={agent} />,
    document.getElementById('root')
  );
}
window.rerender = rerender;

class App extends Component {

  handleLogin(event) {
    event.preventDefault();
    return login();
  }

  render() {
    let agent = this.props.agent;
    if(!agent) {
      agent = emptyAgent();
    }
    let loggedIn = agent && agent.state !== 'LOGOUT'

    if(!loggedIn) {
      return (
          <div id="main">
              <LoginDialog handleLogin={this.handleLogin} previousLoginFailed={agent.previousLoginFailed} loading={agent.loggingIn}/>
          </div>
      );
    } else {
      return (
          <div id="main">
              <AgentHeader agent={agent} stateApi={FinesseStateApi}/>
              <HomeView agent={agent} tabNames={window.tabNames} phoneApi={FinessePhoneApi} stateApi={FinesseStateApi}/>
              <RecentCallsView agent={agent} phoneApi={FinessePhoneApi} tabNames={window.tabNames}/>
              <Tabs agent={agent} rerender={rerender} tabNames={window.tabNames}/>
          </div>
      );
    }
  }
}

export default App;

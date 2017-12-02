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

var tabNames = {HOME: 1, RECENTS: 2, DIALPAD: 3, CONTACTS: 4}; // I forsee dialpad and contacts in the future

var agent = emptyAgent();

var RECENT_CALLS_LIST_LENGTH = 5;

var MESSAGE_TYPE = {
  EVENT: 0,
  ID: 1,
  PASSWORD: 2,
  RESOURCEID: 3,
  STATUS: 4,
  XMPPDOMAIN: 5,
  PUBSUBDOMAIN: 6,
  SUBSCRIBE: 7,
  UNSUBSCRIBE: 8,
  PRESENCE: 9,
  CONNECT_REQ: 10,
  DISCONNECT_REQ: 11
};

var config = {
  height: 350,
  width: 350
};

function emptyAgent() {
  return {
    username: "",
    password: "",
    extension: "",
    state: 'LOGOUT',
    reasonCode: {},
    calls: {},
    recentCalls: [],
    currentTab: tabNames.HOME,
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
  rerender(agent);
}
function initSuccess(snConfig) {
  console.log("openframe configuration",snConfig);
  //register for communication event from TopFrame
  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.COMMUNICATION_EVENT,
  handleCommunicationEvent);
  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.OPENFRAME_SHOWN,
  handleOpenFrameShownEvent);
}
function initFailure(error) {
  console.log("OpenFrame init failed..", error);
}

window.openFrameAPI.init(config, initSuccess, initFailure);



function login() {
  console.log("Logging in...");

  agent = emptyAgent();
  agent.loggingIn = true;
  rerender(agent);

  var form = document.getElementById("login-form");
  agent.username = form.elements["username"].value;
  agent.password = form.elements["password"].value;
  agent.extension = form.elements["extension"].value;

  console.log(agent.username, agent.extension);

  if(!agent.username || !agent.password) {
    handleLoginFailed("Invalid Credentials");
    return false;
  }

  if(!agent.extension) {
    handleLoginFailed("Invalid Device");
    return false;
  }

  $.ajax({
    url: "/finesse/api/User/" + agent.username,
    type: "GET",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, agent.password));
    },
    success: function() {
      setReasonCodes();
      connect();

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
    url: '/finesse/api/User/' + username,
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
  disconnect();
  agent.previousLoginFailed = {reason: reason}
  agent.loggingIn = false;
  rerender(agent);
}

function disconnect() {
  console.log("Disconnecting iframe with username: " + agent.username)

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.DISCONNECT_REQ + "|" + agent.username, "*");
}

function connect() {
  console.log("Connecting iframe with username: " + agent.username + " and password: " + agent.password)

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.ID + "|" + agent.username, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.PASSWORD + "|" + agent.password, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.XMPPDOMAIN + "|" + "uccx1.cloverhound.com", "*");
}

function receiveMessage(event)
{
  console.log("Received:", event.data);

  if (event.data === "4|connected") {
    pushLoginToFinesse(agent.username, agent.password, agent.extension);
  }

  if (event.data === "4|unauthorized") {
    handleLoginFailed("Invalid Credentials");
  }

  if(event.data === "4|disconnected") {
    "Received disconnected event..."
    if(agent.state !== "LOGOUT" && !agent.loggingOut) {
      console.log("Reconnecting because logged in and not logging out, so shouldnt have disconnected");
      connect();
    }
  }


  var eventCode = event.data.split("|")[0];
  if (eventCode === "0") {
    var dataString = event.data.split('|')[1];
    dataString = dataString.replace(/^[^<]+/, '')
    var data = xmlToJSON.parseString(dataString, { childrenAsArray: false });
    console.log(data);


    if (data.Update.data.apiErrors && agent.state === "LOGOUT") {
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

function setReasonCodes() {
  setReasonCodesWithCategory("NOT_READY", agent.notReadyReasonCodes);
  setReasonCodesWithCategory("LOGOUT", agent.signOutReasonCodes);
}


function setReasonCodesWithCategory(category, reasonCodes) {
  console.log("Setting reason codes for category: " + category);
  $.ajax({
    url: '/finesse/api/User/' + agent.username + '/ReasonCodes?category=' + category,
    type: 'GET',
    dataType: "xml",
    success: function(xmlReasonCodes) {
      console.log("Successfully got reason codes");
      console.log(xmlReasonCodes);

      $(xmlReasonCodes).find("ReasonCode").each(function(reasonCodeIndex, reasonCodeXml) {
        var reasonCode = {};
        reasonCode.uri =  $(reasonCodeXml).find("uri").text();
        reasonCode.category = $(reasonCodeXml).find("category").text();
        reasonCode.code =  $(reasonCodeXml).find("code").text();
        reasonCode.label =  $(reasonCodeXml).find("label").text();
        reasonCode.forAll =  $(reasonCodeXml).find("forAll").text();
        console.log("Pushing reason code to array: ", reasonCode);
        reasonCodes.push(reasonCode)
      });
      console.log("Done setting reason codes", reasonCodes);
    },
    error: function(jqXHR, statusText) {
      console.log("Failed to get reason codes: ", statusText);
    }
  });
}


function deleteCall(id) {
  console.log("Deleting call with id: " + id + " from calls: ", agent.calls);
  let recentCall = getRecentCallById(id);
  if(recentCall && !recentCall.endTime) {
    recentCall.endedAt = moment();
    recentCall.duration = recentCall.endedAt.diff(recentCall.startedAt);
  }
  delete agent.calls[id];
  console.log("Agent: ", agent);
}

function getRecentCallById(id) {
  console.log("Getting recent call by id");

  for(let i = 0; i < agent.recentCalls.length; i++) {
    let recentCall = agent.recentCalls[i];
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

  rerender(agent);
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
  let calls = agent.calls;

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


  if (call.from === agent.extension) {
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

  rerender(agent);
}

function getParticipantState(dialog) {
  console.log("Getting participant state for dialog: ", dialog);
  var participants = dialog.participants.Participant;
  for(var i = 0; i < participants.length; i++) {
    if(participants[i].mediaAddress._text === agent.extension) {
      console.log("Returning participant state: " + participants[i].state._text);
      return participants[i].state._text;
    }
  }
  console.log("No participant state found");
  return false;
}

function addCallToRecentsList(call) {
  console.log("Adding call to recents list", call);
  let recentCalls = agent.recentCalls;
  if(recentCalls.length === RECENT_CALLS_LIST_LENGTH) {
    recentCalls = agent.recentCalls.splice(0, 1);
  }
  recentCalls.push(call);

  console.log("recent calls:", recentCalls);
}

function recentCallExists(call) {
  let recentCalls = agent.recentCalls;
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

  rerender(agent);
}

function handleAllDialogsDeleted(dialogs) {
  console.log("Handling all dialogs deleted with dialogs:", dialogs)

  deleteCall(dialogs.Dialog.id._text)

  rerender(agent);
}

// Helps convert the xmlToJSON results to regular properties
function setAgentFieldFromUserUpdate(fieldName, userObject) {
  let previousState = agent["state"]
  agent[fieldName] = userObject[fieldName] && userObject[fieldName]._text || null;
  let currentState = agent["state"]
  if(previousState !== "LOGOUT" && currentState === "LOGOUT") {
    disconnect();
    agent.loggingOut = false;
    agent.loggingIn = false;
    agent.previousLoginFailed = false;
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
    agent.reasonCode = reasonCode;
    console.log("Done updating reason code: ", reasonCode);
  } else {
    console.log("Reason code is NOT included in the user update");
    agent.reasonCode = null;
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
              <HomeView agent={agent} tabNames={tabNames} phoneApi={FinessePhoneApi} stateApi={FinesseStateApi}/>
              <RecentCallsView agent={agent} phoneApi={FinessePhoneApi} tabNames={tabNames}/>
              <Tabs agent={agent} rerender={rerender} tabNames={tabNames}/>
          </div>
      );
    }
  }
}

export default App;

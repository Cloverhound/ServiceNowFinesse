import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Dropdown from 'react-dropdown';
import './App.css';
import $ from "jquery";
import xmlToJSON from "./vendor/xmlToJSON";
import moment from "moment";
import "moment-duration-format";
var Loader = require('halogen/PulseLoader');
var FontAwesome = require('react-fontawesome');


var RECENT_CALLS_LIST_LENGTH = 5;

var agent = {
  state: 'LOGOUT'
};

var tabNames = {HOME: 1, RECENTS: 2, DIALPAD: 3, CONTACTS: 4};
var calls = {};
var recentCalls = [];

var currentTab = tabNames.HOME;

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

var STATE_TEXT = {
  READY: 'Ready',
  NOT_READY: 'Not Ready',
  TALKING: 'Talking',
  LOGOUT: 'Logout'
};

var reasonCodes = [];

var INCIDENT_NUMBER_LENGTH = 7;
var previousLoginFailed = false;
var loggingOut = false;

var config = {
  height: 350,
  width: 350
};


function playInboundRingingMusic() {
  console.log("Playing inbound ringing music...");
  $('#ringtone').trigger('play');
}
function stopInboundRingingMusic() {
  console.log("Stopping inbound ringing music...");
  $('#ringtone').trigger('pause');
}


function handleCommunicationEvent(context) {
  console.log("Communication from Topframe", context);
  if(context["phone_number"]) {
    call(context["phone_number"].replace(/-/g, ""));
    window.openFrameAPI.show();
  }
}
function handleOpenFrameShownEvent(context) {
  rerender();
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

  clearReasonCodes();
  rerender(previousLoginFailed, true)

  var form = document.getElementById("login-form");
  window.username = form.elements["username"].value;
  window.password = form.elements["password"].value;
  window.extension = form.elements["extension"].value;

  console.log(window.username, window.extension);

  if(!window.username || !window.password) {
    handleLoginFailed("Invalid Credentials");
    return false;
  }

  if(!window.extension) {
    handleLoginFailed("Invalid Device");
    return false;
  }

  $.ajax({
    url: "/finesse/api/User/" + window.username,
    type: "GET",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
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
  console.log("Pushing login to finesse...");

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
  });
}

function handleLoginFailed(reason)
{
  console.log("Handling login failure with reason: " + reason);
  disconnect();
  previousLoginFailed = {reason: reason}
  rerender(previousLoginFailed, false);
}

function disconnect() {
  console.log("Disconnecting iframe with username: " + window.username)

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.DISCONNECT_REQ + "|" + window.username, "*");
}

function connect() {
  console.log("Connecting iframe with username: " + window.username + " and password: " + window.password)

  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.ID + "|" + window.username, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.PASSWORD + "|" + window.password, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.XMPPDOMAIN + "|" + "uccx1.cloverhound.com", "*");
}

function receiveMessage(event)
{
  console.log("Received:", event.data);

  if (event.data === "4|connected") {
    pushLoginToFinesse(window.username, window.password, window.extension);
  }

  if (event.data === "4|unauthorized") {
    handleLoginFailed("Invalid Credentials");
  }

  if(event.data === "4|disconnected") {
    "Received disconnected event..."
    if(agent.state !== "LOGOUT" && !loggingOut) {
      console.log("Reconnecting because logged in and not logging out, so shouldnt have disconnected")
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

function logout() {
  console.log("Logging out...");
  loggingOut = true;

  var xml = '<User>' +
            ' <state>LOGOUT</state>' +
            '</User>';

  $.ajax({
    url: '/finesse/api/User/' + window.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
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

function clearReasonCodes() {
  console.log("Clearing reason codes...")
  reasonCodes = [];
}

function setReasonCodes() {
  console.log("Setting reason codes...");
  $.ajax({
    url: '/finesse/api/User/' + window.username + '/ReasonCodes?category=NOT_READY',
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

function ready() {
  console.log("Running ready");
  var xml = '<User>' +
            ' <state>READY</state>' +
            '</User>';

  $.ajax({
    url: '/finesse/api/User/' + window.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
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

function findReasonCodeByLabel(label) {
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

function notReady(label) {
  console.log("Running not ready with label: " + label);

  var xml = '<User>' +
            ' <state>NOT_READY</state>' +
            '</User>';

  if(label) {
    var reasonCode = findReasonCodeByLabel(label);
    var reasonCodeId = reasonCode.uri.split("/").pop();
    xml = '<User>' +
              ' <state>NOT_READY</state>' +
              ' <reasonCodeId>' + reasonCodeId + '</reasonCodeId>' +
              '</User>';
  }

  console.log("Sending not ready xml: " + xml);


  $.ajax({
    url: '/finesse/api/User/' + window.username,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
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

function call(number) {
  console.log("Calling:", number);

  var xml = '<Dialog>' +
            ' <requestedAction>MAKE_CALL</requestedAction>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <fromAddress>' + agent.extension + '</fromAddress>' +
            '</Dialog>';

  sendPhoneCommand(xml);
  currentTab = tabNames.HOME;
  rerender();
}

function consult(number) {
  console.log("Consulting:", number);

  var call = getCallByLine(1);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <requestedAction>CONSULT_CALL</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(call.id, xml);
}



function hangup(call) {
  console.log("Hanging up call:", call);

  var xml = '<Dialog>' +
              '<targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
              '<requestedAction>DROP</requestedAction>' +
              '</Dialog>';


  sendDialogCommand(call.id, xml);
}


function hold(call) {
  console.log("Holding call:", call);

  var xml = '<Dialog>' +
              '<targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
              '<requestedAction>HOLD</requestedAction>' +
              '</Dialog>';


  sendDialogCommand(call.id, xml);
}

function resume(call) {
  console.log("Resuming call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>RETRIEVE</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(call.id, xml);
}

function getOtherCall(call) {
  var otherLine = 3 - call.line;
  return getCallByLine(otherLine);
}

function answer(call) {
  console.log("Answering call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>ANSWER</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(call.id, xml);
  window.openFrameAPI.hide();
}

function conference() {
  var call = getCallByLine(1);

  console.log("Conferencing call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>CONFERENCE</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(call.id, xml);
}

function transfer() {
  var call = getCallByLine(1);

  console.log("Transferring call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>TRANSFER</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(call.id, xml);
}

function sendPhoneCommand(xml) {
  console.log("sending phone command with xml: ", xml);
  $.ajax({
    url: '/finesse/api/User/' + window.username + '/Dialogs',
    type: 'POST',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
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


function sendDialogCommand(id, xml) {
  console.log("Sending dialog command with id: " + id + " and xml: ", xml);
  $.ajax({
    url: '/finesse/api/Dialog/' + id,
    type: 'PUT',
    data: xml,
    contentType: "application/xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
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

function deleteCall(id) {
  console.log("Deleting call with id: " + id + " from calls: ", calls);
  delete calls[id];
}

function getCallByLine(line) {
  var callIds = Object.keys(calls);
  for(var i = 0; i < callIds.length; i++) {
    var call = calls[callIds[i]];
    if(call.line === line) {
      return call;
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

  rerender();
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
      var incidentNumber = getIncidentNumber(callVariable.value._text);
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

  rerender();
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

  if(recentCalls.length === RECENT_CALLS_LIST_LENGTH) {
    recentCalls = agent.recentCalls.splice(0, 1);
  }
  recentCalls.push(call);

  console.log("recent calls:", recentCalls);
}

function recentCallExists(call) {
  for(let i = 0; i < recentCalls.length; i++) {
    if(recentCalls[i].id === call.id) {
      return true;
    }
  }
  return false;
}

function getIncidentNumber(number) {
  // var numZeroes = INCIDENT_NUMBER_LENGTH - number.length;
  // for(var i = 0; i < numZeroes; i++) {
  //   number = "0" + number;
  // }
  return "INC00" + number;
}

function handleDialogDeleted(dialog) {
  console.log("Handling dialog deleted of dialog:", dialog);
  deleteCall(dialog.id)

  rerender();
}

function handleAllDialogsDeleted(dialogs) {
  console.log("Handling all dialogs deleted with dialogs:", dialogs)

  deleteCall(dialogs.Dialog.id._text)

  rerender();
}

// Helps convert the xmlToJSON results to regular properties
function setAgentFieldFromUserUpdate(fieldName, userObject) {
  let previousState = agent["state"]
  agent[fieldName] = userObject[fieldName] && userObject[fieldName]._text || null;
  let currentState = agent["state"]
  if(previousState !== "LOGOUT" && currentState === "LOGOUT") {
    disconnect();
    loggingOut = false;
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

function rerender(previousLoginFailed=false, loading=false) {
  console.log("Rerendering with previousLoginFailed: " + previousLoginFailed + " and loading: " + loading);
  ReactDOM.render(
    <App agent={agent} previousLoginFailed={previousLoginFailed} loading={loading} recentCalls={recentCalls} currentTab={currentTab}/>,
    document.getElementById('root')
  );
}

window.rerender = rerender;

var DEBUG = false;
if (DEBUG) {
  setTimeout(() => {
    agent.state = 'NOT_READY';
    agent.firstName = 'Ed';
    agent.lastName = 'U';
    agent.extension = '7003';
    rerender();
  }, 500);
}

class App extends Component {

  handleLogin(event) {
    event.preventDefault();
    return login();
  }

  render() {
    let loggedIn = false;
    if (DEBUG || (this.props.agent && this.props.agent.state !== 'LOGOUT') ) {
      loggedIn = true
    }

    if(!loggedIn) {
      return (
          <div id="main">
              <LoginDialog handleLogin={this.handleLogin} previousLoginFailed={this.props.previousLoginFailed} loading={this.props.loading}/>
          </div>
      );
    } else {
      return (
          <div id="main">
              <HomeView agent={this.props.agent} currentTab={this.props.currentTab}/>
              <RecentCallsView recentCalls={this.props.recentCalls} currentTab={this.props.currentTab}/>
              <Tabs currentTab={this.props.currentTab}/>
          </div>
      );
    }
  }
}

class LoginDialog extends Component {

  constructor() {
    super();
    this.state = { "loading": false};
  }

  handleLogin(event) {
    this.props.handleLogin(event);
  }

  render() {
    let errorTextStyle = {
      color: "red",
      margin: 0
    };

    let submitButtonStyle = {
        border: "2px solid #333",
        borderRadius: "25px",
        backgroundColor: "transparent",
        margin: "0px",
        textTransform: "uppercase",
        cursor: "pointer",
        fontWeight: "bold"
    };

    var loaderStyle = {
      margin: "0px",
      marginTop: "17px",
      marginBottom: "5px"
    };

    if(!this.props.loading) {
      loaderStyle.visibility = "hidden";
    }

    if(this.props.previousLoginFailed && !this.props.loading) {
      console.log("Previous login failed, setting margin top...");
      submitButtonStyle.marginTop = "25px";
      loaderStyle.display = "none";
    }


    return (
      <div id="login-section" className="login-section">
        <form id="login-form" className="login-form" onSubmit={this.handleLogin.bind(this)}>
          <input placeholder="username" type="text" name="username"></input>
          <input placeholder="password" type="password" name="password"></input>
          <input placeholder="extension" type="text" name="extension"></input>

          {
            this.props.previousLoginFailed  && !this.props.loading ? (
              <div id="loginErrorText" style={errorTextStyle}>
                {this.props.previousLoginFailed.reason}
              </div>
            ) : null
          }

          <div id="loaderDiv" style={loaderStyle}>
            <Loader color="#39C1A6" size="16px" margin="5px"/>
          </div>

          <input type="submit" value="Login" style={submitButtonStyle}></input>
        </form>
      </div>
    );
  }
}

class Tabs extends Component {

  onHomeClick() {
    console.log("running onhome click...");
    currentTab = tabNames.HOME;
    rerender();
  }

  onRecentsClick() {
    console.log("running onrecents click...");
    currentTab = tabNames.RECENTS;
    rerender();
  }

  render() {


    var tabBarStyle = {
      position: "absolute",
      bottom: "0px",
      width: "100%",
      background: "whitesmoke",
      cursor: "pointer"
    };

    var tabStyle = {
      display: "inline-block",
      borderTop: "1px solid gray",
      width: "50%",
      color: "dimgray",
      textAlign: "center",
      fontSize: "smaller"
    }

    var tabTextStyle = {
      fontSize: "8px"
    }

    var homeStyle = $.extend(true, {}, tabStyle);
    var recentsStyle = $.extend(true, {}, tabStyle);

    homeStyle.borderRight = "1px solid gray";

    if(this.props.currentTab === tabNames.HOME) {
      homeStyle.color = "blue";
    } else {
      recentsStyle.color = "blue";
    }

    return (
      <div style={tabBarStyle} class="tabbar">
        <div style={homeStyle} className="tab home" onClick={this.onHomeClick.bind(this)}>
          <FontAwesome name='home' size="lg"/>
          <div style={tabTextStyle} className="tab-text">Home</div>
        </div>
        <div style={recentsStyle} className="tab recents" onClick={this.onRecentsClick.bind(this)}>
          <FontAwesome name='clock-o' size="lg"/>
          <div style={tabTextStyle} className="tab-text">Recents</div>
        </div>
      </div>
    );
  }

}

class HomeView extends Component {
  render(){

      if(this.props.currentTab !== tabNames.HOME) {
        console.log("Current tab is not home...");
        return null;
      }

      return (
        <div id="homeView" style={{height: "calc(100% - 35px)"}}>
          <AgentHeader agent={this.props.agent} />
          <div id="desktop">
            <StateControls agent={this.props.agent} />
            <CallPanel />
          </div>
        </div>
      )
  }
}


class RecentCallsView extends Component {
  render(){

      if(this.props.currentTab !== tabNames.RECENTS) {
        return null;
      }

      return (
        <RecentCalls recentCalls={this.props.recentCalls}/>
      )
  }
}


class AgentHeader extends Component {
  render() {
    let agent = this.props.agent;

    let logoutStyle = {
      float: 'right',
      color: '#FFF',
      textDecoration: 'underline'
    }

    return (
      <div id="header">
        <span>{agent.firstName} {agent.lastName} ({agent.extension})</span>
        <a href="#" onClick={logout} style={logoutStyle}>Sign Out</a>
      </div>
    );
  }
}

class StateControls extends Component {

  readyStateOption() {
    return {
      value: STATE_TEXT['READY'],
      label: STATE_TEXT['READY']
    }
  }

  notReadyStateOptions(agent) {

    if(reasonCodes.length === 0 && agent.state != "NOT_READY") {
        return [{value: STATE_TEXT['NOT_READY'], label: STATE_TEXT['NOT_READY']}]
    }

    var notReadyStateOptions= [];
    for(var i = 0; i < reasonCodes.length; i++) {
      var label = reasonCodes[i].label;

      if(agent.reasonCode && agent.reasonCode.label === label) {
        continue;
      }

      notReadyStateOptions.push({
        value: STATE_TEXT['NOT_READY'] + " - " + label,
        label: STATE_TEXT['NOT_READY'] + " - " + label
      });
    }

    return notReadyStateOptions;
  }

  options(agent) {
    var options = this.notReadyStateOptions(agent)
    if(agent.state !== "READY") {
      options.unshift(this.readyStateOption())
    }

    return options;
  }

  onSelect(option) {
    if (option.value === STATE_TEXT['READY']) {
      ready();
    } else if (option.value.includes(STATE_TEXT['NOT_READY']) && option.value.includes("-")) {
      notReady(option.value.split("-")[1].replace(/ /g,''));
    } else {
      notReady();
    }
  }

  render() {
    var value = STATE_TEXT[this.props.agent.state]
    if (value === STATE_TEXT["NOT_READY"] && this.props.agent.reasonCode) {
      value += (" - " + this.props.agent.reasonCode.label);
    }
    var options = this.options(this.props.agent)

    return (
      <div>
        <div id="agent-state" className={this.props.agent.state}>
          <Dropdown
            onChange={this.onSelect}
            options={options}
            value={value}
          />
        </div>
      </div>
    )
  }
}

class CallPanel extends Component {
  constructor() {
    super();

    this.state = { "open": false, now: (new Date()) };
  }

  toggleContent() {
    this.setState({"open": !this.state.open});
  }

  startCallTimer() {
    var timer = setInterval(() => {
      this.setState({ now: (new Date()) });
    }, 1000);

    this.setState({timer: timer});
  }

  render() {
    let callsActive = (Object.keys(calls).length > 0);

    let contentStyle = {
      maxHeight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      backgroundColor: '#EEE',
      float: 'left'
    }
    if (callsActive) {
      contentStyle = {
        maxHeight: '500px'
      }
    }

    let iconStyle = {
      marginRight: '10px',
      marginLeft: '2px',
      fontSize: '20px',
      verticalAlign: 'middle',
      float: "left"
    }
    let headerTextStyle = {
      verticalAlign: 'middle',
      float: 'left'
    }


    let callIds = Object.keys(calls);

    if(callIds.length === 0) {

      return (
        <div style={{height: 'calc(100% - 35px)', position: 'relative'}}>
          <div className="call-header" onClick={this.toggleContent.bind(this)}>
            <i style={iconStyle} className="fa fa-phone" aria-hidden="true"></i>
            <span style={headerTextStyle}>
              No Calls
            </span>
          </div>

          <MakeCallForm />
        </div>
      );

    } else {
      let callTabs = [];
      for(let i = 0; i < callIds.length; i++) {
        let call = calls[callIds[i]];

        let callVariable1 = "";
        if(call.callVariables && call.callVariables["callVariable1"]) {
          callVariable1 = call.callVariables["callVariable1"]
        }

        let formattedCallTime = '';
        let elapsedTime = this.state.now - call.startedAt;
        if (elapsedTime < 0) {
          elapsedTime = 0;
        }
        formattedCallTime = moment.duration(elapsedTime);
        formattedCallTime = formattedCallTime.format('mm:ss', { trim: false });

        if (!this.state.timer) {
          this.startCallTimer.apply(this);
        }

        callTabs.push(
          <div className="call-tab">
            <div className="call-header">
              <i style={iconStyle} className="fa fa-phone header-phone-icon" aria-hidden="true"></i>
              <span className="header-other-party" style={headerTextStyle}>
                {call.otherParty} ({formattedCallTime})
              </span>
              <AnswerButton call={call}/>
              <HangupButton call={call}/>
              <ConferenceButton call={call}/>
              <TransferButton call={call}/>
              <ResumeButton call={call}/>
              <HoldButton call={call}/>
            </div>

            <div className="call-content" style={contentStyle}>
              <div>{"CallVariable1: " + callVariable1}</div>
            </div>
          </div>
        );
      }

      return (
        <div style={{height: 'calc(100% - 35px)', position: 'relative'}}>
          {callTabs}
          <MakeCallForm />
        </div>
      );
    }
  }
}

class RecentCalls extends Component {

  render() {

    let ulStyle = {
      listStyleType: "none",
      border: "1px solid gray"
    }

    let recentCallComponents = []
    for(let i = 0; i < this.props.recentCalls.length; i++) {
      let recentCall = this.props.recentCalls[i];
      recentCallComponents.push(
        <RecentCall call={recentCall}/>
      );
    }

    var noRecentsStyle = {
      marginTop: "5px",
      width: "100%",
      textAlign: "center",
      padding: "40px",
      color: "darkslategray"
    };

    return (
      <div id="recent_calls">
        {
          recentCallComponents.length > 0 ? (
            <ul style={ulStyle}>
              {recentCallComponents}
            </ul>
          ) : (<div style={noRecentsStyle}> No Recent Calls </div>)
        }
      </div>
    )
  }
}

class RecentCall extends Component {
  handleMakeCall() {
    call(this.props.call.otherParty);
  }

  render() {

    let liStyle = {
      border: "1px solid gray"
    }

    let callButtonStyle = {
      display: "inline-block",
      marginLeft: "60px"
    }

    let callButton = (
      <div style={callButtonStyle} onClick={this.handleMakeCall.bind(this)}>
        Call
      </div>
    )
    return (
      <li style={liStyle}>{this.props.call.otherParty} {callButton}</li>
    )
  }
}

class HoldButton extends Component {

  render() {
    var call = this.props.call;
    if (call.state === "ACTIVE" && !call.held) {
      return <CallControlButton type="hold" function={hold.bind(null, call)} icon="pause"/>
    }
    return null;
  }

}

class ResumeButton extends Component {

  render() {
    let icon = <i className="fa fa-play button-icon resume" aria-hidden="true"></i>;
    let call = this.props.call;
    var otherCall = getOtherCall(call);
    if(otherCall && otherCall.state !== "ACTIVE") {
      return null;
    }
    if (call.state === "ACTIVE" && call.held) {
      return <CallControlButton type="resume" function={resume.bind(null, call)} icon={icon} dontUseSvg={true}/>
    }
    return null;
  }

}

class HangupButton extends Component {

  render() {
    var call = this.props.call;
    if ( (call.direction === "outbound" || call.state === "ACTIVE") && (!call.held) ) {
      return <CallControlButton  type="hangup" function={hangup.bind(null, call)} icon="end"/>
    }
    return null;
  }
}

class AnswerButton extends Component {

  render() {
    var call = this.props.call;
    if(call.direction === "inbound" && call.state === "ALERTING" )  {
      return <CallControlButton
            type="answer"
            function={answer.bind(null, call)}
            icon="answer"/>
    }

    return null;
  }

}

class ConferenceButton extends Component {

  render() {
    let icon =  <i className="fa fa-users button-icon conference" aria-hidden="true"></i>;
    var call = this.props.call;
    var otherCall = getOtherCall(call);
    if(call.line === 1 && otherCall && !otherCall.held)  {
      return <CallControlButton
            type="conference"
            function={conference.bind(null)}
            icon={icon}
            dontUseSvg={true} />
    }

    return null;
  }

}

class TransferButton extends Component {

  render() {
    var call = this.props.call;
    var otherCall = getOtherCall(call);
    if(call.line === 1 && otherCall && !otherCall.held)  {
      return <CallControlButton
            type="transfer"
            function={transfer.bind(null)}
            icon="transfer"/>
    }

    return null;
  }

}


class CallControlButton extends Component {
  render() {
    let icon = "";
    if(this.props.dontUseSvg) {
      icon = this.props.icon;
    } else {
      icon = <SvgIcon name={this.props.icon} />
    }
    return (
      <a className="round-button" id={this.props.type + "-but"} onClick={this.props.function}>
        <span className={"icon-container " + this.props.type}>
          {icon}
        </span>
      </a>
    )
  }

  componentDidMount() {
    if(this.props.type === "answer") {
      playInboundRingingMusic();
    }
  }

  componentWillUnmount() {
    if(this.props.type === "answer") {
      stopInboundRingingMusic();
    }
  }
}


function SvgIcon(props) {
  return <svg dangerouslySetInnerHTML={{__html: '<use xlink:href="#' + props.name + '"/>' }} />;
}

class MakeCallForm extends Component {

  constructor() {
    super();

    this.state = { value: '' };
  }

  handleMakeCall() {
    console.log("Handling make call...");
    if(Object.keys(calls).length === 1) {
      consult(this.state.value);
    } else {
      call(this.state.value);
    }
    this.setState({value: ''});
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  _handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleMakeCall();
    }
  }

  render() {

    let callIds = Object.keys(calls);

    var callButtonText = "CALL";
    if(callIds.length > 0) {
      callButtonText = "ADD";
    }

    if(callIds.length === 0 || (callIds.length === 1 && !calls[callIds[0]].held) ) {
      return (
        <div className="tab-content make-call" data-structure="make-call"
          style={{
            display: 'block',
            position: 'absolute',
            width: '100%',
            bottom: '5px'
          }}
        >
          <form>
            <input onChange={this.handleChange.bind(this)}
              id="dial_num" type="tel" placeholder="Enter a Number to Dial"
              value={this.state.value}
              onKeyPress={this._handleKeyPress.bind(this)}
            />
            <a onClick={this.handleMakeCall.bind(this)} className="cta hybrid">
              <i className="fa fa-phone" aria-hidden="true"></i>
                <span>{callButtonText}</span>
            </a>
          </form>
        </div>
      )
    } else {
      return null;
    }
  }
}

export default App;

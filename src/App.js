import React, { Component } from 'react';
import moment from "moment";
//import ReactDOM from 'react-dom';
import './App.css';
import $ from "jquery";
import xmlToJSON from "./vendor/xmlToJSON";
import AgentHeader from './components/agent_header';
import LoginDialog from './components/login_dialog';
import HomeView from './components/home/home_view';
import Tabs from './components/tabs';
import DialpadView from './components/home/dialpad';
import RecentCallsView from './components/recent_calls';
import Finesse from './finesse_apis/finesse_api';
import FinessePhoneApi from './finesse_apis/finesse_phone_api';
import FinesseStateApi from './finesse_apis/finesse_state_api';
import FinesseTunnelApi from './finesse_apis/finesse_tunnel_api';
import FinesseReasonCodesApi from './finesse_apis/finesse_reason_codes_api';
import "./polyfills";
import getQueryParameter from "./query_params";
import SnowApi from './snow_api';

import LogRocket from 'logrocket';

let maxRecentCalls = 100;

var clientType = decodeURIComponent(getQueryParameter("client") || "default");
var script = document.createElement('script');
var zaf_client = null;
if (clientType === "sforce") {
  script.onload = function() {
    loadPlugin();
  };
  script.src = "https://c.na30.visual.force.com/support/api/42.0/lightning/opencti_min.js";

  document.head.appendChild(script); //or something of the likes
} else if (clientType === "zen"){
  script.onload = function () {
    loadPlugin();
    zaf_client = window.ZAFClient.init();
    zaf_client.invoke('resize', { width: '300px', height: '350px' });
    zaf_client.metadata().then(function(metadata) {
      console.log(metadata.settings);
    });
  };
  script.src = "https://static.zdassets.com/zendesk_app_framework_sdk/2.0/zaf_sdk.min.js";

  document.head.appendChild(script); //or something of the likes
} else {
  loadPlugin();
}

function loadPlugin() {
  window.moment = moment;
  window.Finesse = Finesse;
  window.ClientType = clientType || "snow";

  let env = getQueryParameter("ENV");
  let logRocketApp = "cloverhound/snow-finesse";
  if (env) {
    logRocketApp += "-" + env;
  }
  LogRocket.init(logRocketApp,  {
    // Scrub Auth header from all logged requests.
    network: {
      requestSanitizer: function (request) {
        request.headers['Authorization'] = "**HIDDEN**";
        return request;
      }
    }
  });

  window.reportError = function(message) {
    if (!LogRocket && !LogRocket.captureMessage) {
      return;
    }

    LogRocket.captureMessage(message);
  }
  //LogRocket.startNewSession();

  window.finesseUrl = "";
  window.finesseUrlWithoutPort = "";
  window.tabNames = {HOME: 1, RECENTS: 2, DIALPAD: 3, CONTACTS: 4};  // I forsee dialpad and contacts in the future
  Finesse.resetAgent();
  window.entityTemplate = "incident";
  window.queryTemplate = "sysparm_query=number=INC00{{callVariable1}}"

  window.$ = $;
}

function handleCommunicationEvent(context) {
  console.log("Communication from Topframe", context);

  if(context.type === "OUTGOING_CALL" && context.phoneNumber) {
    if (!Finesse.agent || !Finesse.agent.state || Finesse.agent.state === 'LOGOUT') {
      console.warn("Not logged in, ignoring click to call.");
      return;
    }

    FinessePhoneApi.call(Finesse.agent, context.phoneNumber);
    window.openFrameAPI.show();
  } else {
    console.log("Unknown communication type.");
  }
}
function handleOpenFrameShownEvent(context) {
  rerender(Finesse.agent);
}
function handleOpenFrameHeaderIconClick(context) {
  console.log("Icon clicked:", context);

  if (context.id === 101 && window.toggleLogoutMenu) {
    window.toggleLogoutMenu()
  }
}
function getSforceConfig(){
  var SFGScallback = function(response) {
    if (response.success) {
      window.sforceConfig = response.returnValue;
      console.log('API method call executed successfully! returnValue:',
        window.sforceConfig["/reqGeneralInfo/finesseUrl"]);
        var conf = {}
        conf.finesseUrl = window.sforceConfig["/reqGeneralInfo/finesseUrl"]
          setupFinesseUrl(conf);
    } else {
      console.error('Something went wrong! Errors:', response.errors);
    }
  };
  window.sforce.opencti.getCallCenterSettings({callback: SFGScallback});
}
function getZenConfig(){

}
function SforceScreenPop(){
  var callback = function(response) {
    if (response.success) {
      console.log('API method call executed successfully! returnValue:',
      response.returnValue);
    } else {
      console.error('Something went wrong! Errors:', response.errors);
    }
  };
//Invokes API method
  window.sforce.opencti.searchAndScreenPop({ searchParams : 'Chad',queryParams : '', callType : window.sforce.opencti.CALL_TYPE.INBOUND, deferred: false, callback : callback });
}
function openFrameInitSuccess(snConfig) {
  window.openFrameConfig = snConfig;
  console.log("openframe configuration", snConfig);

  var config = {}

  var paramsList = snConfig.configuration.split("\n");
  for(var i = 0; i < paramsList.length; i++) {
    if (paramsList[i].startsWith("#") || paramsList[i].trim() === "") {
      continue;
    }

    var keyValue = paramsList[i].split("=");

    if (keyValue.length <= 1) {
      continue;
    }

    var key = keyValue[0].trim();
    var value = keyValue[1];
    if (keyValue.length > 2) {
      for(var j = 2; j < keyValue.length; j++) {
        value += ("="+keyValue[j]);
      }
    }
    value = value.trim();

    config[key] = value;
  }

  if(config.enableManualScreenPop) {
    config.enableManualScreenPop = (config.enableManualScreenPop.toLowerCase() === 'true')
  }

  if (config.query) {
    window.queryTemplate = config.query;
  }
  if (config.entity) {
    window.entityTemplate = config.entity;
  }

  console.log("Loaded config from OpenFrame:", config);

  setupFinesseUrl(config)

  if (config.maxRecentCalls && !isNaN(Number(config.maxRecentCalls))) {
    maxRecentCalls = Number(config.maxRecentCalls);
  }

  if (config.dialPrefix && config.dialPrefix !== "") {
    FinessePhoneApi.dialPrefix = config.dialPrefix;
  }

  window.OpenFrame = {
    available: false,

    config: config,

    init() {
      if (window.openFrameAPI) {
        console.log("OpenFrame API detected, initializing.");
        window.openFrameAPI.init({ height: 350, width: 350 }, this.initSuccess, this.initFailure);
      } else {
        console.log("Not running in OpenFrame.");
        Finesse.setupUrl({});
      }
    },

    initSuccess() {

    },

    initFailure() {

    },

    handleCommunicationEvent(context) {
      console.log("Communication from Topframe", context);
      if(context["phone_number"]) {
        FinessePhoneApi.call(Finesse.agent, context["phone_number"].replace(/[-]/g, ""));
        window.openFrameAPI.show();
      }
    }
  }

  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.COMMUNICATION_EVENT,
    handleCommunicationEvent);
  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.OPENFRAME_SHOWN,
    handleOpenFrameShownEvent);
  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.HEADER_ICON_CLICKED,
    handleOpenFrameHeaderIconClick);
}
function openFrameInitFailure(error) {
  console.log("Error: OpenFrame init failed:", error);

  //window.openFrameAPI = null;
  if (getQueryParameter("finesseUrl") && getQueryParameter("finesseUrl") !== "") {
    setupFinesseUrl({});
  } else {
    setTimeout(initialize, 500);
  }
}

function setupFinesseUrl(config) {
  Finesse.setupUrl(config);
  return;
}

function login() {
  console.log("Logging in...");

  Finesse.resetAgent();
  Finesse.agent.loggingIn = true;
  rerender(Finesse.agent);

  var form = document.getElementById("login-form");
  Finesse.agent.username = form.elements["username"].value;
  Finesse.password = form.elements["password"].value;
  Finesse.agent.extension = String(form.elements["extension"].value);
  //FinesseTunnelApi.connect(Finesse.agent);

  console.log(Finesse.agent.username, Finesse.agent.extension);

  LogRocket.identify(Finesse.agent.username, {
    extension: Finesse.agent.extension,
  });

  if(!Finesse.agent.username || !Finesse.password) {
    handleLoginFailed("Username and password required.");
    return false;
  }

  if(!Finesse.agent.extension) {
    handleLoginFailed("Extension required.");
    return false;
  }

  $.ajax({
    url: Finesse.url.full + '/finesse/api/User/' + Finesse.agent.username,
    type: "GET",
    cache: false,
    dataType: "xml",
    timeout: 6000,
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(Finesse.agent.username, Finesse.password));
    },
    success: function() {
      FinesseReasonCodesApi.setReasonCodes(Finesse.agent);
      FinesseTunnelApi.connect(Finesse.agent);
    },
    error: function(req, status, err) {
      if (status === "timeout") {
        console.error("Timed out testing agent credentials:", status, err);
        window.reportError("Timed out testing agent credentials: " + status + ", " + err);
        handleLoginFailed("Can't reach Finesse, contact support.");
        return;
      }
      if (status === "parsererror") {
        console.error("Error parsing result while testing agent credentials:", status, err);
        window.reportError("Error parsing result while testing agent credentials: " + status + ", " + err);
        handleLoginFailed("There was an error reaching Finesse, contact support.");
        return;
      }

      console.warn("Error testing agent credentials:", status, err);
      handleLoginFailed("Invalid Credentials");
    },
    complete: function() {
      if  (window.sforce){
      rerender(Finesse.agent);
    }
      return false;
     }
  });
}

window.addEventListener("message", receiveMessage, false);

function pushLoginToFinesse(username, password, extension) {
  console.log("Pushing login to finesse with username: " + username);



  FinesseStateApi.updateAgentState(function () {
    if (Finesse.agent.state !== "LOGOUT") {
      Finesse.reloadRecentCalls();
      return;
    }

    var xml = '<User>' +
              ' <state>LOGIN</state>' +
              ' <extension>' + extension + '</extension>' +
              '</User>';

    $.ajax({
      url: Finesse.url.full + '/finesse/api/User/' + username,
      type: 'PUT',
      data: xml,
      contentType: "application/xml",
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', make_base_auth(username, password));
      },
      success: function(data) {
        FinesseStateApi.updateAgentState();
        Finesse.reloadRecentCalls();
        console.log("Successfully submitted login request:", data);
      },
      error: function(req, status, err) {
        console.error("Error logging in to Finesse:", status, err);
        window.reportError("Error logging in to Finesse: " + status + ", " + err);
        handleLoginFailed("Error logging in to Finesse.");
      }
    });
  });
}

function handleLoginFailed(reason)
{
  console.log("Handling login failure with reason: " + reason);
  FinesseTunnelApi.disconnect(Finesse.agent);
  Finesse.agent.previousLoginFailed = {reason: reason}
  Finesse.agent.loggingIn = false;
  rerender(Finesse.agent);
}


function receiveMessage(event)
{
  console.log("Received from tunnel:", event.data);

  if (event.data === "4|connected") {
    FinesseTunnelApi.state = "connected";
    pushLoginToFinesse(Finesse.agent.username, Finesse.password, Finesse.agent.extension);
  }

  if (event.data === "4|unauthorized") {
    handleLoginFailed("Invalid Credentials");
  }

  if(event.data === "4|disconnected") {
    FinesseTunnelApi.state = "disconnected";
    console.log("Received disconnected event...");
    if(Finesse.agent.state !== "LOGOUT" && !Finesse.agent.loggingOut) {
      console.log("Reconnecting because logged in and not logging out, so shouldnt have disconnected");
      FinesseTunnelApi.connect(Finesse.agent);
      return;
    }

    window.rerender(null);
  }

  if (!event.data || !event.data.split) {
    return;
  }

  let eventData = event.data.split("|");
  let eventCode = eventData[0];
  let eventValue = eventData[1];

  if (eventData.length < 2) {
    return;
  }

  if (eventCode === "4" && eventValue === "conflict") {
    console.warn("Agent logged in on another screen.");
    window.rerender(null);
  }

  if (eventCode === "0") {
    if (FinesseTunnelApi.state !== "connected") {
      console.log("Tunnel not connected, ignoring data update.");
      return;
    }

    var dataString = event.data.split('|')[1];
    dataString = dataString.replace(/^[^<]+/, '')
    var data = xmlToJSON.parseString(dataString, { childrenAsArray: false });
    console.log(data);


    if (data.Update.data.apiErrors && Finesse.agent.state === "LOGOUT") {
      let errorMessage = data.Update.data.apiErrors.apiError.errorType._text;

      if (errorMessage === "Invalid Device") {
        handleLoginFailed("Invalid Extension");
      } else {
        console.error("Received API error while logging in to Finesse:", errorMessage);
        window.reportError("Received API error while logging in to Finesse: " + errorMessage);
        handleLoginFailed(errorMessage);
      }
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
        default:
          console.warn("Unknown dialogs update type:", data.Update.event._text);
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
        default:
          console.warn("Unknown dialog update type:", data.Update.event._text);
      }

    }
  }
}


function deleteCall(id) {
  console.log("Deleting call with id: " + id + " from calls: ", Finesse.agent.calls);
  let recentCall = getRecentCallById(id);
  if(recentCall && !recentCall.endTime) {
    recentCall.endedAt = moment();
    recentCall.duration = recentCall.endedAt.diff(recentCall.startedAt);

    Finesse.saveRecentCalls();
  }
  delete Finesse.agent.calls[id];
  console.log("Agent: ", Finesse.agent);
}

function getRecentCallById(id) {
  console.log("Getting recent call by id");

  for(let i = 0; i < Finesse.agent.recentCalls.length; i++) {
    let recentCall = Finesse.agent.recentCalls[i];
    if(recentCall.id === id) {
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
  setAgentFieldFromUserUpdate('firstName', updatedAgent, "String");
  setAgentFieldFromUserUpdate('lastName', updatedAgent, "String");
  setAgentFieldFromUserUpdate('loginId', updatedAgent, "String");
  setAgentFieldFromUserUpdate('loginName', updatedAgent, "String");
  setAgentFieldFromUserUpdate('teamName', updatedAgent, "String");
  setAgentFieldFromUserUpdate('extension', updatedAgent, "String");

  LogRocket.identify(Finesse.agent.username, {
    firstName: Finesse.agent.firstName,
    lastName: Finesse.agent.lastName,
    name: Finesse.agent.firstName + " " + Finesse.agent.lastName,
    teamName: Finesse.agent.teamName,
    loginId: Finesse.agent.loginId,
    loginName: Finesse.agent.loginName
  });

  rerender(Finesse.agent);
}
window.handleUserUpdate = handleUserUpdate;

function handleApiErrors(apiErrors) {
  var errorMessage = apiErrors.apiError.errorMessage._text;
  var errorType = apiErrors.apiError.errorType._text;

  console.error("Received API error:", errorType,  errorMessage);
  window.reportError("Received API error: " + errorType + ", " + errorMessage);


  if (shouldIgnoreError(errorType, errorMessage)) {
    return;
  }

  alert(errorMessage + " - " + errorType);
}

function shouldIgnoreError(type, message) {
  return true;
}

function handleAllDialogsUpdated(dialogs) {
  var dialog = dialogs.Dialog;
  handleDialogUpdated(dialog);
}

function handleDialogUpdated(dialog) {
  console.log("Handling dialog updated..", dialog);

  if (!dialog.id) {
    console.log("No id in dialog update, ignoring (probably just DTMF sent).");
    return;
  }

  let calls = Finesse.agent.calls;

  var id = dialog.id._text;

  if(calls[id]) {
    console.log("Updating existing call:", calls[id]);
  } else {
    console.log("Creating new call");
  }

  calls[id] = calls[id] || {};
  var call = calls[id];

  if (!call.line) {
    call.line = Object.keys(calls).length;
  }

  call.id = String(id);
  call.startedAt = call.startedAt || new Date();
  call.held = call.held || false;
  call.from = String(dialog.fromAddress._text);
  call.to = String(dialog.toAddress._text) || call.to;
  call.state = dialog.state._text;
  call.callType = dialog.mediaProperties.callType._text;

  var participantState = getParticipantState(dialog);

  if(participantState === "HELD") {
    call.held = true;
  }
  if(participantState === "ACTIVE") {
    call.held = false;
  }

  call.type = dialog.mediaProperties.callType._text;

  if (call.from === Finesse.agent.extension) {
    call.otherParty = call.to;
    call.direction = "outbound";
  } else {
    call.otherParty = call.from;
    call.direction = "inbound";
  }

  if (call.otherParty === "null") {
    call.otherParty = null;
  }

  // sys_user
  // sysparm_view=screenpop&sysparm_query=phoneLIKE9803338415
  // sysparm_view=screenpop&sysparm_query=employee_number=1234567

  call.callVariables = call.callVariables || {};
  var callVariables = dialog.mediaProperties.callvariables.CallVariable;
  var query = window.queryTemplate;
  var entity = window.entityTemplate;
  for(var i = 0; i < callVariables.length; i++) {
    var value = callVariables[i].value._text;
    var name = callVariables[i].name._text;

    query = query.replace("{{" + name + "}}", value);
    entity = entity.replace("{{" + name + "}}", value);

    call.callVariables[name] = value;
  }

  query = query.replace("{{from}}", call.from);
  entity = entity.replace("{{from}}", call.from);

  query = query.replace("{{to}}", call.to);
  entity = entity.replace("{{to}}", call.to);

  query = query.replace("{{direction}}", call.direction);
  entity = entity.replace("{{direction}}", call.direction);

  query = query.replace("{{username}}", Finesse.agent.username);
  entity = entity.replace("{{username}}", Finesse.agent.username);

  query = query.replace("{{extension}}", Finesse.agent.extension);
  entity = entity.replace("{{extension}}", Finesse.agent.extension);

  if(call.to && !recentCallExists(call)) {
    addCallToRecentsList(call);
  } else {
    console.log("Not adding to recents list");
    console.log("call.to: ", call.to);
  }

  console.log("Updated call:", call)
  rerender(Finesse.agent);

  let shouldPop = !call.alreadyPopped && call.direction === "inbound" && window.openFrameAPI
  if(Object.keys(calls).length > 1 && !Finesse.agent.shouldPopConcurrently) {
    shouldPop = false;
    // We don't want to ever pop this call
    call.alreadyPopped = true;
  }

  if(shouldPop) {
    console.log("Screen-popping form", window.entityTemplate, query, call);
    window.openFrameAPI.openServiceNowForm({entity: window.entityTemplate, query: query });
    call.alreadyPopped = true;
  }

  if(call.direction === "inbound" && call.state === "ALERTING" && window.openFrameAPI) {
    window.openFrameAPI.show();
  }
  if (call.direction === "inbound" && call.state === "ALERTING" && window.sforce){
    SforceScreenPop();
  }
}

function getParticipantState(dialog) {
  console.log("Getting participant state for dialog: ", dialog);
  var participants = dialog.participants.Participant;
  for(var i = 0; i < participants.length; i++) {
    if(String(participants[i].mediaAddress._text) === Finesse.agent.extension) {
      console.log("Returning participant state: " + participants[i].state._text);
      return participants[i].state._text;
    }
  }
  console.log("No participant state found");
  return false;
}

function addCallToRecentsList(call) {
  console.log("Adding call to recents list", call);
  let recentCalls = Finesse.agent.recentCalls;

  if(recentCalls.length === maxRecentCalls) {
    recentCalls = Finesse.agent.recentCalls.splice(0, 1);
  }

  recentCalls.push(call);
  Finesse.saveRecentCalls();

  console.log("Recent calls updated:", recentCalls);
}

function recentCallExists(call) {
  let recentCalls = Finesse.agent.recentCalls;
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

  rerender(Finesse.agent);
}

function handleAllDialogsDeleted(dialogs) {
  console.log("Handling all dialogs deleted with dialogs:", dialogs)

  deleteCall(dialogs.Dialog.id._text)

  rerender(Finesse.agent);
}

function disconnectSession() {
  Finesse.agent.loggingOut = false;
  Finesse.agent.loggingIn = false;
  Finesse.agent.previousLoginFailed = false;
  Finesse.agent.state = "LOGOUT";
  FinesseTunnelApi.disconnect(Finesse.agent);
}

// Helps convert the xmlToJSON results to regular properties
function setAgentFieldFromUserUpdate(fieldName, userObject, type) {
  let previousState = Finesse.agent["state"]
  let value = (userObject[fieldName] && userObject[fieldName]._text) || null;
  if (value && type === "String") {
    value = String(value);
  }

  if(fieldName === "stateChangeTime" && Finesse.agent[fieldName] !== value) {
    window.Finesse.agent.localStateChangeTime = new Date();
  }


  Finesse.agent[fieldName] = value;
  let currentState = Finesse.agent["state"]
  if(previousState !== "LOGOUT" && currentState === "LOGOUT") {
    disconnectSession();
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
    Finesse.agent.reasonCode = reasonCode;
    console.log("Done updating reason code: ", reasonCode);
  } else {
    console.log("Reason code is NOT included in the user update");
    Finesse.agent.reasonCode = null;
  }
}


$("#dial_num").on('keyup', function (e) {
    if (e.keyCode === 13) {
//TODO do something here?
    }
});

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

function rerender(agent) {
  console.log("Rerendering with agent: ", agent);
  window.MainApp.updateAgent(agent);
  // ReactDOM.render(
  //   <App agent={agent} />,
  //   document.getElementById('root')
  // );


}
window.rerender = rerender;

function initialize() {
  if (getQueryParameter("finesseUrl") && getQueryParameter("finesseUrl") !== "") {
    setupFinesseUrl({});
  } else if (window.openFrameAPI) {
    console.log("OpenFrame API detected, initializing.");
    window.openFrameAPI.init({ height: 350, width: 350 }, openFrameInitSuccess, openFrameInitFailure);
  } else if (window.sforce){
    console.log("Salesforce API detected, initializing.");
    getSforceConfig();
  } else if (window.ZAFClient){
    console.log("Zendesk API detected, initializing.");
    getZenConfig();
  } else {
    console.log("Not running in OpenFrame, delaying.");
    setTimeout(initialize, 500);
    //setupFinesseUrl({});
  }
}

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      agent: this.props.agent,
      digits: ""
    };

    window.MainApp = this;
  }

  componentWillMount() {
    initialize();
  }

  updateAgent(agent) {
    this.setState({ agent: agent });
  }

  updateDigits(digits) {
    this.setState({ digits: digits });
  }

  addDigit(digit) {
    this.setState({ digits: this.state.digits + digit });
  }

  handleLogin(event) {
    event.preventDefault();
    return login();
  }



  render() {
    let agent = this.state.agent || {};
    let loggedIn = agent.state && agent.state !== 'LOGOUT'

    if(!loggedIn) {
      return (
          <div id="main">
              <LoginDialog handleLogin={this.handleLogin} previousLoginFailed={agent.previousLoginFailed} loading={agent.loggingIn}/>
              <div style={{
                  padding: '10px',
                  width: '100%',
                  position: 'absolute'
                }}>
                <a href="https://cloverhound.com/" target="_blank" className="logo"
                  style={{
                    display: 'block',
                    textAlign: 'center'
                  }}>
                  <img alt="Cloverhound, Inc." src="logo_with_name.png"
                    style={{
                      width: '120px',
                      marginRight: '6px'
                    }} />
                </a>

                <a href="https://cloverhound.com/" target="_blank" className="copyright"
                    style={{
                      marginTop: '4px',
                      fontSize: '0.5em',
                      textDecoration: 'none',
                      color: '#8a8a8a',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      display: 'block'
                    }}>
                  © 2018 Cloverhound Inc.
                </a>
              </div>
          </div>
      );
    } else {
      return (
          <div id="main">
              <AgentHeader agent={agent} stateApi={FinesseStateApi} type={window.ClientType}/>
              <HomeView agent={agent} digits={this.state.digits} tabNames={window.tabNames} phoneApi={FinessePhoneApi} stateApi={FinesseStateApi} snowApi={SnowApi} type={window.ClientType}/>
              <DialpadView agent={agent} digits={this.state.digits} tabNames={window.tabNames} phoneApi={FinessePhoneApi} type={window.ClientType}/>
              <RecentCallsView agent={agent} phoneApi={FinessePhoneApi} tabNames={window.tabNames} type={window.ClientType}/>
              <Tabs agent={agent} rerender={rerender} tabNames={window.tabNames}/>
          </div>
      );
    }
  }
}

export default App;

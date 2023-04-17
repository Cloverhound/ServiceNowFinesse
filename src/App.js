import React, { Component } from 'react';
import moment from "moment";
//import ReactDOM from 'react-dom';
import './App.css';
import $ from "jquery";
import xmlToJSON from "./vendor/xmlToJSON";
import AgentHeader from './components/agent_header';
import LoginDialog from './components/login_dialog';
import LoadingDialog from './components/loading_dialog';
import HomeView from './components/home/home_view';
import CallerView from './components/caller_view';
import Tabs from './components/tabs';
import DialpadView from './components/home/dialpad';
import ContactsView from './components/home/contacts';
import Contacts_helper from './components/home/Contacts_helper';
import RecentCallsView from './components/recent_calls';
import Finesse from './finesse_apis/finesse_api';
import FinessePhoneApi from './finesse_apis/finesse_phone_api';
import FinesseStateApi from './finesse_apis/finesse_state_api';
import FinesseTunnelApi from './finesse_apis/finesse_tunnel_api';
import FinesseReasonCodesApi from './finesse_apis/finesse_reason_codes_api';
import Finesse_Phonebook from './finesse_apis/finesse_phonebookapi';
import "./polyfills";
import getQueryParameter from "./query_params";
import { parseNumber } from 'libphonenumber-js';

import PluginApi from './plugin_api';

import LogRocket from 'logrocket';

let maxRecentCalls = 100;
var contacts_list_global = null;
var contacts_loaded = false;

var clientType = decodeURIComponent(getQueryParameter("client") || "default");
var script = document.createElement('script');
var scriptLoad = 0;
console.log("Cloverhound Salesforce Finesse Plugin Version 1.0.1-00004");
if (clientType === "sforce") {
  scriptLoad = 1;
  script.src = "https://c.na30.visual.force.com/support/api/45.0/lightning/opencti_min.js";
  document.head.appendChild(script); //or something of the likes
  loadPlugin();
} else {
  loadPlugin();
}

window.FinessePhoneApi = FinessePhoneApi;

function loadPlugin() {
  window.moment = moment;
  window.Finesse = Finesse;
  window.ClientType = clientType || "snow";
  window.FinessePlugin = {
    type: clientType || "snow",
    initialized: false,
    config: {},
    stateUpdated: PluginApi.stateUpdated,
    callStarted: PluginApi.callStarted,
    callUpdated: PluginApi.callUpdated,
    callEnded: PluginApi.callEnded,
    screenPop: PluginApi.screenPop,
    showWindow: PluginApi.showWindow,
    hideWindow: PluginApi.hideWindow
  }

  let logRocketDisabled = getQueryParameter("logRocketDisabled");
  if (!logRocketDisabled) {
    console.log("Loading LogRocket ...")
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
  } else {
    console.log("LogRocket disabled")
  }

  window.finesseUrl = "";
  window.finesseUrlWithoutPort = "";
  window.tabNames = { HOME: 1, CALLER: 2, RECENTS: 3, DIALPAD: 4, CONTACTS: 5 };  // contacts for future use
  Finesse.resetAgent();
  window.entityTemplate = "incident";
  window.queryTemplate = "sysparm_query=number=INC00{{callVariable1}}"

  window.$ = $;
}

function handleClickToCallEvent(event) {
  console.log("Communication from Topframe", event);

  if(event.phoneNumber) {
    if (!Finesse.agent || !Finesse.agent.state || Finesse.agent.state === 'LOGOUT') {
      console.warn("Not logged in, ignoring click to call.");
      return;
    }

    FinessePhoneApi.call(Finesse.agent, event.phoneNumber);
    window.FinessePlugin.showWindow();
  } else {
    console.log("Missing phone number in click-to-call event.");
  }
}

function handleUpdateCallDataEvent(event) {
  console.log("Call data update event:", event);

  if (!event.variables) {
    console.warn("Missing variables in call data update event.");
    return;
  }

  var call = FinessePhoneApi.getCallById(Finesse.agent, event.callId);
  if (!call) {
    console.warn("Call not found for call data update event:", event.callId);
    return;
  }

  if (call.state === "ALERTING") {
    Finesse.pendingCallUpdate = {
      id: call.id,
      variables: event.variables
    }
    return;
  }

  FinessePhoneApi.updateCallVariables(Finesse.agent, call, event.variables);
}

function handleFrameShownEvent() {
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
        var conf = {};
        conf.finesseUrl = window.sforceConfig["/reqGeneralInfo/finesseUrl"];
        conf.tunnelPort = window.sforceConfig["/reqGeneralInfo/tunnelPort"];
        conf.tunnelPath = window.sforceConfig["/reqGeneralInfo/tunnelPath"];
        conf.tunnelMode = window.sforceConfig["/reqGeneralInfo/tunnelMode"];
        conf.dialPrefix = {};
        conf.dialPrefix.default = window.sforceConfig["/reqDialingOptions.reqOutsidePrefix"] + "{countryCode}";
        conf.reqLongDistPrefix = window.sforceConfig["/reqDialingOptions.reqLongDistPrefix"];
        conf.reqInternationalPrefix = window.sforceConfig["/reqDialingOptions.reqInternationalPrefix"];
        setupFinesseUrl(conf);
        console.log("CONF", conf);
        window.FinessePlugin.config = conf;
        window.FinessePlugin.initialized = true;

        window.rerender(Finesse.agent);
    } else {
      console.error('Something went wrong! Errors:', response.errors);
    }
  };
  window.sforce.opencti.getCallCenterSettings({callback: SFGScallback});
}
function SforceScreenPop(call){
  var callback = function(response) {
    if (response.success) {
      console.log('API method call executed successfully! returnValue:',
      response.returnValue);
    } else {
      console.error('Something went wrong! Errors:', response.errors);
    }
  };
//Invokes API method
  // window.sforce.opencti.searchAndScreenPop({ searchParams : call.otherParty ,queryParams : '', callType : window.sforce.opencti.CALL_TYPE.INBOUND, deferred: false, callback : callback });
  console.log("Printing the call variables", call.callVariables);
  window.sforce.opencti.searchAndScreenPop({ searchParams :  call.callVariables["callVariable1"] + " OR " + call.otherParty, queryParams : '', callType : window.sforce.opencti.CALL_TYPE.INBOUND, deferred: false, callback : callback });


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

  if (config.dialPrefix && config.dialPrefix != "") {
    FinessePhoneApi.dialPrefix.default = config.dialPrefix;
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
        window.FinessePlugin.showWindow();
      }
    }
  }

  // window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.COMMUNICATION_EVENT,
  //   handleCommunicationEvent);
  // window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.OPENFRAME_SHOWN,
  //   handleOpenFrameShownEvent);
  // window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.HEADER_ICON_CLICKED,
  //   handleOpenFrameHeaderIconClick);
}
function openFrameInitFailure(error) {
  console.log("Error: OpenFrame init failed:", error);

  //window.openFrameAPI = null;
  if (getQueryParameter("finesseUrl") && getQueryParameter("finesseUrl") != "") {
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
  var form = document.getElementById("login-form");
  var username = form.elements["username"].value;
  var password = form.elements["password"].value;
  var extension = String(form.elements["extension"].value);
  var mobileAgentEnabled = String(form.elements["mobileAgentEnabled"] && form.elements["mobileAgentEnabled"].checked);
  var mobileAgentMode = String(form.elements["mobileAgentMode"] && form.elements["mobileAgentMode"].value) || null;
  var mobileAgentDialedNumber = String(form.elements["mobileAgentDialedNumber"] && form.elements["mobileAgentDialedNumber"].value) || null;

  var mobileAgentOptions = {
    enabled: mobileAgentEnabled === "true",
    mode: mobileAgentMode,
    dialedNumber: mobileAgentDialedNumber
  };

  console.log("Clicked login with:", username, extension, mobileAgentOptions);

  loginAgent(username, password, extension, mobileAgentOptions);
}

function loginAgent(username, password, extension, mobileAgentOptions) {
  console.log("Logging in...");

  Finesse.resetAgent();
  Finesse.agent.loggingIn = true;
  rerender(Finesse.agent);

  Finesse.agent.username = username;
  Finesse.password = password;
  Finesse.agent.extension = extension;
  Finesse.agent.mobileAgentOptions = mobileAgentOptions;
  //FinesseTunnelApi.connect(Finesse.agent, Finesse.url, window.FinessePlugin.config);
  
  console.log("Logging in:", Finesse.agent.username, Finesse.agent.extension, Finesse.mobileAgentOptions);

  LogRocket.identify(Finesse.agent.username, {
    extension: Finesse.agent.extension,
    mobileAgentOptions: mobileAgentOptions
  });

  if(!Finesse.agent.username || !Finesse.password) {
    handleLoginFailed("Username and password required.");
    return false;
  }

  if(!Finesse.agent.extension) {
    handleLoginFailed("Extension required.");
    return false;
  }

  if (Finesse.agent.mobileAgentOptions.enabled && !Finesse.agent.mobileAgentOptions.dialedNumber) {
    handleLoginFailed("Dialed number required for mobile agent mode.");
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
      FinesseTunnelApi.connect(Finesse.agent, Finesse.url, window.FinessePlugin.config);
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


function pushLoginToFinesse(username, password, extension, mobileAgentOptions) {
  console.log("Pushing login to finesse with:", username, extension, mobileAgentOptions);

  FinesseStateApi.updateAgentState(function () {
    if (Finesse.agent.state !== "LOGOUT") {
      Finesse.reloadRecentCalls();
      initializeClickToDial();
      return;
    }

    var xml = '<User>' +
              ' <state>LOGIN</state>' +
              ' <extension>' + extension + '</extension>';

    if (mobileAgentOptions.enabled) {
      xml +=  ' <mobileAgent>' +
              '  <mode>' + mobileAgentOptions.mode + '</mode>' +
              '  <dialNumber>' + mobileAgentOptions.dialedNumber + '</dialNumber>' +
              ' </mobileAgent>';
    }
    xml += '</User>';

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
        initializeClickToDial();

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

function initializeClickToDial() {
  if (window.sforce) {
    enableClickToDial();
    var ClickToCalllistener = function(payload) {
      console.log('Received click-to-call event: ' + payload);

      if (!payload.number) {
        console.warn("Missing phone number in click-to-call event.");
        return;
      }

      if (!Finesse.agent || !Finesse.agent.state || Finesse.agent.state === 'LOGOUT') {
        console.warn("Not logged in, ignoring click to call.");
        return;
      }

      FinessePhoneApi.call(Finesse.agent, payload.number);
      window.FinessePlugin.showWindow();
    };
    window.sforce.opencti.onClickToDial({listener: ClickToCalllistener});
  }
}

var ClickToCallback = function(response) {
  if (response.success) {
    console.log('API method call executed successfully! returnValue:', response.returnValue);
  } else {
    console.error('Something went wrong! Errors:', response.errors);
  }
};

function enableClickToDial() {
  window.sforce.opencti.enableClickToDial({callback: ClickToCallback});
}

var DisableClickToCallback = function(response) {
   if (response.success) {
      console.log('API method call executed successfully! returnValue:', response.returnValue);
   } else {
      console.error('Something went wrong! Errors:', response.errors);
   }
};

function disableClickToDial() {
  window.sforce.opencti.disableClickToDial({callback: DisableClickToCallback});
}

function handleLoginFailed(reason)
{
  console.log("Handling login failure with reason: " + reason);
  FinesseTunnelApi.disconnect(Finesse.agent);
  Finesse.agent.previousLoginFailed = {reason: reason}
  Finesse.agent.loggingIn = false;
  rerender(Finesse.agent);
}

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event) {
  console.log("Received message:", event);
  if (event.data.type) {
    handleParentWindowMessage(event);
  } else {
    handleFinesseTunnelMessage(event);
  }
}

console.log("Ready for frame events");
parent.window.postMessage({
  type: 'readyForConfig'
}, '*');

function handleParentWindowMessage(event) {
  switch (event.data.type) {
    case "config":
      window.FinessePlugin.origin = event.data.origin;
      handleFrameConfigEvent(event.data.config);
      break;
    case "callerInfo":
      handleCallerInfoEvent(event.data.info);
      break;
    case "clickToCall":
      handleClickToCallEvent(event.data);
      break;
    case "updateCallData":
      handleUpdateCallDataEvent(event.data);
      break;
    case "frameShown":
      handleFrameShownEvent();
      break;
    case "listContacts":
      handleListContactsEvent(event.data);
      break;
    case "proxy":
      // For use to receive events from the embedded caller info page and feed
      // them onwards to the parent window
      parent.window.postMessage(event.data.message, '*');
      break;
  }
}

//send postMessage upon load of script
//probably best to call this in contacts.js
//add debugging in to figure out just how things are traveling
//add finesse side of phonebook
// finesse api? will have to figure out how user is created d
function getContactsList(){
  return contacts_list_global;
}
function formatNumbers(contact_list){
  var returnlist = [];
  var numberPattern = /\d+/g;
  for(var i = 0; i < contact_list.length; i++){
    console.log("Parsed number: ");
    var parsed = parseNumber(contact_list[i].number, "US", { extended: true });
    if(parsed.ext){
      contact_list[i].number = parsed.ext;

    }else if(!parsed.possible || !parsed.phone){
      contact_list[i].number = contact_list[i].number;
    }else{
      contact_list[i].number = parsed.phone;

    }
    returnlist.push(contact_list[i]);
  }

  return returnlist;
}

function sort_arr(contact_list) {
    return contact_list.sort(function(a,b){
      if(a.firstName < b.firstName) { return -1; }
      if(a.firstName > b.firstName) { return 1; }
      return 0;
    });
}

function handleListContactsEvent(event) {
  //var finesse_phonebook = Finesse_Phonebook.get_finesse_phonebook(Finesse.agent);
  var sorted_list = sort_arr(event.info.contact_list)
  Finesse.agent.contacts = formatNumbers(sorted_list);
  window.rerender(Finesse.agent);
}

function handleFrameConfigEvent(config) {
  console.log("Frame configuration", config);

  if(config.enableManualScreenPop) {
    config.enableManualScreenPop = (config.enableManualScreenPop.toLowerCase() === 'true')
  }

  if (config.query) {
    window.queryTemplate = config.query;
  }
  if (config.entity) {
    window.entityTemplate = config.entity;
  }

  console.log("Loaded config from Frame:", config);

  setupFinesseUrl(config)

  if (config.maxRecentCalls && !isNaN(Number(config.maxRecentCalls))) {
    maxRecentCalls = Number(config.maxRecentCalls);
  }

  if (config.dialPrefix && config.dialPrefix != "") {
    FinessePhoneApi.dialPrefix.default = config.dialPrefix;
  }
  for (const prop in config) {
    if (!prop.startsWith("dialPrefix.")) {
      continue;
    }

    let propName = prop.split(".").slice(1).join(".");
    FinessePhoneApi.dialPrefix[propName] = config[prop];
  }

  window.FinessePlugin.config = config;
  window.FinessePlugin.initialized = true;

  window.rerender(Finesse.agent);

  // window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.COMMUNICATION_EVENT,
  //   handleCommunicationEvent);
  // window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.OPENFRAME_SHOWN,
  //   handleOpenFrameShownEvent);
  // window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.HEADER_ICON_CLICKED,
  //   handleOpenFrameHeaderIconClick);
}

function handleCallerInfoEvent(info) {
  Finesse.agent.callerInfo = info;
  window.rerender(Finesse.agent);
}

function handleFinesseTunnelMessage(event) {
  if (!event || !event.data) {
    return;
  }

  console.log("Received from tunnel:", event.data);

  if (event.data === "4|connected") {
    FinesseTunnelApi.state = "connected";
    pushLoginToFinesse(Finesse.agent.username, Finesse.password, Finesse.agent.extension, Finesse.agent.mobileAgentOptions);
  }

  if (event.data === "4|unauthorized") {
    handleLoginFailed("Invalid Credentials");
  }

  if(event.data === "4|disconnected") {
    FinesseTunnelApi.state = "disconnected";
    console.log("Received disconnected event...");

    if (window.FinessePlugin.config.showWindowOnLogout == "true") {
      window.FinessePlugin.showWindow();
    }

    if(Finesse.agent.state !== "LOGOUT" && !Finesse.agent.loggingOut) {
      console.log("Reconnecting because logged in and not logging out, so shouldnt have disconnected");
      FinesseTunnelApi.connect(Finesse.agent, Finesse.url, window.FinessePlugin.config);
      return;
    }

    if(!Finesse.agent.previousLoginFailed) {
      window.rerender(null);
    }

  }

  if (!event.data.split) {
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
    var pipeIndex = event.data.indexOf('|');
    var dataString = event.data.substring(pipeIndex + 1);
    dataString = dataString.replace(/^[^<]+/, '')
    var data = xmlToJSON.parseString(dataString, { childrenAsArray: false, grokText: false });
    console.log(data);


    if (data.Update.data.apiErrors && Finesse.agent.state === "LOGOUT") {
      let err = data.Update.data.apiErrors.apiError;
      let errorMessage = err.errorType && err.errorType._text;

      if (errorMessage === "Invalid Device") {
        handleLoginFailed("Invalid Extension");
      } else {
        console.error("Received API error while logging in to Finesse:", err);
        if (err.peripheralErrorText && err.peripheralErrorText._text) {
          errorMessage = err.peripheralErrorText._text;
        }
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

  window.FinessePlugin.callEnded(Finesse.agent.calls[id]);

  delete Finesse.agent.calls[id];
  console.log("Agent: ", Finesse.agent);
}

function getRecentCallById(id) {
  console.log("Getting recent call by id");

  for(let i = 0; i < Finesse.agent.recentCalls.length; i++) {
    let recentCall = Finesse.agent.recentCalls[i];
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

  var newCall = false;
  if(calls[id]) {
    console.log("Updating existing call:", calls[id]);
  } else {
    console.log("Creating new call");
    newCall = true;
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

  call.callVariables = call.callVariables || {};
  var callVariables = dialog.mediaProperties.callvariables.CallVariable;
  for(var i = 0; i < callVariables.length; i++) {
    var value = callVariables[i].value._text;
    var name = callVariables[i].name._text;
    call.callVariables[name] = value;
  }

  if(call.to && !recentCallExists(call)) {
    addCallToRecentsList(call);
  } else {
    console.log("Not adding to recents list");
    console.log("call.to: ", call.to);
  }

  console.log("Updated call:", call)

  if (Finesse.pendingCallUpdate && call.state != "ALERTING") {
    if (Finesse.pendingCallUpdate.id == call.id) {
      FinessePhoneApi.updateCallVariables(Finesse.agent, call, Finesse.pendingCallUpdate.variables);
    }

    Finesse.pendingCallUpdate = null;
  }

  rerender(Finesse.agent);

  let shouldPop = !call.alreadyPopped && call.direction === "inbound"
  if(Object.keys(calls).length > 1 && !Finesse.agent.shouldPopConcurrently) {
    shouldPop = false;
    // We don't want to ever pop this call
    call.alreadyPopped = true;
  }

  if(shouldPop && !window.sforce) {
    delete window.Finesse.agent.callerInfo;
    window.FinessePlugin.screenPop(call, true);
  }

  if (newCall) {
    window.FinessePlugin.callStarted(call);
  } else {
    window.FinessePlugin.callUpdated(call);
  }

  if(call.direction === "inbound" && call.state === "ALERTING" && !window.sforce) {
    parent.window.postMessage({
      type: 'show'
    }, '*');
  }
  if (call.direction === "inbound" && call.state === "ALERTING" && window.sforce){
    SforceScreenPop(call);
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

  if(fieldName == "stateChangeTime" && Finesse.agent[fieldName] != value) {
    window.Finesse.agent.localStateChangeTime = new Date();
  }


  Finesse.agent[fieldName] = value;
  let currentState = Finesse.agent["state"]
  if(previousState !== "LOGOUT" && currentState === "LOGOUT") {
    disconnectSession();
  }
  if (previousState != currentState) {
    //window.FinessePlugin.callStarted(call);
    window.FinessePlugin.stateUpdated(currentState);
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
    if (e.keyCode == 13) {
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
}
window.rerender = rerender;

function initialize() {
  if (window.FinessePlugin && window.FinessePlugin.initialized) {
    console.log("Plugin already initialized.");
    return;
  }

  if (getQueryParameter("finesseUrl") && getQueryParameter("finesseUrl") != "") {
    setupFinesseUrl({});
  } else if (window.openFrameAPI) {
    console.log("OpenFrame API detected, initializing.");
    window.openFrameAPI.init({ height: 350, width: 350 }, openFrameInitSuccess, openFrameInitFailure);
  } else if (window.sforce){
    console.log("Salesforce API detected, initializing.");
    getSforceConfig();
  } else {
    console.log("Not running in OpenFrame, delaying.");
    setTimeout(initialize, 500);
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

  getContactsLoaded() {
    return contacts_loaded;
  }
  getContactsList() {
    return contacts_list_global;
  }



  render() {
    let agent = this.state.agent || {};
    let loggedIn = agent.state && agent.state !== 'LOGOUT'

    let mainHeight = '100%';

    if (!window.FinessePlugin.initialized) {
      return (
        <div id="main" style={{height: mainHeight}}>
          <LoadingDialog />
        </div>
      )
    } else if (!loggedIn) {
      return (
          <div id="main" style={{height: mainHeight}}>
              <LoginDialog 
                handleLogin={this.handleLogin}
                previousLoginFailed={agent.previousLoginFailed}
                loading={agent.loggingIn}
                mobileAgentEnabled={window.FinessePlugin.config.mobileAgentEnabled === "true"}
              />
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
                  {"© " + (new Date()).getFullYear() + " Cloverhound Inc."}
                </a>
              </div>
          </div>
      );
    } else {
      return (
          <div id="main" style={{height: mainHeight}}>
              <AgentHeader agent={agent} stateApi={FinesseStateApi} type={window.FinessePlugin.type}/>
              {window.FinessePlugin.config.callerViewEnabled == "true" ?
                <CallerView agent={agent} tabNames={window.tabNames} phoneApi={FinessePhoneApi} stateApi={FinesseStateApi} pluginApi={PluginApi} type={window.FinessePlugin.type} origin={window.FinessePlugin.origin} config={window.FinessePlugin.config}/>
                : null
              }
              <HomeView agent={agent} digits={this.state.digits} tabNames={window.tabNames} phoneApi={FinessePhoneApi} stateApi={FinesseStateApi} pluginApi={PluginApi} type={window.FinessePlugin.type}/>
              <DialpadView agent={agent} digits={this.state.digits} tabNames={window.tabNames} phoneApi={FinessePhoneApi} type={window.FinessePlugin.type}/>
              <RecentCallsView agent={agent} phoneApi={FinessePhoneApi} tabNames={window.tabNames} type={window.FinessePlugin.type}/>
              <ContactsView agent={agent} phoneApi={FinessePhoneApi} tabNames={window.tabNames} type={window.FinessePlugin.type} pluginApi={PluginApi}/>
              <Tabs agent={agent} rerender={rerender} tabNames={window.tabNames} config={window.FinessePlugin.config}/>
          </div>
      );
    }
  }
}

export default App;

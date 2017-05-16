import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Dropdown from 'react-dropdown';
import logo from './logo.svg';
import './App.css';
import $ from "jquery";
import xmlToJSON from "./vendor/xmlToJSON";
import moment from "moment";
import "moment-duration-format";


var agent = {
  state: 'LOGOUT'
}

var calls = {

}
    
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
  CONNECT_REQ: 10
};

var STATE_TEXT = {
  READY: 'Ready',
  NOT_READY: 'Not Ready',
  TALKING: 'Talking',
  LOGOUT: 'Logout'
}

var INCIDENT_NUMBER_LENGTH = 7;

var config = {
  height: 300,
  width: 350
}
function handleCommunicationEvent(context) {
  console.log("Communication from Topframe", context);
  if(context["phone_number"]) {
    call(context["phone_number"].replace(/-/g, ""));
    window.openFrameAPI.show();
  }
}
function initSuccess(snConfig) {
  console.log("openframe configuration",snConfig);
  //register for communication event from TopFrame
  window.openFrameAPI.subscribe(window.openFrameAPI.EVENTS.COMMUNICATION_EVENT,
  handleCommunicationEvent);
}
function initFailure(error) {
  console.log("OpenFrame init failed..", error);
}

window.openFrameAPI.init(config, initSuccess, initFailure);



function login(event) {
  event.preventDefault;

  var form = document.getElementById("login-form");
  window.username = form.elements["username"].value;
  window.password = form.elements["password"].value;
  window.extension = form.elements["extension"].value;

  console.log(window.username, window.extension);

  if(!window.username) {
    handleLoginFailed("Invalid Credentials");
    return false;
  }

  $.ajax({
    url: "/finesse/api/User/" + window.username,
    type: "GET",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(window.username, window.password));
    }, 
    success: function() {
      var tunnelFrame = document.getElementById("tunnel-frame");
      var tunnelWindow = tunnelFrame.contentWindow;

      tunnelWindow.postMessage(MESSAGE_TYPE.ID + "|" + window.username, "*");
      tunnelWindow.postMessage(MESSAGE_TYPE.PASSWORD + "|" + window.password, "*");
      tunnelWindow.postMessage(MESSAGE_TYPE.XMPPDOMAIN + "|" + "uccx1.cloverhound.com", "*");
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
  rerender({reason: reason});
}

function receiveMessage(event)
{
  var origin = event.origin || event.originalEvent.origin; // For Chrome, the origin property is in the event.originalEvent object.
  console.log("Received:", event.data);

  if (event.data === "4|connected") {
    pushLoginToFinesse(window.username, window.password, window.extension);
  }

  if (event.data === "4|unauthorized") {
    handleLoginFailed("Invalid Credentials");
  }


  var eventCode = event.data.split("|")[0];
  if (eventCode === "0") {
    var dataString = event.data.split('|')[1];
    dataString = dataString.replace(/^[^<]+/, '')
    var data = xmlToJSON.parseString(dataString, { childrenAsArray: false });
    console.log(data);

    if (data.Update.data.user) {
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

    } else if (data.Update.data.apiErrors) {
      if(data.Update.data.apiErrors.apiError.errorMessage._text === "CF_INVALID_LOGON_DEVICE_SPECIFIED") {
        handleLoginFailed("Invalid Device");
      }
    }
  }
}

function logout() {
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
      console.log(data);

    }
  });
}

function ready() {
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

    }
  });
}

function notReady() {
  var xml = '<User>' +
            ' <state>NOT_READY</state>' +
            ' <reasonCodeId>2</reasonCodeId>' +
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
  call.held = true;
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
  call.held = true;
}

function resume(call) {
  console.log("Resuming call:", call);

  var xml = '<Dialog>' +
            ' <targetMediaAddress>' + agent.extension + '</targetMediaAddress>' +
            ' <requestedAction>RETRIEVE</requestedAction>' +
            '</Dialog>';


  sendDialogCommand(call.id, xml);
  call.held = false;
  var otherLine = 3 - call.line;
  var otherCall = getCallByLine(otherLine);
  if(otherCall) {
    otherCall.held = true;
  }
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
    }
  });
}


function sendDialogCommand(id, xml) {
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

    }
  });
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


function stateUpdated(state) {
  if (agent.state != state) {
    agent.state = state;
    rerender();
  }
}

function handleUserUpdate(updatedAgent) {
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
  call.to = dialog.toAddress._text;
  call.state = dialog.state._text;
  call.callType = dialog.mediaProperties.callType._text;

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

  console.log("Updated call:", call)

  if(call.direction === "inbound" && call.state === "ALERTING") {
    window.openFrameAPI.show();
  }

  rerender();
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
  delete calls[dialog.id];

  rerender();
}

function handleAllDialogsDeleted(dialogs) {
  console.log("Handling all dialogs deleted with dialogs:", dialogs)
  
  delete calls[dialogs.Dialog.id._text];
  
  rerender();
}

// Helps convert the xmlToJSON results to regular properties
function setAgentFieldFromUserUpdate(fieldName, userObject) {
  agent[fieldName] = userObject[fieldName] && userObject[fieldName]._text || null;
}

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

function rerender(previousLoginFailed=false) {
  ReactDOM.render(
    <App agent={agent} previousLoginFailed={previousLoginFailed}/>,
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
    login(event);
  }

  render() {
    var loggedIn = false;
    if (DEBUG || this.props.agent && this.props.agent.state !== 'LOGOUT') {
      loggedIn = true
    }

    return (
      <div id="main">
        {loggedIn &&
          <AgentHeader agent={this.props.agent} />
        }
        {loggedIn ? (
            <div id="desktop">
              <StateControls state={this.props.agent.state} />
              <CallPanel />
            </div>
          ) : (
            <LoginDialog handleLogin={this.handleLogin} previousLoginFailed={this.props.previousLoginFailed}/>
        )}
      </div>
    );
  }
}

function LoginDialog(props) {

  let errorTextStyle = {
    color: "red",
    margin: 0
  }

  let submitButtonStyle = {
      border: "2px solid #333",
      borderRadius: "25px",
      backgroundColor: "transparent",
      marginTop: "30px",
      textTransform: "uppercase",
      cursor: "pointer",
      fontWeight: "bold"
  }
  
  if(props.previousLoginFailed) {
    submitButtonStyle.marginTop = "20px";
  } 

  return (
    <div id="login-section" className="login-section">
      <form id="login-form" className="login-form" onSubmit={props.handleLogin}>
        <input placeholder="username" type="text" name="username"></input>
        <input placeholder="password" type="password" name="password"></input>
        <input placeholder="extension" type="text" name="extension"></input>

        {
          props.previousLoginFailed ? (
            <p style={errorTextStyle}> {props.previousLoginFailed.reason} </p>
          ) : null
        }

        <input type="submit" value="Login" style={submitButtonStyle}></input>
      </form>
    </div>
  );
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

  stateOption(state) {
    return {
      value: state,
      label: STATE_TEXT[state] || state
    }
  }

  onSelect(option) {
    if (option.value === 'READY')
      ready();
    else if (option.value === 'NOT_READY')
      notReady();
    else if (option.value === 'LOGOUT')
      logout();
  }

  render() {
    var stateString = STATE_TEXT[this.props.state] || this.props.state;
    var options = {
      READY: [this.stateOption('NOT_READY')],
      NOT_READY: [this.stateOption('READY')]
    }

    return (
      <div>
        <div id="agent-state" className={this.props.state}>
          <Dropdown
            onChange={this.onSelect}
            options={options[this.props.state]}
            value={stateString}
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
    let makeCallStyle = {
      float: 'right'
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
    if(otherCall && otherCall.state != "ACTIVE") {
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

function CallControlButton(props) {
  let icon = "";
  if(props.dontUseSvg) {
    icon = props.icon;
  } else {
    icon = <SvgIcon name ={props.icon} /> 
  }
  return <a className="round-button" id={props.type + "-but"} onClick={props.function}>
    <span className={"icon-container " + props.type}>
      {icon}
    </span>
  </a>
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

  render() {
    let callIds = Object.keys(calls);
    if(callIds.length == 0 || (callIds.length == 1 && !calls[callIds[0]].held) ) {
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
            />
            <a onClick={this.handleMakeCall.bind(this)} className="cta hybrid">
              <i className="fa fa-phone" aria-hidden="true"></i>
                <span>Call</span>
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

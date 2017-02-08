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

var currentLine = 1;

var display = {
  callControls: false,
  hold: false,
  mute: false,
  hangup: false,
  transfer: false,
  conference: false
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

$(document).ready(function () {
//  $("#desktop").hide();
  //renderReact();
});

function login(event) {
  event.preventDefault;

  var form = document.getElementById("login-form");
  window.username = form.elements["username"].value;
  window.password = form.elements["password"].value;
  window.extension = form.elements["extension"].value;

  console.log(window.username, window.extension);
      
  var tunnelFrame = document.getElementById("tunnel-frame");
  var tunnelWindow = tunnelFrame.contentWindow;

  tunnelWindow.postMessage(MESSAGE_TYPE.ID + "|" + window.username, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.PASSWORD + "|" + window.password, "*");
  tunnelWindow.postMessage(MESSAGE_TYPE.XMPPDOMAIN + "|" + "uccx1.cloverhound.com", "*");

  return false;
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

    }
  });
}

function receiveMessage(event)
{
  var origin = event.origin || event.originalEvent.origin; // For Chrome, the origin property is in the event.originalEvent object.
  console.log("Received:", event.data);

  if (event.data == "4|connected") {
    pushLoginToFinesse(window.username, window.password, window.extension);
  }

  var eventCode = event.data.split("|")[0];
  if (eventCode == "0") {
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
          handleAllDialogsDeleted();
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
  var xml = '<Dialog>' +
            ' <requestedAction>MAKE_CALL</requestedAction>' +
            ' <toAddress>' + number + '</toAddress>' +
            ' <fromAddress>' + agent.extension + '</fromAddress>' +
            '</Dialog>';

  $.ajax({
    url: '/finesse/api/User/' + window.username + '/Dialogs',
    type: 'POST',
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
  calls[dialog.id] = calls[dialog.id] || {};
  var call = calls[dialog.id];

  call.startedAt = call.startedAt || new Date();
  call.from = dialog.fromAddress._text;
  call.to = dialog.toAddress._text;
  call.state = dialog.state._text;
  call.callType = dialog.mediaProperties.callType._text;

  if (call.from === agent.extension) {
    call.otherParty = call.to;
  } else {
    call.otherParty = call.from;
  }

  rerender();
}

function handleDialogDeleted(dialog) {
  delete calls[dialog.id];

  rerender();
}

function handleAllDialogsDeleted() {
  calls = {};

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

function rerender() {
  ReactDOM.render(
    <App agent={agent}/>,
    document.getElementById('root')
  );
}

window.rerender = rerender;

var DEBUG = true;
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
            <LoginDialog handleLogin={this.handleLogin} />
        )}
      </div>
    );
  }
}

function LoginDialog(props) {

  return (
    <div id="login-section" className="login-section">
      <form id="login-form" className="login-form" onSubmit={props.handleLogin}>
        <input type="text" name="username"></input>
        <input type="password" name="password"></input>
        <input type="text" name="extension"></input>

        <input type="submit" value="Login"></input>
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
    if (option.value == 'READY')
      ready();
    else if (option.value == 'NOT_READY')
      notReady();
    else if (option.value == 'LOGOUT')
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

    let contentStyle = { 
      maxHeight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      backgroundColor: '#EEE'
    }
    if (this.state.open) {
      contentStyle = { 
        maxHeight: '500px'
      }
    }

    let iconStyle = {
      marginRight: '10px',
      marginLeft: '2px',
      fontSize: '20px',
      verticalAlign: 'middle'
    }
    let headerTextStyle = {
      verticalAlign: 'middle'
    }
    let makeCallStyle = {
      float: 'right'
    }

    let currentCall = { from: '' };
    let formattedCallTime = '';
    let callsActive = (Object.keys(calls).length > 0);
    if (callsActive) {
      currentCall = calls[Object.keys(calls)[0]];

      let elapsedTime = this.state.now - currentCall.startedAt;
      if (elapsedTime < 0) {
        elapsedTime = 0;
      }
      formattedCallTime = moment.duration(elapsedTime);
      formattedCallTime = formattedCallTime.format('mm:ss', { trim: false });

      if (!this.state.timer) {
        this.startCallTimer.apply(this);
      }
    }


    return (
      <div style={{height: '100%', position: 'relative'}}>
        {callsActive ? (
          <div>
            <div className="call-header" onClick={this.toggleContent.bind(this)}>
              <i style={iconStyle} className="fa fa-phone" aria-hidden="true"></i>
              <span style={headerTextStyle}>
                {currentCall.otherParty} ({formattedCallTime})
              </span>
              <div className="call-content" style={contentStyle}>
          
              </div>
            </div>
          </div>
          ) : (
            <div>
              <div className="call-header" onClick={this.toggleContent.bind(this)}>
                <i style={iconStyle} className="fa fa-phone" aria-hidden="true"></i>
                <span style={headerTextStyle}>
                  No Calls
                </span>
                <a  className="cta hybrid end">
                  <i className="fa fa-phone" aria-hidden="true"></i>
                  <span>End</span>
                </a>
              </div>
              <div className="call-content" style={contentStyle}>
          
              </div>

              <MakeCallForm />
            </div>
          )}
        
      </div>
    )
  }
}

class MakeCallForm extends Component {

  constructor() {
    super();

    this.state = { value: '' };
  }

  handleMakeCall() {
    call(this.state.value);
    this.setState({value: ''});
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  render() {
    return (
      <div className="tab-content make-call" data-structure="make-call" 
        style={{
          display: 'block',
          position: 'absolute',
          width: '100%',
          bottom: '0'
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
  }
}

export default App;

import React, { Component } from 'react';
import Dropdown from 'react-dropdown';
import moment from "moment";

var STATE_TEXT = {
  LOGOUT: 'Logged out',
  LOGIN: "Logging in",
  READY: 'Ready',
  RESERVED: 'Reserved',
  RESERVED_OUTBOUND: 'Outbound Reserved',
  RESERVED_OUTBOUND_PREVIEW: 'Outbound Reserved',
  WORK: 'Wrap-Up',
  WORK_READY: 'Wrap-Up',
  NOT_READY: 'Not Ready',
  TALKING: 'Talking',
  HOLD: 'On Hold'
};

class StateControls extends Component {

  constructor() {
    super();

    this.state = { now: (new Date()) };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState({ now: (new Date()) });
    }, 500);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  readyStateOption() {
    return {
      value: STATE_TEXT['READY'],
      label: STATE_TEXT['READY']
    }
  }

  notReadyStateOptions(agent) {

    let reasonCodes = agent.notReadyReasonCodes;

    if(reasonCodes.length === 0 && agent.state !== "NOT_READY") {
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
    let agent = this.props.agent;
    let stateApi = this.props.stateApi;
    if (option.value === STATE_TEXT['READY']) {
      stateApi.ready(agent);
    } else if (option.value.includes(STATE_TEXT['NOT_READY']) && option.value.includes("-")) {
      let firstDashIndex = option.value.indexOf("-");
      let reason = option.value.substring(firstDashIndex + 1).trim();
      stateApi.notReady(agent, reason);
    } else {
      stateApi.notReady(agent);
    }
  }

  render() {
    let agent = this.props.agent;
    let value = STATE_TEXT[this.props.agent.state]
    if (value === STATE_TEXT["NOT_READY"] && agent.reasonCode) {
      value += (" - " + agent.reasonCode.label);
    }
    var options = this.options(agent)


    let formattedCallTime = '';
    let elapsedTime = this.state.now - agent.localStateChangeTime;

    if (elapsedTime < 0) {
      elapsedTime = 0;
    }
    formattedCallTime = moment.duration(elapsedTime);
    formattedCallTime = formattedCallTime.format('mm:ss', { trim: false });

    let containerStyle = {
      maxWidth: "500px",
      margin: "auto",
      padding: "10px 10px 1px 10px"
    }

    let timerStyle = {
      display: "inline-block",
      position: "absolute",
      top: "16px",
      right: "30px",
      color: "white",
      fontSize: "12px",
      pointerEvents: "none"
    }

    return (
      <div style={containerStyle}>
        <div id="agent-state" className={agent.state}>
          <Dropdown
            onChange={this.onSelect.bind(this)}
            options={options}
            value={value}
            className="state-dropdown"
          />
          <div className={"state-timer"} style={timerStyle}>({formattedCallTime})</div>
        </div>
      </div>
    )
  }
}

export default StateControls;

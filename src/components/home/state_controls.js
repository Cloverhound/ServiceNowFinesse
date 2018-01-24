import React, { Component } from 'react';
import Dropdown from 'react-dropdown';

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
  LOGOUT: 'Logout',
  HOLD: 'On Hold'
};

class StateControls extends Component {

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
      stateApi.notReady(agent, option.value.split("-")[1].replace(/ /g,''));
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

    return (
      <div>
        <div id="agent-state" className={agent.state}>
          <Dropdown
            onChange={this.onSelect.bind(this)}
            options={options}
            value={value}
            className="state-dropdown"
          />
        </div>
      </div>
    )
  }
}

export default StateControls;

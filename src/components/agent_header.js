import React, { Component } from 'react';
import Dropdown from './dropdown';

class AgentHeader extends Component {

  constructor(props) {
    super(props);

    window.toggleLogoutMenu = () => {
      this.child.toggle();
    };
  }

  onLogoutClick() {
    this.props.stateApi.logout(this.props.agent)
  }

  getLogoutOptions(logoutReasonCodes) {
    let logoutOptions = [];
    for(let i = 0; i < logoutReasonCodes.length; i++) {
      logoutOptions.push({
        label: logoutReasonCodes[i].label,
        value: logoutReasonCodes[i].label
      })
    }
    return logoutOptions;
  }

  onSelect(option) {
    let agent = this.props.agent;
    let stateApi = this.props.stateApi;

    stateApi.logout(agent, option.value);
  }

  render() {
    let agent = this.props.agent;

    let headerStyle = {
      backgroundColor: "#6d7175",
      paddingLeft: "10px",
      color: "#fff",
      fontSize: "13px",
      fontWeight: "300",
      height: "35px"
    }

    let headerClass = "signout-dropdown";
    if (this.props.type == "snow") {
      headerStyle.height = "0px";
      //headerStyle.overflowY = "hidden";
      headerClass += " snow-header";
    }

    let logoutStyle = {
      float: 'right',
      color: '#FFF',
      textDecoration: 'underline',
      marginTop: "7px",
      marginRight: "8px"
    }

    let nameStyle = {
      display: "inline-block",
      marginTop: "7px"
    }

    let logoutElement = <a href="#" onClick={this.onLogoutClick.bind(this)} style={logoutStyle}>Sign Out</a>;
    if(agent.signOutReasonCodes.length > 0 && agent.state === "READY") {
      let options = this.getLogoutOptions(agent.signOutReasonCodes);
      logoutElement =   <Dropdown
                          onChange={this.onSelect.bind(this)}
                          options={options}
                          value="Sign Out"
                          className={headerClass}
                          disabled
                        />
    }
    else if(agent.signOutReasonCodes.length > 0 ) {
      let options = this.getLogoutOptions(agent.signOutReasonCodes);
      logoutElement =   <Dropdown
                          onChange={this.onSelect.bind(this)}
                          options={options}
                          value="Sign Out"
                          className={headerClass}
                          onRef={ref => (this.child = ref)}
                        />
    }

    return (
      <div id="header" style={headerStyle}>
        {this.props.type === "snow" ? null :
          <div className="agent-name" style={nameStyle}>{agent.firstName} {agent.lastName} ({agent.extension})</div>
        }
        {logoutElement}
      </div>
    );
  }
}

export default AgentHeader;

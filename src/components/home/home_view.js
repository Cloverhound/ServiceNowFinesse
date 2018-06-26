import React, { Component } from 'react';
import StateControls from './state_controls';
import CallPanel from './call_panel';

class HomeView extends Component {
  render(){
      let agent = this.props.agent;
      if(agent.currentTab !== this.props.tabNames.HOME) {
        console.log("Current tab is not home...");
        return null;
      }

      let containerStyle = {
        height: 'calc(100% - 63px)',
      }

      if (this.props.type == "snow") {
        containerStyle.height = 'calc(100% - 28px)';
      }

      return (
        <div style={containerStyle}>
          <StateControls agent={agent} stateApi={this.props.stateApi}/>
          <div id="homeView" style={{height: "100%"}}>
            <div id="desktop">
              <CallPanel agent={agent} digits={this.props.digits} phoneApi={this.props.phoneApi}/>
            </div>
          </div>
        </div>
      )
  }
}

export default HomeView;

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

      return (
        <div style={{height: "calc(100% - 63px)"}}>
          <StateControls agent={agent} stateApi={this.props.stateApi}/>
          <div id="homeView" style={{height: "100%"}}>
            <div id="desktop">
              <CallPanel agent={agent} digits={this.props.digits} phoneApi={this.props.phoneApi} snowApi={this.props.snowApi}/>
            </div>
          </div>
        </div>
      )
  }
}

export default HomeView;

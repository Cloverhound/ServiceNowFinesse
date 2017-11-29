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
        <div id="homeView" style={{height: "calc(100% - 35px)"}}>
          <div id="desktop">
            <StateControls agent={agent} stateApi={this.props.stateApi}/>
            <CallPanel agent={agent} phoneApi={this.props.phoneApi}/>
          </div>
        </div>
      )
  }
}

export default HomeView;

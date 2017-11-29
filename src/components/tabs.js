import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import $ from "jquery";


class Tabs extends Component {

  onHomeClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("running onhome click...");
    agent.currentTab = tabNames.HOME;
    this.props.rerender(agent);
  }

  onRecentsClick() {
    let agent = this.props.agent;
    let tabNames = this.props.tabNames;
    console.log("running onrecents click...");
    agent.currentTab = tabNames.RECENTS;
    this.props.rerender(agent);
  }

  render() {
    let tabNames = this.props.tabNames;

    var tabBarStyle = {
      position: "absolute",
      bottom: "0px",
      width: "100%",
      background: "whitesmoke",
      cursor: "pointer"
    };

    var tabStyle = {
      display: "inline-block",
      borderTop: "1px solid gray",
      width: "50%",
      color: "dimgray",
      textAlign: "center",
      fontSize: "smaller"
    }

    var tabTextStyle = {
      fontSize: "8px"
    }

    var homeStyle = $.extend(true, {}, tabStyle);
    var recentsStyle = $.extend(true, {}, tabStyle);

    homeStyle.borderRight = "1px solid gray";

    if(this.props.agent.currentTab === tabNames.HOME) {
      homeStyle.color = "blue";
    } else {
      recentsStyle.color = "blue";
    }

    return (
      <div style={tabBarStyle} class="tabbar">
        <div style={homeStyle} className="tab home" onClick={this.onHomeClick.bind(this)}>
          <FontAwesome name='home' size="lg"/>
          <div style={tabTextStyle} className="tab-text">Home</div>
        </div>
        <div style={recentsStyle} className="tab recents" onClick={this.onRecentsClick.bind(this)}>
          <FontAwesome name='clock-o' size="lg"/>
          <div style={tabTextStyle} className="tab-text">Recents</div>
        </div>
      </div>
    );
  }

}

export default Tabs;

import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import Email_helper from './Email_helper'
import moment from "moment";
import $ from "jquery";



class EmailView extends Component {
  constructor(props) {
    super(props);
    console.log(JSON.stringify(props));
    console.log("CONTACTS VIEW PROPS: " + props.toString());
    this.email_helper = new Email_helper(props.agent, props.phoneApi, props.tabNames);
  }

  render(){
    let tabNames = this.props.tabNames;
    if(this.props.agent.currentTab !== tabNames.EMAIL) {
      return null;
    }
    document.addEventListener('keyup', (e) =>{
      if (e.code === "Enter" && this.props.agent.currentTab == tabNames.EMAIL){
        console.log("Clicked");
      }
    });
    let calls = this.props.agent.calls;
    let callsActive = (Object.keys(calls).length > 0);
    let barStyle = {
      width: '100%'
    }
    let searchStyle = {
      display: 'block',
      width: '100%',
      color: 'black'
    }
    let listStyle = {
      padding: '10px',
      display: 'block',
      overflowY:'auto',
      overflowX:'auto',
      height: '90%'
    }
    let buttonStyle = {
      float: 'right',
      width: '25%'
    }

    let testStyle = {
      overflow: 'hidden',
    }

    let containerStyle = {
        maxWidth: '500px',
        height: 'calc(100% - 63px)',
        margin: 'auto',
        padding: '10px'
    }

    if (this.props.type == "snow") {
      containerStyle.height = 'calc(100% - 28px)';
    }

    return (

      <div style={containerStyle} id='content'>
        <div className="search-container" style={searchStyle}>
        <button type="submit" style={buttonStyle} onClick={this.email_helper.populate_search.bind(this)}><FontAwesome name="search"/></button>
          <div style={testStyle}>
            <input type="text" id="input_text" placeholder="Search.." name="search" style={barStyle}></input>
            </div>
        </div>
        <div id="list_box" style={listStyle}>

        </div>
      </div>
    )
  }
}
export default EmailView;

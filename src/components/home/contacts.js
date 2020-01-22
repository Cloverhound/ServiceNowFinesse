import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import moment from "moment";
import $ from "jquery";


class ContactsView extends Component {
  constructor(props) {
    super(props);
  }
  render(){
      let searchStyle = {
        display: 'block',
        width: '100%',
        color: 'black'
      }
      let containerStyle = {
        maxWidth: '500px',
        height: 'calc(100% - 63px)',
        margin: 'auto',
        padding: '10px'
      }
      let buttonStyle = {
        float: 'right',
        width: '25%'
      }
      let barStyle = {
        width: '100%'
      }
      let testStyle = {
        overflow: 'hidden',
      }
      let tabNames = this.props.tabNames;
      if(this.props.agent.currentTab !== tabNames.CONTACTS) {
        return null;
      }
      return (
        <div style={containerStyle} id='content'>
          <div className="search-container" style={searchStyle} tabIndex="0">
              <div style={testStyle}>
                <input type="text" id="input_text" placeholder="Search.." name="search" style={barStyle}></input>
              </div>
            </div>
            <Contacts {...this.props}/>
        </div>
      )
  }
}

class Contacts extends Component {

  render() {
    let agent = this.props.agent;
    let contacts_list = agent.contacts || [];

    let ulStyle = {
      listStyleType: "none",
      margin: "0",
      border: "0",
      padding: "0",
      fontSize: "0.9rem"
    }

    let contactsComponents = []
    for(let i = 0; i < contacts_list.length; i++) {
      let contact = contacts_list[i];
      contactsComponents.push(
        <Contact contact={contact} agent={this.props.agent} tabNames={this.props.tabNames} phoneApi={this.props.phoneApi}/>
      );
    }

    var noRecentsStyle = {
      marginTop: "5px",
      width: "100%",
      textAlign: "center",
      padding: "40px",
      color: "darkslategray"
    };

    let containerStyle = {
      height: 'calc(100% - 63px)',
      overflowY: 'scroll',
      float: 'left',
      width: '100%'
    }

    if (this.props.type == "snow") {
      containerStyle.height = 'calc(100% - 28px)';
      containerStyle.marginTop = '-6px';
    }

    return (
      <div id="contacts" style={containerStyle}>
        {
          contactsComponents.length > 0 ? (
            <ul style={ulStyle}>
              {contactsComponents}
            </ul>
          ) : (<div style={noRecentsStyle}> No Contacts </div>)
        }
      </div>
    )
  }
}

class Contact extends Component {

  handleMakeCall() {
    this.props.phoneApi.call(this.props.agent, this.props.contact.number);
    this.props.agent.currentTab = this.props.tabNames.HOME;
    window.rerender(this.props.agent);
  }

  render() {

    let internalExternalStyle = {
      float: "left",
      marginLeft: "10px",
      marginTop: "4px",
      fontSize: "14px",
      color: "rgb(100, 100, 100)"
    }
    let internalExternalIcon = <i style={internalExternalStyle} className="material-icons">face</i>
    if(this.props.contact.internal_external === "internal") {
      internalExternalIcon = <i style={internalExternalStyle} className="material-icons">supervisor_account</i>
    }

    let numberTypeStyle = {
      display: "inline-block",
      marginLeft: "0",
      float: "right",
      marginTop: "4px",
      marginRight: "15px",
      fontSize: "14px",
      color: "rgb(100, 100, 100)"
    }
    let numberIcon = <i style={numberTypeStyle}className="material-icons">smartphone</i>
    if(this.props.contact.phone_type === "business") {
      numberIcon = <i style={numberTypeStyle} className="material-icons">business_center</i>
    }else if(this.props.contact.phone_type === "home"){
      numberIcon = <i style={numberTypeStyle} className="material-icons">home</i>
    }


    let callNumberStyle = {
      display: "inline-block",
      marginLeft: "10px",
      cursor: "pointer",
      verticalAlign: "top",
      marginTop: "2px",
      color: "rgb(36, 83, 199)"
    }

    let callNumber = (
      <div className={"recent-call-number"} style={callNumberStyle} onClick={this.handleMakeCall.bind(this)}>{this.props.contact.number}</div>
    )


    let userStyle = {
      display: "inline-block",
      marginLeft: "10px",
      width: "35%",
      verticalAlign: "top",
      marginTop: "2px",
      color: "rgb(120, 120, 120)"
    }

    let user = <div style={userStyle}>{this.props.contact.firstName} {this.props.contact.lastName}</div>

    let liStyle = {
      border: "0",
      borderBottom: "1px solid #cccccc",
      padding: "4px 0px",
      backgroundColor: "#ffffff"
    }

    return (

      <li style={liStyle}>{internalExternalIcon} {user} {callNumber} {numberIcon}</li>
    )
  }
}


export default ContactsView;

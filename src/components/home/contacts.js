import React, { Component } from 'react';
import FontAwesome from 'react-fontawesome';
import moment from "moment";
import $ from "jquery";

class ContactsView extends Component {
  constructor(props){
    super(props);
    this.state = { current_search: ""};
    this.handleChange = this.handleChange.bind(this);
  }

  searchContacts(search_str){
    parent.window.postMessage({
      type: 'listContacts',
      search: search_str
    }, '*');
    

    // var search_results = []
    // var contact_list = this.props.agent.contacts || [];
    // for(var i = 0; i < contact_list.length; i++){
    //   if(contact_list[i].firstName.toString().toLowerCase().search(search_str.toString().toLowerCase()) >= 0 || contact_list[i].lastName.toString().toLowerCase().search(search_str.toString().toLowerCase()) >= 0 || contact_list[i].number.toString().toLowerCase().search(search_str.toString().toLowerCase()) >= 0 ){
    //     if(search_results.length < 100){
    //       search_results.push(contact_list[i]);
    //     }
    //   }

    // }
    // return search_results;
  }

  handleChange(event){
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    let search = event.target.value;
    this.debounceTimeout = setTimeout(() => {
      this.searchContacts(search);
    }, 500);

    this.setState({current_search: event.target.value});
  }

  render(){

      let searchStyle = {
        display: 'block',
        width: '100%',
        color: 'black'
      }
      let containerStyle = {
        maxWidth: '500px',
        height: 'calc(100% - 10px)',
        margin: 'auto',
        padding: '10px'
      }
      let buttonStyle = {
        float: 'right',
        width: '25%'
      }
      let barStyle = {
        width: '100%',
        borderRadius: '4px',
        color: 'rgba(24,31,37,0.7)',
        fontSize: '15px',
        padding: '10px',
        border: 'none',
        marginBottom: '5px'
      }
      let testStyle = {
        overflow: 'hidden',
      }
      let tabNames = this.props.tabNames;
      if(this.props.agent.currentTab !== tabNames.CONTACTS) {
        return null;
      }

      let userStyle = {
        marginTop: "2px",
        color: "rgb(120, 120, 120)",
        cursor: "pointer"
      }
      //this.searchContacts(this.state.current_search);
      this.props.agent.search_list = this.props.agent.contacts;

      return (
        <div style={containerStyle} id='content'>
          <div className="search-container" style={searchStyle} tabIndex="0">
              <div style={testStyle}>
                <input type="text" id="input_text" placeholder="Search.." name="search" style={barStyle} onChange={this.handleChange} value={this.state.current_search}></input>
              </div>
          </div>
          <Contacts {...this.props} contact_list={this.props.agent.contacts} pluginApi={this.props.pluginApi}/>
        </div>
      )
  }
}

class Contacts extends Component {

  render() {
    let agent = this.props.agent;
    let contacts_list = this.props.contact_list || [];

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
        <Contact key={i} contact={contact} agent={this.props.agent} tabNames={this.props.tabNames} 
          pluginApi={this.props.pluginApi}
          phoneApi={this.props.phoneApi}/>
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
          ) : (<div style={noRecentsStyle}> </div>)
        }
      </div>
    )
  }
}

class Contact extends Component {

  handleMakeCall(number) {
    this.props.phoneApi.call(this.props.agent, number || this.props.contact.number);
    this.props.agent.currentTab = this.props.tabNames.HOME;
    window.rerender(this.props.agent);
  }

  handleUserClick() {
    console.log("Clicked user:", this.props.contact.sys_id);
    this.props.pluginApi.popRecord('sys_user', this.props.contact.sys_id);
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
    if(this.props.contact.type === "internal") {
      internalExternalIcon = <i style={internalExternalStyle} className="material-icons">supervisor_account</i>
    }

    let numberTypeStyle = {
      display: "inline-block",
      marginLeft: "0",
      marginTop: "4px",
      fontSize: "10px",
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
      marginLeft: "5px",
      cursor: "pointer",
      verticalAlign: "top",
      marginTop: "2px",
      fontSize: "12px",
      color: "rgb(36, 83, 199)"
    }

    let numbers = [];
    if (this.props.contact.businessPhone) {
      numbers.push(
        <div key="business">
          <i style={numberTypeStyle} key="business-icon" className="material-icons">business_center</i>
          <div className={"recent-call-number"} key="business-number"
            style={callNumberStyle}
            onClick={this.handleMakeCall.bind(this, this.props.contact.businessPhone)}>{this.props.contact.businessPhone}</div>
        </div>
      );
    }
    if (this.props.contact.mobilePhone) {
      numbers.push(
        <div key="mobile">
          <i style={numberTypeStyle} key="mobile-icon" className="material-icons">smartphone</i>
          <div className={"recent-call-number"} key="mobile-number"
            style={callNumberStyle}
            onClick={this.handleMakeCall.bind(this, this.props.contact.mobilePhone)}>{this.props.contact.mobilePhone}</div>
        </div>
      );
    }
    if (this.props.contact.homePhone) {
      numbers.push(
        <div key="home">
          <i style={numberTypeStyle} key="home-icon" className="material-icons">home</i>
          <div className={"recent-call-number"} key="home-number"
            style={callNumberStyle}
            onClick={this.handleMakeCall.bind(this, this.props.contact.homePhone)}>{this.props.contact.homePhone}</div>
        </div>
      );
    }

    // let callNumber = (
    //   <div className={"recent-call-number"} 
    //       style={callNumberStyle}
    //       onClick={this.handleMakeCall.bind(this)}>{this.props.contact.number}</div>
    // )

    let userStyle = {
      display: "inline-block",
      marginLeft: "10px",
      verticalAlign: "top",
      marginTop: "2px",
      color: "rgb(120, 120, 120)",
      cursor: "pointer"
    }

    let nameSectionStyle = {
      display: "inline-block",
      width: "65%",
      verticalAlign: "top"
    }

    let numberSectionStyle = {
      display: "inline-block",
      width: "35%"
    }

    let user = <a className="recent-call-number" style={userStyle} onClick={this.handleUserClick.bind(this)}>
      {this.props.contact.firstName} {this.props.contact.lastName}
    </a>

    let liStyle = {
      border: "0",
      borderBottom: "1px solid #cccccc",
      padding: "4px 0px",
      backgroundColor: "#ffffff"
    }

    return (

      <li style={liStyle}>
        <div style={nameSectionStyle}>{internalExternalIcon} {user}</div>
        <div style={numberSectionStyle}>{numbers}</div>
      </li>
    )
  }
}


export default ContactsView;

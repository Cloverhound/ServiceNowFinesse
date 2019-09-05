import React, { Component } from 'react';
import $ from "jquery";
import Finesse from '../../finesse_apis/finesse_api';
import FinessePhoneApi from '../../finesse_apis/finesse_phone_api';
import ContactsView from './contacts'


class Contacts_helper {

  constructor(agent, phoneApi, tabNames) {
    console.log("TESTING AGENT SHIT");
    console.log(JSON.stringify(agent));
    console.log(JSON.stringify(phoneApi));
    console.log(JSON.stringify(tabNames));
    this.agent = agent;
    this.phoneApi = phoneApi;
    this.tabnames = tabNames;
  }

  callUser(){
    var number = this.innerHTML;

    var numberMatch = /\d+/g;
    var matches = number.match(numberMatch);
    var completeNum = matches.join("");
    FinessePhoneApi.call(Finesse.agent, completeNum);
    Finesse.agent.currentTab = window.tabNames.HOME;
    window.rerender(Finesse.agent);

  }

  createUserhtml(user){
    let liStyle = {
      border: "0",
      borderBottom: "1px solid #cccccc",
      padding: "4px 0px",
      backgroundColor: "#FFF"
    }
    let callNumberStyle = {
      display: "inline-block",
      cursor: "pointer",
      verticalAlign: "top",
      marginTop: "2px",
      color: "rgb(36, 83, 199)"
    }
    let userStyle = {
      display: "inline-block",
      marginLeft: "10px",
      verticalAlign: "top",
      marginTop: "2px",
      color: "rgb(120, 120, 120)"
    }
    //onClick={this.handleMakeCall.bind(this)}
    let callNumber = `<div style="display:inline-block;"><div id="child" className={"recent-call-number"} style="display: inline-block; cursor: pointer; float: right; margin-right: 2px; margin-top: 2px; color: rgb(36,83,199);" >${user.number}</div></div>`
    var userdiv = `<div style="width:45%; display: inline-block; margin-left: 10px; vertical-align: top; margin-top: 2px; color: rgb(120,120,120);">${user.firstName} ${user.lastName}</div>`;

    return `<li style="border-bottom: 1px solid #cccccc; background-color: #FFF; list-style-type: none; padding: 4px 0px;" id='${user.number}'>${userdiv} ${callNumber}</li>`
  }

  set_contact_list(contact_list){
    this.contact_list = contact_list;
  }

  populate_contact_list(){
    var target = document.getElementById("list_box");
    var html = "";
    for(var i = 0; i < this.contact_list.length; i++){
      var user = this.contact_list[i];
      html += this.createUserhtml(user);
    }

    $("#list_box").append(html);
    $("#list_box").on("click", "#child" , this.callUser);

  }
  populate_search(){
    var results = [];
    var contact_list = window.MainApp.getContactsList();
    var search_arg = document.getElementById("input_text").value;
    console.log(this);
    for(var i = 0; i < contact_list.length; i++){
      if(contact_list[i].firstName.toString().toLowerCase().search(search_arg.toString().toLowerCase()) >= 0 || contact_list[i].lastName.toString().toLowerCase().search(search_arg.toString().toLowerCase()) >= 0 || contact_list[i].number.toString().toLowerCase().search(search_arg.toString().toLowerCase()) >= 0  ){
        results.push(contact_list[i]);
      }
    }
    var html = "";
    try{
      for(var i = 0; i < results.length; i++){
          var user = results[i];
          html += this.helper_cont.createUserhtml(user);
      }
    }catch(error) {
      for(var i = 0; i < results.length; i++){
          var user = results[i];
          html += this.createUserhtml(user);
      }
    }

    $("#list_box").html("");

    $("#list_box").append(html);
    $("#list_box").on("click", "#child" , this.callUser);
  }

}
export default Contacts_helper;

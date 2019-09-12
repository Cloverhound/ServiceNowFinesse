import React, { Component } from 'react';
import $ from "jquery";
import Finesse from '../../finesse_apis/finesse_api';
import PluginApi from '../../plugin_api';
import FinessePhoneApi from '../../finesse_apis/finesse_phone_api';
import EmailView from './contacts'



class Email_helper {

  constructor(agent, phoneApi, tabNames) {
    this.agent = agent;
    this.phoneApi = phoneApi;
    this.tabnames = tabNames;
  }


  emailPop(){
    console.log("sending request");
    console.log(this.id);
    console.log(this.outerText);
    var auto = true;
      var popData = {
        email: this.id,
        agent: {
          username: window.Finesse.agent.username,
          extension: window.Finesse.agent.extension
        },
        manual: auto !== true
      }

      if(!auto && window.FinessePlugin.config.manualScreenPopInNewWindow == "true") {
          popData.newWindow = true;
      }

      if (auto) {
          window.Finesse.agent.lastPopped = this.id;
      }

      parent.window.postMessage({
        type: 'popEmail',
        popData: popData
      }, '*');



      if (auto && window.FinessePlugin.config.showCallerInfoOnScreenPop == "true") {
        window.Finesse.agent.currentTab = window.tabNames.CALLER;
        window.rerender(window.Finesse.agent);
      }

  }

  createUserhtml(email){
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
    var userdiv = `<a>${email.user.firstName} ${email.user.lastName}</a>`;
    var callNumber = "";


    var formattedDate = email.sent.split("-")[1] + "/" + email.sent.split("-")[2].split(" ")[0] + " " + email.sent.split(" ")[1].split(":")[0] + ":" + email.sent.split(" ")[1].split(":")[1];

    var bodydiv = `<a>${email.body}</a>`;
    var sentdiv = `<a>${formattedDate}</a>`;
    var subjectdiv = `<a>${email.subject}</a>`;



    console.log("Listing user id: " + email.user.sys_id);
    return `<li class="client_emails" onclick="console.log('clicked')" style="border-bottom: 1px solid #cccccc; background-color: #FFF; list-style-type: none; padding: 4px 0px;" id=${email.user.sys_id}>${sentdiv} ${userdiv} ${subjectdiv}</li>`
  }
  set_email_list(email_list){
    this.email_list = email_list;
  }
  populate_email_list(email_list_global){
    console.log("populating");
    var email_list = email_list_global;
    var target = document.getElementById("list_box");
    var html = "";
    for(var i = 0; i < email_list.length; i++){
      var email = email_list[i];
      html += this.createUserhtml(email);
    }
    $("#list_box").append(html);
    $(".client_emails").on('click', this.emailPop);
  }
  populate_search(){
    console.log("searching");
  }
}
export default Email_helper;

import Finesse from './finesse_api';
import $ from "jquery";


const Finesse_Phonebook = {
  get_finesse_phonebook: get_finesse_phonebook,
  format_contacts: format_contacts
}
function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}
function format_contacts(contacts){
  var formatted_contacts = [];
  var contact = {firstName: "", lastName: "", number: ""};

  return formatted_contacts;
}

function get_finesse_phonebook(agent) {
  console.log("getting finesse phonebook");

  $.ajax({
    //accept : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,objects=1-1500",
    url: Finesse.url.full + '/finesse/api/User/' + agent.username + '/PhoneBooks',
    type: 'GET',
    //beforeSend: function (xhr) {
    //  xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
    //},
    dataType: "xml",
    headers: {
      "Access-Control-Allow-Origin": "*",
      'Authorization': make_base_auth(agent.username, Finesse.password),
      'Range': 'objects=1-1500'
    },
    success: function(phoneBooks){
      console.log(phoneBooks);
      return phoneBooks;
    },
    error: function(jqXHR, status, err) {
      console.error("Error getting phonebooks:", status, err);
      window.reportError("Error getting phonebooks: " + status + ", " + err);
    }

  });


}

export default Finesse_Phonebook;

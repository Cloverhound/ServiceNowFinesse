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
    url: Finesse.url.full + '/finesse/api/User/' + agent.username + '/PhoneBooks',
    type: 'GET',
    dataType: "xml",
    headers: { 'Authorization': make_base_auth(agent.username, Finesse.password), 'Range': 'objects=1-1500'},
    //beforeSend: function (xhr) {
      //xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));

    //},
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

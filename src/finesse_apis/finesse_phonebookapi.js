import Finesse from './finesse_api';
import $ from "jquery";


const Finesse_Phonebook = {
  get_finesse_phonebook: get_finesse_phonebook
}
function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}
function get_finesse_phonebook(agent) {
  console.log("getting finesse phonebook");
  $.ajax({
    url: Finesse.url.full + '/finesse/api/PhoneBooks/',
    type: 'GET',
    dataType: "xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, Finesse.password));
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

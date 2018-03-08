import $ from "jquery";


const FinesseReasonCodesApi = {
  setReasonCodes: setReasonCodes
}

function setReasonCodes(agent) {
  setReasonCodesWithCategory(agent, "NOT_READY", agent.notReadyReasonCodes);
  setReasonCodesWithCategory(agent, "LOGOUT", agent.signOutReasonCodes);
}


function setReasonCodesWithCategory(agent, category, reasonCodes) {
  console.log("Setting reason codes for category: " + category);
  $.ajax({
    url: window.finesseUrl + '/finesse/api/User/' + agent.username + '/ReasonCodes?category=' + category,
    type: 'GET',
    dataType: "xml",
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization', make_base_auth(agent.username, window.Finesse.password));
    },
    success: function(xmlReasonCodes) {
      console.log("Successfully got reason codes");
      console.log(xmlReasonCodes);

      $(xmlReasonCodes).find("ReasonCode").each(function(reasonCodeIndex, reasonCodeXml) {
        var reasonCode = {};
        reasonCode.uri =  $(reasonCodeXml).find("uri").text();
        reasonCode.category = $(reasonCodeXml).find("category").text();
        reasonCode.code =  $(reasonCodeXml).find("code").text();
        reasonCode.label =  $(reasonCodeXml).find("label").text();
        reasonCode.forAll =  $(reasonCodeXml).find("forAll").text();
        console.log("Pushing reason code to array: ", reasonCode);
        reasonCodes.push(reasonCode)
      });
      console.log("Done setting reason codes", reasonCodes);
    },
    error: function(jqXHR, status, err) {
      console.error("Error getting reason codes:", status, err);
      window.reportError("Error getting reason codes: " + status + ", " + err);
    }
  });
}

function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return 'Basic ' + hash;
}

export default FinesseReasonCodesApi;

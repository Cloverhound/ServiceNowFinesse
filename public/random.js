function initSpark() {
  var spark = ciscospark.init({
  config: {
    credentials: {
      authorizationString: "https://api.ciscospark.com/v1/authorize?client_id=C48d6efedc4f30ed7c38892ccfbfaf83656b803ae2d23f6108b335711a1e6f14c&response_type=code&redirect_uri=https%3A%2F%2Fsnow-sforce.herokuapp.com%2Fspark-callback&scope=spark%3Aall%20spark%3Akms&state=set_state_here"
    }
  }
});
  setTimeout(
    function () {
      if (ciscospark && ciscospark.isAuthenticated != true) {
        spark.authorization.initiateLogin()
    //    setTimeout(
      //    function () {
      //      loginUser(ciscospark.credentials.authorization.access_token);
      //    }, 2000);
      } else {
    //    loginUser(ciscospark.credentials.authorization.access_token);
      }
    }, 1000);


}

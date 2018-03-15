import getQueryParameter from "../query_params";

const tabNames = {
  HOME: 1, RECENTS: 2, DIALPAD: 3, CONTACTS: 4 // I forsee dialpad and contacts in the future
}


const Finesse = {
  agent: emptyAgent(),

  sessionId: null,

  password: "",

  url: {
    full: "",
    withoutPort: "",
    port: "",
    protocol: "",
    hostname: ""
  },

  screenPop: {
    entityTemplate: "incident",
    queryTemplate: "sysparm_query=number=INC00{{callVariable1}}"
  },

  tabNames: tabNames,

  resetAgent() {
    this.agent = emptyAgent();
  },

  setupUrl(config) {
    console.log('Setting up finesse url...')
    this.url.full = (config.finesseUrl || decodeURIComponent(getQueryParameter("finesseUrl"))) || ""
  
    var el = document.createElement('a');
    el.href = this.url.full;
    this.url.withoutPort = el.protocol + "//" + el.hostname;
    this.url.port = el.port;
    this.url.protocol = el.protocol;
    this.url.hostname = el.hostname;
  
    // var urlParts = window.finesseUrl.split(":");
    // if (urlParts.length > 2) {
    //   window.finesseUrlWithoutPort = urlParts[0] + ":" + urlParts[1];
    // }
  
    console.log('Finesse URL: ' + this.url.full);
    console.log('Finesse URL without Port: ' + this.url.withoutPort);
  
    document.getElementById('tunnel-frame').src = this.url.withoutPort + ":7443/tunnel"
  },

  blah() {

  },

  call() {

  }
};


function emptyAgent() {
  return {
    username: "",
    extension: "",
    state: 'LOGOUT',
    reasonCode: {},
    calls: {},
    recentCalls: [],
    currentTab: tabNames.HOME,
    notReadyReasonCodes: [],
    signOutReasonCodes: [],
    previousLoginFailed: false,
    loggingOut: false,
    loggingIn: false
  };
}

export default Finesse;
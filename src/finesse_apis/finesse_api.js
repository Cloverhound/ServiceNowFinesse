import moment from "moment";
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
  
    let tunnelPort = config.tunnelPort || "7443";
    let tunnelPath = config.tunnelPath || "/tunnel";
    document.getElementById('tunnel-frame').src = this.url.withoutPort + ":" + tunnelPort + tunnelPath;
  },

  saveRecentCalls() {
    localStorage[this.agent.loginId + ".recentCalls"] = JSON.stringify(this.agent.recentCalls);
  },

  reloadRecentCalls() {
    let recents = [];
  
    let rs = localStorage[this.agent.loginId + ".recentCalls"];
    if (!rs) { 
      return recents
    };
  
    let loadedRecents = JSON.parse(rs);
    for(let i = 0; i < loadedRecents.length; i++) {
      let call = loadedRecents[i];
      
      call.startedAt = moment(call.startedAt);
      call.endedAt = moment(call.endedAt);
  
      let startDay = call.startedAt.clone().startOf('day');
      let today = moment().startOf('day');
  
      // Ignore calls older than today.
      if (startDay.isBefore(today)) {
        continue;
      }
  
      recents.push(call);
    }
  
    this.agent.recentCalls = recents;
    this.saveRecentCalls();
    window.rerender(this.agent);
    
    return recents;
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
    loggingIn: false,
    shouldPopConcurrently: false,
    enableManualScreenPop: false
  };
}

export default Finesse;
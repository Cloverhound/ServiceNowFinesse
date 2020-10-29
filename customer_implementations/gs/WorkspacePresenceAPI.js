var WorkspacePresenceAPI = Class.create();
WorkspacePresenceAPI.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	setPresence: function() {
		var agent;
		var presence = 'WAS NOT SET';
		var type = String(this.getParameter('sysparm_type'));
		var userID = String(this.getParameter('sysparm_userID'));
		var presenceSysId = String(this.getParameter('sysparm_presenceSysId'));
		var channelId = String(this.getParameter('sysparm_channelId'));
		try {
			switch(type){
				case "available":
					agent = sn_awa.Agent.get(userID);
					presence = agent.setPresence({
						sys_id: presenceSysId,
						channels: [{
							sys_id: channelId,
							available: true
						}]
					});
					break;
				case "away":
					agent = sn_awa.Agent.get(userID);
					presence = agent.setPresence({
						sys_id: presenceSysId,
						channels: []
					});
					break;
			}
			return JSON.stringify({presence: presence, type: type, userID: userID, presenceSysId: presenceSysId, channelId: channelId });
		} catch (e) {
			return e.message;
		}




	},

	type: 'WorkspacePresenceAPI'
});
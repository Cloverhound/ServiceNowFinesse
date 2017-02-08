let Client = require('ssh2-sftp-client');
let walk = require('walk').walk;

let sftp = new Client();


sftp.connect({
  host: 'uccx1.cloverhound.com',
  port: 22,
  username: '3rdpartygadget',
  password: 'cciecollab'
// }).then(() => {
// 	return sftp.rmdir('/files/snow-finesse', true);
// }).then(() => {
// 	return sftp.mkdir('/files/snow-finesse');
}).then(() => {
	walker = walk('./build');

	walker.on('file', (root, stats, next) => {
		//console.log(root, stats)

		var newRoot = root.replace('./build', '');
		sftp.put(root + '/' + stats.name, '/files/snow-finesse/' + newRoot + '/' + stats.name)
		.catch((err) => {
		  console.log(err, 'catch error');
		});

		next();

	});

	walker.on('directories', (root, stats, next) => {
		for (index in stats) {
			var dir = stats[index];
			var newRoot = root.replace('./build', '');
			//console.log(dir)
			//console.log('/files/snow-finesse/' + newRoot + '/' + dir.name);
			//sftp.rmdir('/files/snow-finesse/' + newRoot + '/' + dir.name);
			sftp.mkdir('/files/snow-finesse/' + newRoot + '/' + dir.name)
			.catch((err) => {

			  //console.log(err, 'Error making dir:', '/files/snow-finesse/' + newRoot + '/' + dir.name);
			});
		}
		next();
	});

	walker.on('end', () => {
		console.log('done');
		setTimeout(() => {
			process.exit();
		}, 2500);
		//process.exit();
	});

  //return sftp.put('./build/index.html', '/files/snow-finesse/index.html');
}).then(() => {
  
  //process.exit();
}).catch((err) => {
  debugger;
  console.log(err, 'catch error');
});
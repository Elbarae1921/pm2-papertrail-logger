
var pmx = require('pmx');
const pm2 = require('pm2');

const winston = require('winston');
require('winston-papertrail').Papertrail;

const PAPERTRAIL_HOST = 'logs.papertrailapp.com';
const PAPERTRAIL_PORT = 40709;

const winstonPapertrail = new winston.transports.Papertrail({
    host: PAPERTRAIL_HOST,
    port: PAPERTRAIL_PORT
})

winstonPapertrail.on('error', function(err) {
    console.log('PM2 Papertrail: failed to initialize winston papertrail transport', err);
});

const logger = winston.createLogger({
    transports: [winstonPapertrail]
});

pmx.initModule({
  widget : {
    logo: 'https://app.keymetrics.io/img/logo/keymetrics-300.png',
    theme: ['#141A1F', '#222222', '#3ff', '#3ff'],
    el: {
      probes  : true,
      actions : true
    },
    block: {
      actions: false,
      issues: true,
      meta: true
    }
  }
}, function(err, conf) {

    const { module_name } = conf;

    pm2.connect(function (err) {
        if (err) return console.log('PM2 Papertrail:', err.stack || err);
        pm2.launchBus(function (err, bus) {
            if (err) return console.log('PM2 Papertrail:', err);

            console.log('PM2 Papertrail: Bus Connected');

            bus.on('log:out', function (log) {
                if (log.process.name !== module_name) {
                    pm2.list(function (err, list) {
                        const pm2Apps = list.map(x => x.name);
                        if (pm2Apps.indexOf(log.process.name) > -1) {
                            // console.log(log.data);
                            logger.info(log.data);
                        }
                    });
                }
            });

            bus.on('log:err', function (log) {
                if (log.process.name !== module_name) {
                    pm2.list(function (err, list) {
                        const pm2Apps = list.map(x => x.name);
                        if (pm2Apps.indexOf(log.process.name) > -1) {
                            // console.log(log.data);
                            logger.error(log.data);
                        }
                    });
                }
            });

            bus.on('reconnect attempt', function () {
                console.log('PM2 Papertrail: Bus reconnecting');
            });
    
            bus.on('close', function () {
                console.log('PM2 Papertrail: Bus closed');
            });
        });
    });
});

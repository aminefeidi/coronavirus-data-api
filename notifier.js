const webpush = require("web-push");
const db = require("./db/index");

let Subscriptions;
let fakeSubs = [];

PUBLIC_VAPID = process.env.PUBLIC_VAPID;
PRIVATE_VAPID = process.env.PRIVATE_VAPID;

webpush.setVapidDetails(
    "https://www.coronalivedata.com/",
    PUBLIC_VAPID,
    PRIVATE_VAPID
);

function init(sub){
    Subscriptions = sub;
}

function add(subscription) {
    return new Promise((resolve, reject) => {
        let sub = new Subscriptions(subscription);
        sub.save(err => reject(err));
        if(process.env.dev) fakeSubs.push(subscription)
        resolve();
    });
}

function send(finalData) {
    let notificationPayload = {
        notification: {
            title: "Corona Tracker App",
            body: "",
            icon: "assets/icons/icon-512x512.png"
        }
    };

    let promises = [];
    Subscriptions.find((err, subs) => {
        if (err) return console.log(err);
        for(subscription of subs){
            if(!subscription.object){
                subscription={object:subscription,subjectId:0};
            }
            let id = Number(subscription.subjectId);
            if(id === 0){
                notificationPayload.notification.body =`Number of confirmed global cases: ${finalData.global.toll}`
            }else{
                notificationPayload.notification.body = `Number of confirmed cases in ${finalData.data[id-1].name}: ${finalData.data[id-1].toll}`
            }
            let sub = subscription.object;
            //console.log(sub)
            promises.push(
                webpush.sendNotification(
                    sub,
                    JSON.stringify(notificationPayload)
                ).catch(err=>console.log(err))
            );
        }
    });
    
    return Promise.all(promises);
}

exports.init = init;
exports.add = add;
exports.send = send;

const webpush = require("web-push");
const mongoose = require("mongoose");

let Subscriptions;

mongoose.connect(
    process.env.DB_STRING,
    { useNewUrlParser: true, useUnifiedTopology: true }
);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
    console.log("connected to DB");
    const subscriptionSchema = new mongoose.Schema({
        object: {
            endpoint: String,
            expirationTime: String,
            keys: {
                p256dh: String,
                auth: String
            }
        },
        subjectId:Number
    });
    Subscriptions = mongoose.model("Subscriptions", subscriptionSchema);
});

let fakeSubs = [];

PUBLIC_VAPID = process.env.PUBLIC_VAPID;
PRIVATE_VAPID = process.env.PRIVATE_VAPID;

webpush.setVapidDetails(
    "https://www.coronalivedata.com/",
    PUBLIC_VAPID,
    PRIVATE_VAPID
);

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

    const promises = [];
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
            console.log(sub)
            promises.push(
                webpush.sendNotification(
                    sub,
                    JSON.stringify(notificationPayload)
                )
            );
        }
    });
    
    return Promise.all(promises);
}

exports.add = add;
exports.send = send;

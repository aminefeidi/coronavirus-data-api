const webpush = require("web-push");
const mongoose = require("mongoose");

let Subscriptions;

mongoose.connect(
    "mongodb+srv://user:private47@cluster0-xuu8p.mongodb.net/test?retryWrites=true&w=majority",
    { useNewUrlParser: true,useUnifiedTopology: true }
);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
    console.log("connected to DB");
    const subscriptionSchema = new mongoose.Schema({
        endpoint: String,
        expirationTime: String,
        keys: {
            p256dh: String,
            auth: String
        }
    });
    Subscriptions = mongoose.model("Subscriptions", subscriptionSchema);
});


PUBLIC_VAPID =
    "BDECb2hz0gSaM5IWufEtrxNXXgEE3iqQ4kZ48KVMoCU2OC7FOOITBSScpmUbBE-Wsg0FYZftdMCye_IF4VKFznw";
PRIVATE_VAPID = "-HSBqsaGhBJulrpvssea9_VDOIOzpxHOcbQqHL1A15Q";

webpush.setVapidDetails("https://www.coronalivedata.com/", PUBLIC_VAPID, PRIVATE_VAPID);

function add(subscription) {
    return new Promise((resolve,reject)=>{
        let sub = new Subscriptions(subscription);
        sub.save(err => reject(err));
        resolve(sub);
    })
}

function send(msg) {
    const notificationPayload = {
        notification: {
            title: "Corona Tracker App",
            body: msg,
            icon: "assets/icons/icon-512x512.png"
        }
    };

    const promises = [];
    Subscriptions.find((err,subs)=>{
        if (err) return console.log(err);
        subs.forEach(subscription => {
            promises.push(
                webpush.sendNotification(
                    subscription,
                    JSON.stringify(notificationPayload)
                )
            );
        });
    })
    return Promise.all(promises);
}

exports.add = add;
exports.send = send;

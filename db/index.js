const mongoose = require("mongoose");
const SubSchema = require("../models/subscription");

let Subscriptions;

function connect(){
    return new Promise((resolve,reject)=>{
        mongoose.connect(
            process.env.DB_STRING,
            { useNewUrlParser: true, useUnifiedTopology: true }
        ).catch(err=>reject(err));
        
        const db = mongoose.connection;
        
        db.on("error", err=>reject(err));
        db.once("open", function() {
            console.log("connected to DB");
            const subscriptionSchema = SubSchema;
            Subscriptions = mongoose.model("Subscriptions", subscriptionSchema);
            resolve(Subscriptions);
        });
    })
}

exports.connect = connect;
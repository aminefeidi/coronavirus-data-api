const http = require("http");

module.exports = async function(ip){
    return new Promise((resolve,reject)=>{
        http.get(
            "http://api.ipstack.com/" +
                ip +
                "?access_key=a191dd5352de08c64c612cd5c401ea5f&format=1",
            resp => {
                let body = "";
    
                resp.on("error",err=>reject(err));

                resp.on("data", chunk => {
                    body += chunk;
                });
    
                resp.on("end", () => {
                    let json;
                    try {
                        json = JSON.parse(body);
                        if(json.success == false) throw new Error("This API Function does not exist.")
                    } catch (error) {
                        console.error("error in user country module");
                        reject(error);
                    }
                    resolve(json)
                });
            }
        );
    })
}
//Connect to DB from Node.js with
//mongodb+srv://ctang127:Bubba0502@cluster0.jfjdwng.mongodb.net/?retryWrites=true&w=majority

const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, '.env') })



const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dataBase = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_DB_COLLECTION;
const portNumber = process.env.PORT || 3000

const app = express()
app.set("views", path.resolve(__dirname, "templates"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(__dirname ));



app.get("/", (request, response) => { 
    response.render("index");
}); 

app.get("/input", (request, response) => {
    let formAction = `"https://cmsc335fall2022finalproject.onrender.com/input"`
    response.render("weightInput", {portNum:formAction});
}); 

app.post("/input", async (request, response) => { /* You implement */ 
    let name = request.body.name;
    let feet = request.body.heightFoot;
    let inches = request.body.heightInch;
    let weight = Number(request.body.weight);
    let background = request.body.background;
    let month = Number(request.body.month);
    let day = Number(request.body.day);
    let year = Number(request.body.year);

    let applicant = {name: name, feet: feet, inch:inches, weight: weight, month: month, day: day, year: year, background: background};
    await insertApplicant(client, databaseAndCollection, applicant);

    response.render("processWeight", {name:name, feet:feet, inch:inches, weight:weight, month: month, day: day, year: year, background:background})
    
});

app.get("/review", (request, response) => {
    let formAction = `"https://cmsc335fall2022finalproject.onrender.com/review"`
    response.render("review", {portNum:formAction});
}); 

app.post("/review", async (request, response) => {
    let name = request.body.name;
    let weights = await lookUpWeight(client, databaseAndCollection, name);
    let result = "";


    if(weights.length > 0){
        result += "<table><tr><th>Date</th><th>Weight</th><th>Body Mass Index</th></tr>"
        for(let i = 0; i < weights.length; i++){
            let month = weights[i].month;
            let day = weights[i].day;
            let year = weights[i].year;
            let weight = weights[i].weight;
            //Convert Pounds to Kilograms
            let weightKilograms = (weight*0.453592);
            let feet = Number(weights[i].feet);
            let inches = Number(weights[i].inch);
            //Convert Feet,Inches to Meters
            let meters = (0.3048*feet)+(0.0254*inches);
            let bmi = await lookupBMI(meters,weightKilograms);
            console.log(`BMI From Inside review: ${bmi}`)
            result+= `<tr><td>${month}/${day}/${year}</td><td>${weight}</td><td>${bmi}</td></tr>`
        }
        result += "</table>";
    } else {
        result += "<h2>Unfortunately There is no Data Under That Name</h2>";
    }
    response.render("processReview", {name:name,data:result})
})







app.get("/time", (request, response) => {
    let formAction = `"https://cmsc335fall2022finalproject.onrender.com/time"`
    response.render("time", {portNum:formAction});
}); 

app.post("/time", async (request, response) => {
    let name = request.body.name;
    let startMonth = request.body.startMonth;
    let startYear = request.body.startYear;
    let endMonth = request.body.endMonth;
    let endYear = request.body.endYear;
    let weights = await lookUpTimeline(client, databaseAndCollection, name,startMonth,startYear,endMonth,endYear);

    let result = "";
    
    if(weights.length !== 0){
        result += "<table><tr><th>Date</th><th>Weight</th><th>Body Mass Index</th></tr>"
        for(let i = 0; i < weights.length; i++){
            let month = weights[i].month;
            let day = weights[i].day;
            let weight = weights[i].weight;
            //Convert Pounds to Kilograms
            let weightKilograms = (weight*0.453592);
            let feet = Number(weights[i].feet);
            let inches = Number(weights[i].inch);
            //Convert Feet,Inches to Meters
            let meters = (0.3048*feet)+(0.0254*inches);
            let bmi = await lookupBMI(meters,weightKilograms);

            result+= `<tr><td>${month}/${day}</td><td>${weight}</td><td>${bmi}</td></tr>`
        }
        result += "</table>";

        response.render("processTime", {name:name,data:result, graph:"Hi Chris"})
    } else {
        result += "<h2>Unfortunately There is no Data Under That Name in That Timeframe</h2>"
        response.render("processTime", {name:name,data:result})
    }   
})








app.get("/removeAll", (request, response) => {
    let formAction = `"https://cmsc335fall2022finalproject.onrender.com/removeAll"`
    response.render("remove", {portNum:formAction});
}); 

app.post("/removeAll", async (request, response) => {
    let number = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .count();
    let applicant = await clearDB(client, databaseAndCollection)
    response.render("processRemove", {data:number})
})











app.listen(portNumber)
console.log(`Web server started and running at http://localhost:${portNumber}`)


const prompt = "Stop to shutdown the server: "
//Terminal Processes
process.stdout.write(prompt);
process.stdin.setEncoding("utf8"); /* encoding */
process.stdin.on('readable', () => {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);  /* exiting */
        } else {
            /* After invalid command, we cannot type anything else */
            console.log(`Invalid command: ${command}`);
        }
    }
    process.stdout.write(prompt);
    process.stdin.resume();
});

const databaseAndCollection = {db: `${dataBase}`, collection:`${collection}`};

const { MongoClient, ServerApiVersion } = require('mongodb');
const { application } = require('express');
const { count } = require('console');

const uri = `mongodb+srv://${userName}:${password}@cluster0.jfjdwng.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })

async function insertApplicant(client, databaseAndCollection, newApplicant) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApplicant);
    console.log(`Weight entry created with id ${result.insertedId}`);
}




async function lookUpWeight(client, databaseAndCollection, name) {
    let filter = {name: name};
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find(filter).sort({month:1,day:1});

   if (result) {
       return (result.toArray());
   } else {
       return (-1);
   }
}



async function lookUpTimeline(client, databaseAndCollection, name, sm, sy, em, ey) {

    let startFilter = {$or:[{year:{$gt:Number(sy)}},{$and:[{year:Number(sy)},{month:{$gte:Number(sm)}}]}]}
    let endFilter = {$or:[{year:{$lt:Number(ey)}},{$and:[{year:Number(ey)},{month:{$lte:Number(em)}}]}]}



    let filter = {$and:[{name:name}, startFilter, endFilter]};
    let result =  await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find(filter).sort({year:1,month:1,day:1});

    return result.toArray()
}






async function clearDB(client, databaseAndCollection) {
    const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
    return result;
}


function lookupBMI(height,weight){
    const options = {
        method: 'GET',
        url: 'https://body-mass-index-bmi-calculator.p.rapidapi.com/metric',
        params: {weight: `${Number(weight)}`, height: `${Number(height)}`},
        headers: {
            'X-RapidAPI-Key': '42e927914fmshcf6e21a30fba80ap1d8483jsn143a2c7edff6',
            'X-RapidAPI-Host': 'body-mass-index-bmi-calculator.p.rapidapi.com'
        }
    };

    return axios.request(options).then(function (response) {
        return(response.data.bmi);
    }).catch(function (error) {
        console.log("error happened");
        return(-1);
    });
}
  

const axios = require('axios');
const express = require("express");
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const { application } = require("express");
const { table, clear } = require("console");
const { off } = require("process");
let server = require('http').Server(app);
var port = process.env.PORT || 8000;
let heroes;
let DBHeroes= [];
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
const uri = `mongodb+srv://${userName}:${password}@cluster0.hsgvlna.mongodb.net/?retryWrites=true&w=majority`;

/*This will set the path for templates so rendering command only needs name of file
sets the render engine for the templates. 
last line just lets me parse forms into JS readable objects.
*/
const publicPath = path.resolve(__dirname, 'templates');
app.set('views', publicPath);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname, 'public')))


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//load as the initial heroes to present on the hero registry page.
async function getHeroes(){
    try {
        const options = {
            method: 'GET',
            url: 'https://superhero-search.p.rapidapi.com/api/heroes',
          headers: {
            'X-RapidAPI-Key': process.env.API_KEY,
            'X-RapidAPI-Host': 'superhero-search.p.rapidapi.com'
          }
        };
        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        console.error(error);
        return error;
    }
}

async function getHero(hero){
    try {
        const options = {
            method: 'GET',
            url: 'https://superhero-search.p.rapidapi.com/api/',
            params:{hero: hero},
          headers: {
            'X-RapidAPI-Key': process.env.API_KEY,
            'X-RapidAPI-Host': 'superhero-search.p.rapidapi.com'
          }
        };
        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        console.error(error);
        return error;
    }
}




async function insertApplicant(newApp) {
    await client.connect();
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApp);
    console.log(`Hero entry created with id ${result.insertedId}`);
    DBHeroes.push(newApp);
}

async function getDBHeroes(filter) {
    await client.connect();
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);
    const result = await cursor.toArray();
    return result;
}

//The first page that will be shown to the user 
app.get('/', (req, res) => {
    res.render('heroregistry', {heroes: heroes, DBHeroes:DBHeroes});
});

app.post('/', (req, res) =>{
    var name = req.body.name;
    Promise.all([getHero(name), getDBHeroes({name: name})])
    .then(values =>
        res.render('heroregistry', {heroes: [values[0]], DBHeroes: values[1]}),
        client.close()
    );
    
});

app.get('/addhero', (req, res) =>{
    res.render('addhero');
});

app.get('/herodetail', (req, res) =>{
    res.render('herodetail', {hero:req.query.hero, isDB:req.query.isDB});
});

app.post('/addhero', (req, res) =>{
    console.log("adding new hero to the list");
    insertApplicant(req.body).then(val => 
        res.redirect("..")
    );
});

//set the input to be utf8 characters 
process.stdin.setEncoding("utf8");

getHeroes().then(res => {
    heroes = res;
});

getDBHeroes({}).then(res =>{
    DBHeroes = res;
    client.close();
});


//Now the app is listening on the specified port
client.connect(err => {
    if(err){ console.error(err); return false;}
    console.log("Attempting to listen");
});

server.listen(port, function() {
    console.log("App is running on port " + port);
});




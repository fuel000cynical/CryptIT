const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://gsoham562:bNKQLjoCDbbLLhJA@maincluster.8pikchg.mongodb.net/?appName=mainCluster";
const bodyParser = require('body-parser');
var session = require('express-session');
const user = require('./user');
const sol = require('./solution.js');
const uuidv4 = require('uuid').v4;
//****End of imports****

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'cbghsdvbcjksdncbgvd',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 10000000 }
}))


const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  run().catch(console.dir);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));
app.use('/assets/' ,express.static('assets'))

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard')
    }else{
        res.render('login');
    }
});

app.post('/login', async (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    }
    else{
        const doc = {
            email : req.body.email,
            password: req.body.password
        };
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find(doc).sort().toArray();
            if(findRes[0]['email'] == doc.email){
                req.session.user = findRes[0]['mid'];
                res.redirect('/dashboard');
            }else{
                console.log(findRes[0]['email'])
            }
            
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
            console.log(doc);
        }
    }
})

app.get('/sign-up', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard')
    }else{
        res.render('signup');
    }
});

app.post('/sign-up', async (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    }else{
        const doc = {
            name : req.body.name,
            email : req.body.email,
            discordId : req.body.discordId,
            password: req.body.password,
            score: 0,
            log: [],
            mid: uuidv4()
        };
        try {
            await client.connect();
            const insertOneResult = await client.db("mainCluster").collection("user").insertOne(doc);
            let ids = insertOneResult.insertedIds;
            console.log(`Inserted a document with id ${ids}`);
            req.session.user = doc.mid;
            res.redirect('/dashboard')
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
            console.log(doc);
        }
        
    }
});

app.get('/dashboard', async (req, res) => {
    if (req.session.user) {
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find({mid: String(req.session.user)}).toArray();
            res.render('dashboard', {name: findRes[0]['name'], email: findRes[0]['email'], discordId: findRes[0]['discordId'], score: findRes[0]['score']});
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
        }
    }else{
        res.redirect('/');
    }
})

app.get('/problems', async (req, res) => {
    if (req.session.user) {
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find({mid: String(req.session.user)}).toArray();
            res.render(`levels/level-${findRes[0]['score']/10}`, {score: findRes[0]['score']})
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
        }
    }else{
        res.redirect('/');
    }
})

app.post('/problems', async (req, res) => {
    if (req.session.user) {
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find({mid: String(req.session.user)}).toArray();
            const solC = await client.db("mainCluster").collection("solution").find({level: findRes[0]['score']/10 }).toArray();
            var doc = findRes[0];
            var a = doc.log;
            if(findRes[0]['score']/10 == 3){
                var ch = [req.body.ans1, req.body.ans2];
                if(ch[0] == solC[0]['solution'][0] && ch[1] == solC[0]['solution'][1]){
                    doc.score += 10;
                    a.push(ch);
                }else{
                    a.push(ch);
                }
            }else if(findRes[0]['score']/10 == 6){
                a.push(req.body.ans);
            }else if(findRes[0]['score']/10 == 16){
                a.push(req.body.ans);
            }else{
                if(req.body.ans == solC[0]['solution']){
                    doc.score += 10;
                    a.push(req.body.ans);
                }else{
                    a.push(req.body.ans);
                }
            }

            const date = new Date();
            doc.timeStamp = date;

            await client.db("mainCluster").collection("user").replaceOne({mid: doc.mid}, doc);

            res.redirect('/problems')
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
        }
    }else{
        res.redirect('/');
    }
})

app.get('/leaderboard', async (req, res) => {
    if (req.session.user) {
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find({mid: String(req.session.user)}).toArray();
            const allUsers = await client.db("mainCluster").collection("user").find({}).sort({score: -1}).toArray();
            allUsers.forEach(doc => {
                doc.mid = null
                doc.discordId = null
                doc.email = null
                doc.password = null
                doc.log = null
            });
            res.render('leaderboard', {allUsers});
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
        }
    }else{
        res.redirect('/');
    }
})

app.get('/19990331', async (req, res) => {
    if (req.session.user) {
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find({mid: String(req.session.user)}).toArray();
            const solC = await client.db("mainCluster").collection("solution").find({level: findRes[0]['score']/10 }).toArray();
            var doc = findRes[0];
            var a = doc.log;
            if(findRes[0]['score']/10 == 6){
                doc.score = 70;
            }

            const date = new Date();
            doc.timeStamp = date;

            await client.db("mainCluster").collection("user").replaceOne({mid: doc.mid}, doc);

            res.redirect('/problems')
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
        }
    }else{
        res.redirect('/');
    }
})

app.get('/levelseventeen', async (req, res) => {
    if (req.session.user) {
        try {
            await client.connect();
            const findRes = await client.db("mainCluster").collection("user").find({mid: String(req.session.user)}).toArray();
            var doc = findRes[0];
            if(findRes[0]['score']/10 == 16){
                doc.score+=10;
            }

            const date = new Date();
            doc.timeStamp = date;

            await client.db("mainCluster").collection("user").replaceOne({mid: doc.mid}, doc);

            res.redirect('/problems')
         } catch(e) {
            console.log(`A MongoBulkWriteException occurred, but there are successfully processed documents.`);
            console.log(e);
        }
    }else{
        res.redirect('/');
    }
})

//********* listening to port ********
app.listen(8000);
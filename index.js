const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5001;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4lo48xa.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

        const usersCollection = client.db("MomentsDB").collection("users");
        const biodatasCollection = client.db("MomentsDB").collection("biodatas");
        const premiumCollection = client.db("MomentsDB").collection("premium");
        const favouriteCollection = client.db("MomentsDB").collection("favourite");
        const invoiceCollection = client.db("MomentsDB").collection("invoice");


        //trying jwt local storage
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token })
        })

        //middle ware to check token verification

        const verifyToken = (req, res, next) => {

            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1]; //to get token without first string
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }
                req.decoded = decoded;
                next();
            })
        }
        //user api triggered from sign up
        app.get('/users', verifyToken, async (req, res) => { //add verification later || verify token worked
            const result = await usersCollection.find().toArray();
            res.send(result);
        })
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {// decoded from jwt
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin }); // set admin true
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };//for checking user exist or not
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const setAdmin = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, setAdmin);
            res.send(result);
        })
        //Biodata api used in user dashboard
        app.get('/biodatas', async (req, res) => { //add verification later
            const result = await biodatasCollection.find().toArray();
            res.send(result);
        })
        app.get('/biodatas/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await biodatasCollection.findOne(query);
            res.send(result);
        })
        app.post('/biodatas', async (req, res) => {
            const bioDatas = req.body;
            const result = await biodatasCollection.insertOne(bioDatas);
            res.send(result);
        })
        //trigger when favourite is set
        app.patch('/biodatas/favourite/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const setFavourite = {
                $set: {
                    isFavourite: 'true'
                }
            }
            const result = await biodatasCollection.updateOne(filter, setFavourite);
            res.send(result);
        })
        // update
        app.put('/biodatas/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedBiodata = req.body;
            const biodatas = {
                $set: {
                    biodataID: updatedBiodata.biodataID,
                    biodataType: updatedBiodata.biodataType,
                    contactEmail: updatedBiodata.contactEmail,
                    dateOfBirth: updatedBiodata.dateOfBirth,
                    expectedPartnerAge: updatedBiodata.expectedPartnerAge,
                    expectedPartnerHeight: updatedBiodata.expectedPartnerHeight,
                    expectedPartnerWeight: updatedBiodata.expectedPartnerWeight,
                    fathersName: updatedBiodata.fathersName,
                    mobileNumber: updatedBiodata.mobileNumber,
                    mothersName: updatedBiodata.mothersName,
                    occupation: updatedBiodata.occupation,
                    permanentDivision: updatedBiodata.permanentDivision,
                    presentDivision: updatedBiodata.presentDivision,
                    profileImg: updatedBiodata.profileImg,
                    race: updatedBiodata.race,
                    yourAge: updatedBiodata.yourAge,
                    yourHeight: updatedBiodata.yourHeight,
                    yourName: updatedBiodata.yourName,
                    yourWeight: updatedBiodata.yourWeight,
                }
            }
            const result = await biodatasCollection.updateOne(filter, biodatas, options)
            res.send(result);
        })
        app.delete('/biodatas/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await biodatasCollection.deleteOne(query);
            res.send(result);
        })


        //premium user related api
        app.get('/premium', async (req, res) => {
            const result = await premiumCollection.find().toArray();
            res.send(result);
        })
        app.post('/premium', async (req, res) => {
            const premiumReq = req.body;
            const result = await premiumCollection.insertOne(premiumReq);
            res.send(result);
        })
        app.patch('/premium/request/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const setPremium = {
                $set: {
                    status: 'premium'
                }
            }
            const result = await premiumCollection.updateOne(filter, setPremium);
            res.send(result);
        })

        //Selected favourite related api 
        app.get('/favourite', async (req, res) => {
            const result = await favouriteCollection.find().toArray();
            res.send(result);
        })
        app.post('/favourite', async (req, res) => {
            const favouriteUser = req.body;
            const result = await favouriteCollection.insertOne(favouriteUser);
            res.send(result);
        })
        app.delete('/favourite/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await favouriteCollection.deleteOne(query);
            res.send(result);
        })



        //trying stripe
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount sent from client')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        //invoice api
        app.get('/invoice', async (req, res) => {
            const result = await invoiceCollection.find().toArray();
            res.send(result);
        })
        app.get('/invoice/premium/:email', async (req, res) => {
            const email = req.params.email;
            // if (email !== req.decoded.email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email };
            const user = await invoiceCollection.findOne(query);
            let premium = false;
            if (user) {
                premium = user?.order === 'granted';
            }
            res.send({ premium }); // set admin true
        })
        app.post('/invoice', async (req, res) => {
            const invoice = req.body;
            const result = await invoiceCollection.insertOne(invoice);
            res.send(result);
        })
        app.get('/invoice/request/:email', async (req, res) => { // admin verify
            const email = req.params.email;
            // if (email !== req.decoded.email) {//decoded is set in jwt verify token and email is set in client side auth provider unSubscribe || my token my email check
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let premium = false;
            if (user) {
                premium = user?.order === 'granted';
            }
            res.send({ premium });
        })

      
        //check admin status
        app.get('/admin-stats', async (req, res) => {
            const users = await usersCollection.estimatedDocumentCount();
            const biodatas = await biodatasCollection.estimatedDocumentCount();
            const premium = await premiumCollection.estimatedDocumentCount();
            const favourite = await favouriteCollection.estimatedDocumentCount();
            const invoice = await invoiceCollection.estimatedDocumentCount();

            // this is not the best way
            const invoices = await invoiceCollection.find().toArray();
            const profit = invoices.reduce((total, profit) => total + profit.price, 0);


            res.send({
                users,
                biodatas,
                premium,
                favourite,
                invoice,
                profit
            })
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('moments matrimony is running')
})

app.listen(port, () => {
    console.log(`moments matrimony is running at port ${port}`);
})
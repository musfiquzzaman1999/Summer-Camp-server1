const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q5q1wsb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const classCollection = client.db("summerCamp").collection("classes");


    app.get('/classes', async(req, res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

    app.get('/classes/:email', (req, res) => {
        const email = req.params.email;
        
        
    
        classCollection.find({ instructorEmail: email }).toArray().then((classes) => {
          res.send(classes);
        });
      });

    app.get('/popular-classes', async (req, res) => {
      try {
        const popularClasses = await classCollection
          .find()
          .sort({ students: -1 })
          .limit(6)
          .toArray();

        res.json(popularClasses);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    app.get('/instructors', async (req, res) => {
        try {
          const popularInstructors = await classCollection
            .aggregate([
              {
                $group: {
                  _id: "$instructorEmail",
                  totalStudents: { $sum: "$students" },
                  instructor: { $first: "$$ROOT" },
                },
              },
              { $sort: { totalStudents: -1 } },
              
              {
                $project: {
                  _id: 0,
                  name: "$instructor.instructorName",
                  email: "$instructor.instructorEmail",
                  totalStudents: 1,
                  thumbnail: "$instructor.instructorPicture",
                },
              },
            ])
            .toArray();
      
          res.json(popularInstructors);
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

    app.get('/popular-instructors', async (req, res) => {
        try {
          const popularInstructors = await classCollection
            .aggregate([
              {
                $group: {
                  _id: "$instructorEmail",
                  totalStudents: { $sum: "$students" },
                  instructor: { $first: "$$ROOT" },
                },
              },
              { $sort: { totalStudents: -1 } },
              { $limit: 6 },
              {
                $project: {
                  _id: 0,
                  name: "$instructor.instructorName",
                  email: "$instructor.instructorEmail",
                  totalStudents: 1,
                  thumbnail: "$instructor.instructorPicture",
                },
              },
            ])
            .toArray();
      
          res.json(popularInstructors);
        } catch (error) {
          console.error('Error:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

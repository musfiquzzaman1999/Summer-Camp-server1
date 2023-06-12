const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const classCollection = client.db('summerCamp').collection('classes');
    const usersCollection = client.db('summerCamp').collection('users');
    const cartCollection = client.db("summerCamp").collection("carts");


    app.get('/carts', async(req, res) =>{
      const email =req.query.email;
      // console.log(email)
      if(!email){
       return res.send([]);
      }
      const query ={email:email}
      const result = await cartCollection.find(query).toArray();
      res.send(result);
  })
 
    app.post('/carts', async(req, res) =>{
      const item =req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
  })


  app.delete('/carts/:id', async(req, res) =>{
    const id =req.params.id;
    const query ={_id: new ObjectId(id)}
    const result = await cartCollection.deleteOne(query);
    res.send(result);
})


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    app.get('/classes', async (req, res) => {
      try {
        const result = await classCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    app.post('/classes', async (req, res) => {
      try {
        const classData = req.body;
    
        // Add additional logic to set the status field to "pending"
        classData.status = 'pending';
        classData.totalStudents = 0;
        classData.feedback = '';
    
        const result = await classCollection.insertOne(classData);
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/instructor/classes/:instructorEmail', async (req, res) => {
      try {
        const { instructorEmail } = req.params;
        const instructorClasses = await classCollection.find({ instructorEmail }).toArray();
        res.json(instructorClasses);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    app.patch('/classes/:classId', async (req, res) => {
      try {
        const { classId } = req.params;
        const { status, feedback } = req.body;
      
        const updatedClass = await classCollection.findOneAndUpdate(
          { _id: new ObjectId(classId) },
          { $set: { status, feedback } },
          { returnOriginal: false }
        );
      
        res.json(updatedClass.value);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });



    app.get('/classes/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const classes = await classCollection.find({ instructorEmail: email }).toArray();
        res.send(classes);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/popular-classes', async (req, res) => {
      try {
        const popularClasses = await classCollection.find().sort({ students: -1 }).limit(6).toArray();
        res.json(popularClasses);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/instructors', async (req, res) => {
      try {
        const popularInstructors = await classCollection.aggregate([
          {
            $group: {
              _id: '$instructorEmail',
              totalStudents: { $sum: '$students' },
              instructor: { $first: '$$ROOT' },
            },
          },
          { $sort: { totalStudents: -1 } },
          {
            $project: {
              _id: 0,
              name: '$instructor.instructorName',
              email: '$instructor.instructorEmail',
              totalStudents: 1,
              thumbnail: '$instructor.instructorPicture',
            },
          },
        ]).toArray();

        res.json(popularInstructors);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/popular-instructors', async (req, res) => {
      try {
        const popularInstructors = await classCollection.aggregate([
          {
            $group: {
              _id: '$instructorEmail',
              totalStudents: { $sum: '$students' },
              instructor: { $first: '$$ROOT' },
            },
          },
          { $sort: { totalStudents: -1 } },
          { $limit: 6 },
          {
            $project: {
              _id: 0,
              name: '$instructor.instructorName',
              email: '$instructor.instructorEmail',
              totalStudents: 1,
              thumbnail: '$instructor.instructorPicture',
            },
          },
        ]).toArray();

        res.json(popularInstructors);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/users',verifyJWT,  async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);

        if (existingUser) {
          return res.send({ message: 'User already exists' });
        }

        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'Forbidden message' });
      }
      next();
    };

    app.get('/users/admin/:email', verifyJWT,verifyAdmin, async (req, res) => {
      try {
        const email = req.params.email;

        if (req.decoded.email !== email) {
          return res.send({ admin: false });
        }

        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === 'admin' };
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.patch('/users/admin/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'admin',
          },
        };

        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });




    app.patch('/classes/:classId', async (req, res) => {
      const { classId } = req.params;
      const { status, feedback } = req.body;
    
      try {
        const classItem = await Class.findById(classId);
        if (!classItem) {
          return res.status(404).json({ error: 'Class not found' });
        }
    
        if (status) {
          classItem.status = status;
        }
        if (feedback) {
          classItem.feedback = feedback;
        }
    
        await classItem.save();
    
        res.json(classItem);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'Forbidden message' });
      }
      next();
    };


    app.get('/users/instructor/:email', verifyJWT,verifyInstructor, async (req, res) => {
      try {
        const email = req.params.email;

        if (req.decoded.email !== email) {
          return res.send({ instructor: false });
        }

        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const result = { instructor: user?.role === 'instructor' };
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
   


    app.put('/classes/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { name, description, students, thumbnail } = req.body;
    
        const updatedClass = await classCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { name, description, students, thumbnail } },
          { returnOriginal: false }
        );
    
        if (!updatedClass.value) {
          return res.status(404).json({ error: 'Class not found' });
        }
    
        res.json(updatedClass.value);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    app.patch('/users/instructor/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'instructor',
          },
        };

        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });






    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
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

// import express
const express = require('express');

// Importar funciones de db y ObjectId
const { connectToDb, getDb } = require('./db');
const { ObjectId } = require('mongodb');

//create a new express app
const app = express();

//create a new port
const PORT = process.env.PORT || 3000;


// middleware to parse the body of the request JSON
app.use(express.json());

// GET /users
app.get('/users', async (req, res) => {
    try {
        const users = await getDb().collection('users').find().toArray();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener los usuarios' });
    }
});

// GET /users/:id
app.get('/users/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        const user = await getDb().collection('users').findOne({ _id: new ObjectId(req.params.id) });
        const id = new ObjectId(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
});

// POST /users
// Crear un nuevo usuario
// Body JSON esperado: { name: string, email: string }

app.post('/users', async (req, res) => {
    const { name, email } = req.body || {};

    if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // super basico sin validar email unico ni formato
    const newUser = {
        name,
        email,
        createdAt: new Date().toISOString()
    }
    try {
        const result = await getDb().collection('users').insertOne(newUser);
        res.status(201).json({...newUser, _id: result.insertedId});
    } catch (err) {
        if ( err.code === 11000) {
            return res.status(400).json({ error: 'El email ya está en uso' });
        }
        res.status(500).json({ message: 'Error al crear el usuario' });
    }

});

app.put('/users/:id', async (req, res) => {
    const { name, email } = req.body || {};

    if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    try {
        const id = new ObjectId(req.params.id);
        const updateDoc = {
            $set: {
            name,
            email,
            }
        };
        const result = await getDb().collection('users').updateOne({ _id: id }, { $set: updateDoc });
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        const updatedUser = await getDb().collection('users').findOne({ _id: id });
        res.json(updatedUser);

    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
});


/**
 * DELETE /users/:id
 * Elimina un usuario por id
 */
app.delete('/users/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        const id = new ObjectId(req.params.id);
        const result = await getDb().collection('users').deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar el usuario' });
    }
});


//start the server
connectToDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server esta corriendo en el puerto ${PORT}`);
    });
}).catch(err => {
    console.error('Error al conectar con MongoDB:', err);
    process.exit(1);
});
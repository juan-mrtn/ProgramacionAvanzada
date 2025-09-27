// import express
const express = require('express');

//create a new express app
const app = express();

//create a new port
const PORT = process.env.PORT || 3000;


// middleware to parse the body of the request JSON
app.use(express.json());

//  base de datos en memoria (se pierde cuando se reinicia el servidor) JSON
let users = [];
let nextId = 1

// GET /users
app.get('/users', (req, res) => {
    res.json(users);
});

// GET /users/:id
app.get('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const user = users.find( u => u.id === id)
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
});

// POST /users
// Crear un nuevo usuario
// Body JSON esperado: { name: string, email: string }

app.post('/users', (req, res) => {
    const { name, email } = req.body || {};

    if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // super basico sin validar email unico ni formato
    const newUser = {
        id: nextId++,
        name,
        email,
        createdAt: new Date().toISOString()
    }

    users.push(newUser);
    res.status(201).json(newUser);
});

/**
 * DELETE /users/:id
 * Elimina un usuario por id
 */
app.delete('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const index = users.findIndex(u => u.id === id);
  
    if (index === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
  
    users.splice(index, 1);
    // Podés devolver 204 sin body; acá devuelvo 204
    return res.status(204).send();
  });




//start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
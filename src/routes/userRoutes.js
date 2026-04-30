const express = require('express');
const { 
  registrarUsuario, 
  loginUsuario, 
  getUsuarios,
  updateUsuario,
  deleteUsuario
} = require('../controllers/userController');

const router = express.Router();


router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);


router.get('/', getUsuarios);
router.put('/:id', updateUsuario);
router.delete('/:id', deleteUsuario);

module.exports = router;
const express = require('express');
const router = express.Router();
const { recognizeFace, addPerson, listPersons, resetSystem, registerPointByFace, upload } = require('../../controllers/faceController');
const { faceRecognitionLimiter } = require('../middlewares/rateLimitMiddleware');

// Rota para reconhecimento facial - COM RATE LIMITING
router.post('/face-recognition', faceRecognitionLimiter, upload.single('image'), recognizeFace);
// Alias para compatibilidade com apps que usam /recognize - COM RATE LIMITING
router.post('/recognize', faceRecognitionLimiter, upload.single('image'), recognizeFace);

// Rota para adicionar nova pessoa
router.post('/add-person', upload.single('image'), addPerson);

// Rota para registrar ponto via reconhecimento facial
router.post('/register-point', upload.single('image'), registerPointByFace);

// Rota para listar pessoas cadastradas
router.get('/list-persons', listPersons);

// Rota para resetar sistema
router.post('/reset-system', resetSystem);

// Rotas de compatibilidade com o app (mantendo as URLs antigas)
router.post('/face-recognition/', upload.single('image'), recognizeFace);
router.post('/add-person/', upload.single('image'), addPerson);
router.post('/register-point/', upload.single('image'), registerPointByFace);
router.get('/list-persons/', listPersons);
router.post('/reset-system/', resetSystem);

module.exports = router; 
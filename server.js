/**
 * Server.js
 * @author : DiganmeGiovanni | https://twitter.com/DiganmeGiovanni
 * @Created on: 25 Oct, 2014
 */


/* Librerias necesarias para la aplicaci�n */
var bodyParser  = require('body-parser');
var express     = require('express');
var app         = express();
var http        = require('http').Server(app);
var io          = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var userDAO     = require('./dao/UserDAO').UserDAO;
var messageDAO  = require('./dao/MessageDAO').MessageDAO;
// Para acceder a los parametros de las peticiones POST
app.use(bodyParser());

/* Mongodb config */
var mdbconf = {
  host: 'localhost',
  port: '27017',
  db: 'chatSS'
};

/* Get a mongodb connection and start application */
MongoClient.connect('mongodb://'+mdbconf.host+':'+mdbconf.port+'/'+mdbconf.db, function (err, db) {

  if (err) return new Error('Connection to mongodb unsuccessful');
  
  var usersDAO = new userDAO(db); // Initialize userDAO
  var messagesDAO = new messageDAO(db);
  var onlineUsers = [];

 
  
  /** *** *** ***
 * Configuramos la aplicaci�n:
 */
  app.use(bodyParser()); // Para acceder a 'req.body' en peticiones POST

/** *** *** ***
 *  Configuramos el sistema de ruteo para las peticiones web:
 */
  
  app.get('/signup', function (req, res) {
    res.sendFile( __dirname + '/chat/views/signup.html');
  });
  
  app.post('/signup', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var email    = req.body.email;
     console.log(userDAO);
    usersDAO.addUser(username, password, email, function (err, user) {
      if (err) {
        res.send({ 'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user });
      }
    });
  });

  app.post('/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
   
    usersDAO.validateLogin(username, password, function (err, user) {
      if (err) {
        res.send({'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user});
      }
    });
  });
  
  /** css and js request */
  app.get('/css/foundation.min.css', function (req, res) {
    res.sendFile(__dirname + '/chat/views/css/foundation.min.css');
  });

  app.get('/css/normalize.css', function (req, res) {
    res.sendFile(__dirname + '/chat/views/css/normalize.css');
  });
  
  app.get('/js/foundation.min.js', function (req, res) {
    res.sendFile(__dirname + '/chat/views/js/foundation.min.js');
  });
  
  app.get('/js/foundation.offcanvas.js', function (req, res) {
    res.sendFile(__dirname + '/chat/views/js/foundation.offcanvas.js');
  });
  app.get('/css/chat.css', function (req, res) {
    res.sendFile(__dirname + '/chat/views/css/chat.css');
  })

  app.get('/js/chat.js', function (req, res) {
    res.sendFile(__dirname + '/chat/views/js/chat.js');
  });
  
  app.get('/img/nathan.png', function (req, res) {
    res.sendFile(__dirname + '/views/img/nathan.png');
  })

  app.get('/js/moment-with-locales.min.js', function (req, res) {
    res.sendFile(__dirname + '/chat/views/js/moment-with-locales.min.js')
  })

  /** *** *** */
  
  app.get('*', function(req, res) {
    res.sendFile( __dirname + '/chat/views/chat.html');
  });


  /** *** *** ***
   *  Configuramos Socket.IO para estar a la escucha de
   *  nuevas conexiones. 
   */
  io.on('connection', function(socket) {
    
    console.log('New user connected');
    
    /**
     * Cada nuevo cliente solicita con este evento la lista
     * de usuarios conectados en el momento.
     */
    socket.on('all online users', function () {
      socket.emit('all online users', onlineUsers);
    });
    
    /**
     * Cada nuevo socket debera estar a la escucha
     * del evento 'chat message', el cual se activa
     * cada vez que un usuario envia un mensaje.
     * 
     * @param  msg : Los datos enviados desde el cliente a 
     *               trav�s del socket.
     */
 
    socket.on('chat message', function(msg) {
      messagesDAO.addMessage(msg.username, Date.now(), msg.message, function (err, nmsg) {
        io.emit('chat message', msg);
      });
    });
    /**
     * Mostramos en consola cada vez que un usuario
     * se desconecte del sistema.
     */
    socket.on('disconnect', function() {
      onlineUsers.splice(onlineUsers.indexOf(socket.user), 1);
      io.emit('remove user', socket.user);
      console.log('User disconnected');
    });
    
     /**
     * Cada nuevo cliente solicita mediante este evento
     * los ultimos mensajes registrados en el historial
     */
    socket.on('latest messages', function () {
      messagesDAO.getLatest(50, function (err, messages) {
        if (err) console.log('Error getting messages from history');
        socket.emit('latest messages', messages);
      });
    });
    /**
     * Cuando un cliente se conecta, emite este evento
     * para informar al resto de usuarios que se ha conectado.
     * @param  {[type]} nuser El nuevo usuarios
     */
    socket.on('new user', function (nuser) {
      socket.user = nuser;
      onlineUsers.push(nuser);
      io.emit('new user', nuser);
    });
    
  });


  /**
   * Iniciamos la aplicaci�n en el puerto 3000
   */
  http.listen(120, function() {
    console.log('listening on *:120');
  });
});
#!/bin/env node
var jsonServer = require('json-server');
var express = require('express');
var bodyParser = require('body-parser');
var server = jsonServer.create();
var multer  =   require('multer');
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/images');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now());
  }
});
server.use(bodyParser.json()); // for parsing application/json
server.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

var upload = multer({ storage : storage}).single('userPhoto');

server.use(express.static(__dirname + '/public/images'));

server.use(jsonServer.defaults());

var db  = require('./db.json');
var router = jsonServer.router(db);

console.log('PORT: ' +process.env.OPENSHIFT_NODEJS_PORT);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';


server.post('/manifestacoes/anexo',function(req, res, next){
	res.send('Recebendo arquivo');
});

server.post('/autenticar',function(req,res,next){
  var database = router.db;
  var email =  req.body.username;
  var senha = req.body.password;
  var usuario = database('usuarios').where({email:email, senha:senha});
  var resposta = {
    success:false
  };

  if(usuario[0]){
    usuario[0].success = true;
    res.send(JSON.stringify(usuario[0]));
    return;

  }else{
    res.send(JSON.stringify(resposta));
  }
  
});

server.post('/recuperarsenha', function (req, res, next){
  res.send(JSON.stringify('Enviado email para recuperar senha.'));
});

server.post('/anonimo', function (req, res, next){
  upload(req,res,function(err) {
    var database = router.db;
    var usuarios = database('usuarios').where({ device:req.body.device });
      if(usuarios.length >= 1){
        
        var usuario = {
          id: usuarios[0].id,
          nome: usuario[0].nome,
          device: usuarios[0].device,
          msg:'usuario ja existe'
        };
        return res.end(JSON.stringify(usuario));

      }else{
        var usuario = {
          id: database('usuarios').size() + 1,
          nome: 'Anônimo',
          device: req.body.device
        };

        database('usuarios').push(usuario);
        res.end(JSON.stringify(usuario));
      }
  });
});

server.post('/facebook', function (req, res, next) {
  upload(req,res,function(err) {
    var database = router.db;
    var usuarios = database('usuarios').where({ idfacebook:req.body.idfacebook });
    
     if(usuarios.length >= 1){
       var usuario = {
          id: usuarios[0].id,
          nome: usuarios[0].nome,
          email: usuarios[0].email,
          idfacebook: usuarios[0].idfacebook,
          msg:'usuario ja existe'
        };
        return res.end(JSON.stringify(usuario));
      }else{
        var usuario = {
          id: database('usuarios').size() + 1,
          nome: req.body.nome,
          email: req.body.email,
          idfacebook: req.body.idfacebook
        };

        database('usuarios').push(usuario);
        res.end(JSON.stringify(usuario));
      }

  });
});

server.post('/usuarios', function (req, res, next) {
  upload(req,res,function(err) {
    var database = router.db,
        usuarios;
    if(req.body.device){
      usuarios = database('usuarios').where({ device:req.body.device }); 
      //res.end('device');
    }
    if(req.body.facebookId){
      usuarios = database('usuarios').where({ idfacebook:req.body.facebookId });
      //res.end('facebookid');
    }

    if(req.body.email){
      usuarios = database('usuarios').where({ email:req.body.email });
      //res.end('email');
    }

    if(usuarios.length >= 1){
      return res.end(JSON.stringify(usuarios[0]));
    }else{
      var usuario = {
        id: database('usuarios').size() + 1,
        idUsuario:database('usuarios').size() + 1,
        relacionamento: req.body.tipoRelacionamento,
        uf: req.body.uf,
        nome: req.body.nome,
        email: req.body.email,
        senha: req.body.senha,
        device: req.body.device,
        idfacebook: req.body.facebookId
      };

      database('usuarios').push(usuario);
      res.end(JSON.stringify(usuario));
    }
    
  });
});

server.post('/photo',function(req,res){

  var database = router.db;
  console.log('ABRE');
    upload(req,res,function(err) {

    	var file = res.req.file;

        if(err) {

            var objErr = {
              message:'Erro ao enviar arquivo.'
            };

            return res.end(JSON.stringify(objErr));
        }

      var manifestacao = database('manifestacoes').where({ id: parseInt(req.body.id) });

      if(!manifestacao){
        return 'ERROR';
      }

      if(manifestacao[0].qtdEvidencias === null){
        manifestacao[0].qtdEvidencias = [];
      }
     
    //  console.log(req.body);
      //console.log(manifestacao[0]);
      console.log(manifestacao[0].qtdEvidencias);

      if(typeof(manifestacao[0].qtdEvidencias) === 'number'){
          manifestacao[0].qtdEvidencias++;
      }else if(typeof(manifestacao[0].qtdEvidencias) === 'string'){
        manifestacao[0].qtdEvidencias = parseInt(typeof(manifestacao[0].qtdEvidencias));
        manifestacao[0].qtdEvidencias++;
      }      

      var evidencia = {
              id:database('evidencias').size() + 1,
              idManifestacao:req.body.id,
              caminho: 'http://minhaurl.rhcloud.com' + file.path.replace('public',''),
              tamanho:file.size,
              nome:file.originalname
            };

      database('evidencias').push(evidencia);

        var obj ={
          manifestacaoId:req.body.id,
          originalname: file.originalname,
          path: file.path.replace('public',''),
          size: file.size
        };

        res.end(JSON.stringify(obj));
       
    });
});


server.use(router);
 
server.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", server_port " + server_port );
});


